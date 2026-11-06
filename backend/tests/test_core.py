"""B's contract tests. Fake A interfaces are explicit; no CRUD integration claim."""

import os
import sys
import unittest
from copy import deepcopy
from types import ModuleType
from unittest.mock import Mock, patch

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

from backend import db
from backend.errors import ApiError
from backend.core import routes_chat, routes_rooms, seed_loader
from backend.core.availability import check_meetup_slot, parse_at, room_status, today_schedule
from backend.core.firestore_loader import normalize_classrooms
from backend.core.meetup_reader import list_open_meetups


def make_meetup(room_id="row_303", start="15:00", end="17:00", status="open", meetup_id="demo-m1"):
    return {
        "id": meetup_id, "roomId": room_id, "title": "카공 모여라", "category": "study",
        "description": "테스트 모임", "startAt": f"2026-11-06T{start}:00+09:00",
        "endAt": f"2026-11-06T{end}:00+09:00", "maxMembers": 4,
        "hostId": "u-demo-host", "hostNickname": "민지", "status": status,
        "members": [{"userId": "u-demo-host", "nickname": "민지",
                     "joinedAt": "2026-11-06T14:58:00+09:00"}],
        "createdAt": "2026-11-06T14:58:00+09:00",
    }


def fixture_documents():
    def row(room_no, slots, day="금"):
        return {"buildingNo": 8, "buildingName": "공과대학", "roomNo": room_no,
                "day": day, "slots": [{"start": start, "end": end} for start, end in slots]}
    return [
        ("row_301", row(301, [("13:00", "14:15"), ("17:00", "18:15")])),
        ("row_302", row(302, [("14:30", "15:50")])),
        ("row_303", row(303, [("09:00", "10:15")])),
        ("row_304", row(304, [("11:00", "12:15")])),
    ]


class CoreTests(unittest.TestCase):
    def setUp(self):
        self.campus = normalize_classrooms(fixture_documents())
        rooms = {room["id"]: room for room in self.campus["rooms"]}
        buildings = {building["id"]: building for building in self.campus["buildings"]}
        data_patch = patch.object(seed_loader, "_data", return_value=(self.campus, rooms, buildings))
        data_patch.start()
        self.addCleanup(data_patch.stop)
        self.repo = ModuleType("backend.meetup_repo")
        self.repo.list_open = Mock(return_value=[])
        modules_patch = patch.dict(sys.modules, {"backend.meetup_repo": self.repo})
        modules_patch.start()
        self.addCleanup(modules_patch.stop)
        self.app = FastAPI()

        @self.app.exception_handler(ApiError)
        def api_error(request, error):
            return JSONResponse(status_code=error.status, content={"error": {
                "code": error.code, "message": error.message}})

        @self.app.exception_handler(RequestValidationError)
        def validation_error(request, error):
            return JSONResponse(status_code=400, content={"error": {
                "code": "VALIDATION_ERROR", "message": "검색 조건을 확인해 주세요."}})

        self.app.include_router(routes_rooms.router)
        self.app.include_router(routes_chat.router)
        self.client = self.enterContext(TestClient(self.app))

    def state(self, room_id, at="15:10", meetups=None, date="2026-11-06"):
        room = seed_loader.get_room(room_id)
        return room_status(room, seed_loader.get_building(room["buildingId"]),
                           parse_at(f"{date}T{at}:00+09:00"), meetups or [])

    def slot(self, room_id, start, end, meetups=None):
        return check_meetup_slot(room_id, f"2026-11-06T{start}:00+09:00",
                                 f"2026-11-06T{end}:00+09:00", meetups or [])

    def assert_reason(self, value):
        self.assertIsInstance(value, str)
        self.assertTrue(value.strip())

    def test_class_end(self):
        state = self.state("row_302", "15:50")
        self.assertEqual((state["status"], state["freeMinutes"], state["freeUntil"], state["classEndsAt"]),
                         ("empty", 370, "2026-11-06T22:00:00+09:00", None))

    def test_hours(self):
        for instant, status, minutes, until in [
            ("08:59", "closed", 0, None), ("09:00", "empty", 120, "11:00"),
            ("21:59", "empty", 1, "22:00"), ("22:00", "closed", 0, None),
        ]:
            with self.subTest(at=instant):
                state = self.state("row_304", instant)
                expected_until = f"2026-11-06T{until}:00+09:00" if until else None
                self.assertEqual((state["status"], state["freeMinutes"], state["freeUntil"]),
                                 (status, minutes, expected_until))
                if status == "closed":
                    for field in ("classEndsAt", "currentTitle", "activeMeetupId"):
                        self.assertIsNone(state[field])

    def test_weekend(self):
        state = self.state("row_301", date="2026-11-07")
        self.assertEqual((state["status"], state["freeMinutes"]), ("empty", 410))
        self.assertEqual(state["freeUntil"], "2026-11-07T22:00:00+09:00")
        self.assertEqual(today_schedule(seed_loader.get_room("row_301"), parse_at("2026-11-07T15:10")), [])
        # Real source data has Saturday classes: never assume all weekends are empty.
        room = seed_loader.get_room("row_301")
        room["schedule"] = [{"dayOfWeek": 6, "startTime": "15:00", "endTime": "16:00", "title": "수업"}]
        self.assertEqual(room_status(room, seed_loader.get_building("8"),
                                     parse_at("2026-11-07T15:10"), [])["status"], "class")

    def test_class_overlap_1m(self):
        self.assert_reason(self.slot("row_301", "14:14", "14:29"))

    def test_slot_after_class(self):
        self.assertIsNone(self.slot("row_301", "14:15", "14:30"))

    def test_slot_before_class(self):
        self.assertIsNone(self.slot("row_301", "16:45", "17:00"))

    def test_all_open_meetups(self):
        meetups = [make_meetup("row_304", "14:00", "15:00", meetup_id="m1"),
                   make_meetup("row_304", "16:00", "17:00", meetup_id="m2")]
        self.assert_reason(self.slot("row_304", "16:30", "17:30", meetups))

    def test_touching_open(self):
        meetups = [make_meetup("row_304", "14:00", "15:00", meetup_id="m1"),
                   make_meetup("row_304", "16:00", "17:00", meetup_id="m2")]
        self.assertIsNone(self.slot("row_304", "15:00", "16:00", meetups))

    def test_cancelled(self):
        meetups = [make_meetup("row_304", "15:00", "16:00", status="cancelled")]
        self.assertEqual(self.state("row_304", meetups=meetups)["status"], "empty")
        self.assertIsNone(self.slot("row_304", "15:10", "15:40", meetups))

    def test_demo_states(self):
        meetups = [make_meetup()]
        for room_id, expected in {
            "row_301": ("empty", 110, "17:00", None),
            "row_302": ("class", 0, None, None),
            "row_303": ("meetup", 410, "22:00", "demo-m1"),
            "row_304": ("empty", 410, "22:00", None),
        }.items():
            state = self.state(room_id, meetups=meetups)
            until = state["freeUntil"][11:16] if state["freeUntil"] else None
            self.assertEqual((state["status"], state["freeMinutes"], until, state["activeMeetupId"]), expected)
        self.assertEqual(self.state("row_302")["classEndsAt"], "2026-11-06T15:50:00+09:00")

    def test_http_search_summary_and_detail(self):
        self.repo.list_open.return_value = [make_meetup()]
        query = {"buildingId": "8", "floor": 3, "status": "empty", "minFreeMinutes": 60,
                 "at": "2026-11-06T06:10:59.900Z"}
        response = self.client.get("/api/rooms", params=query)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["at"], "2026-11-06T15:10:00+09:00")
        self.assertEqual([r["id"] for r in response.json()["rooms"]], ["row_301", "row_304"])
        summary = self.client.get("/api/buildings", params={"at": query["at"]}).json()["buildings"][0]
        self.assertEqual((summary["totalCount"], summary["emptyCount"], summary["meetupCount"]), (4, 3, 1))
        detail = self.client.get("/api/rooms/row_303", params={"at": query["at"]}).json()["room"]
        self.assertEqual(detail["todaySchedule"][0]["startAt"], "2026-11-06T09:00:00+09:00")
        self.assertEqual(detail["meetups"][0]["memberCount"], 1)
        self.assertFalse(detail["meetups"][0]["isFull"])
        self.assertEqual(detail["meetups"][0]["buildingName"], "공과대학")
        self.assertEqual(self.client.get("/api/rooms", params={**query, "floor": 99}).json()["rooms"], [])

    def test_current_and_future_meetups(self):
        past = make_meetup("row_304", "13:00", "14:00", meetup_id="past")
        current = make_meetup("row_304", "15:00", "16:00", meetup_id="current")
        future = make_meetup("row_304", "17:00", "18:00", meetup_id="future")
        cancelled = make_meetup("row_304", status="cancelled")
        self.repo.list_open.return_value = [future, cancelled, past, current]
        detail = self.client.get("/api/rooms/row_304", params={"at": "2026-11-06T15:10"}).json()["room"]
        self.assertEqual([m["id"] for m in detail["meetups"]], ["current", "future"])
        self.assertEqual(detail["freeUntil"], "2026-11-06T22:00:00+09:00")
        self.assertEqual(self.state("row_304", "16:00", [current])["status"], "empty")
        self.assertEqual(self.state("row_302", "15:10", [make_meetup("row_302")])["status"], "class")

    def test_validation_and_not_found(self):
        for params in ({"at": "invalid"}, {"at": ""}, {"floor": "third"}, {"status": "bad"},
                       {"minFreeMinutes": -1}, {"minFreeMinutes": 601}):
            response = self.client.get("/api/rooms", params=params)
            self.assertEqual(response.status_code, 400, params)
            self.assertEqual(response.json()["error"]["code"], "VALIDATION_ERROR")
        self.assertEqual(self.client.get("/api/rooms/missing").status_code, 404)
        self.assertEqual(self.client.get("/api/rooms", params={"buildingId": "missing"}).status_code, 404)
        self.assertEqual(parse_at("2026-11-06T15:10:59.5").isoformat(), "2026-11-06T15:10:00+09:00")

    def test_repository_delegate_and_imports(self):
        expected = [make_meetup()]
        self.repo.list_open.return_value = expected
        self.assertEqual(list_open_meetups("row_303"), expected)
        self.repo.list_open.assert_called_with(room_id="row_303")
        self.assertTrue(routes_rooms.router.routes)
        self.assertTrue(routes_chat.router.routes)
        self.assertEqual(self.client.post("/api/chat").status_code, 200)  # Fixed stub only.

    def test_memory_client_needs_no_credentials(self):
        with patch.dict(os.environ, {"STORAGE": "memory", "FIREBASE_SERVICE_ACCOUNT_JSON": "not-json"}, clear=True):
            self.assertIsNone(db.get_client())

    def test_main_app_routes_errors_and_post_cors(self):
        from backend.main import app

        with TestClient(app) as client:
            self.assertEqual(client.get("/api/health").status_code, 200)
            response = client.get("/api/rooms", params={"buildingId": "8", "floor": 3,
                                  "status": "empty", "minFreeMinutes": 60,
                                  "at": "2026-11-06T15:10:00+09:00"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual([r["id"] for r in response.json()["rooms"]],
                             ["row_301", "row_303", "row_304"])
            for url, params, status, code in (
                ("/api/rooms/missing", {}, 404, "NOT_FOUND"),
                ("/api/rooms", {"at": "invalid"}, 400, "VALIDATION_ERROR"),
                ("/api/rooms", {"floor": "third"}, 400, "VALIDATION_ERROR"),
                ("/api/missing", {}, 404, "NOT_FOUND"),
            ):
                result = client.get(url, params=params)
                self.assertEqual(result.status_code, status)
                self.assertEqual(result.json()["error"]["code"], code)
            preflight = client.options("/api/chat", headers={
                "Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            })
            self.assertEqual(preflight.status_code, 200)
            self.assertEqual(preflight.headers["access-control-allow-origin"], "http://localhost:3000")
            self.assertEqual(client.post("/api/chat").status_code, 200)  # Contract stub only.

    def test_normalize_real_schema(self):
        documents = fixture_documents()
        duplicate = deepcopy(documents[0][1])
        duplicate["slots"] = [{"start": "14:00", "end": "14:30"}]
        documents.append(("row_999", duplicate))
        basement = deepcopy(documents[0][1])
        basement["roomNo"] = "B101A"
        documents.append(("basement", basement))
        unknown = deepcopy(documents[1][1])
        unknown["day"] = None
        documents.append(("unknown-day", unknown))
        campus = normalize_classrooms(documents)
        rooms = {r["id"]: r for r in campus["rooms"]}
        self.assertNotIn("row_302", rooms)  # Any uncertain row excludes the entire room.
        self.assertEqual(rooms["basement"]["floor"], -1)
        self.assertEqual(rooms["row_301"]["schedule"][0]["endTime"], "14:30")
        self.assertEqual(rooms["row_301"]["capacity"], 0)  # Unprovided metadata, not capacity evidence.
        self.assertEqual(campus["quality"]["invalidDocumentIds"], ["unknown-day"])
        self.assertEqual(campus["quality"]["searchableRoomCount"], 4)


if __name__ == "__main__":
    unittest.main()
