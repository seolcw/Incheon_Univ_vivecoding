"""실제 메모리 저장소와 명시적 데모 캠퍼스로 모임 API 계약을 검증한다."""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from campus_gateway import CoreCampus
from main import create_app
from meetup_repo import MemoryMeetupRepo
from meetup_time import now_kst

NOW = datetime.fromisoformat("2026-11-06T15:10:00+09:00")


def payload(**overrides):
    return {
        "roomId": "eng-301", "title": "카공 모여라", "category": "study",
        "startAt": "2026-11-06T15:10:00+09:00", "endAt": "2026-11-06T17:00:00+09:00",
        "maxMembers": 4, "userId": "host", "nickname": "창원", **overrides,
    }


class MeetupApiTests(unittest.TestCase):
    def setUp(self):
        self.repo = MemoryMeetupRepo()
        with patch.dict(os.environ, {"STORAGE": "memory", "CAMPUS_SOURCE": "demo"}):
            self.app = create_app(repo=self.repo)
        self.app.dependency_overrides[now_kst] = lambda: NOW
        self.client = self.enterContext(TestClient(self.app))

    def create(self, **overrides):
        response = self.client.post("/api/meetups", json=payload(**overrides))
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["meetup"]

    def assert_error(self, response, status, code):
        self.assertEqual(response.status_code, status, response.text)
        self.assertEqual(response.json()["error"]["code"], code)

    def test_create_join_list_detail_and_startup_seed(self):
        listed = self.client.get("/api/meetups", params={"at": NOW.isoformat()})
        self.assertEqual([row["id"] for row in listed.json()["meetups"]], ["demo-m1"])
        self.assertEqual(listed.headers["x-campus-source"], "demo")
        meetup = self.create()
        self.assertEqual((meetup["memberCount"], meetup["isFull"], meetup["description"]), (1, False, ""))
        self.assertEqual((meetup["buildingName"], meetup["roomName"], meetup["floor"]), ("정보대", "301호", 3))
        self.assertNotIn("memberCount", self.repo.get(meetup["id"]))
        self.assertNotIn("buildingName", self.repo.get(meetup["id"]))
        path = f"/api/meetups/{meetup['id']}"
        joined = self.client.post(path + "/join", json={"userId": "guest", "nickname": "준호"})
        self.assertEqual(joined.status_code, 200)
        self.assertEqual(joined.json()["meetup"]["memberCount"], 2)
        repeated = self.client.post(path + "/join", json={"userId": "guest", "nickname": "바뀐이름"})
        self.assertEqual(repeated.json(), joined.json())
        self.assertEqual(self.client.get(path).json(), joined.json())
        filtered = self.client.get("/api/meetups", params={"roomId": "eng-301", "buildingId": "eng", "at": "2026-11-06T06:10:59Z"})
        self.assertEqual(filtered.json()["meetups"], [joined.json()["meetup"]])

    def test_validation_order_time_rules_and_missing_room(self):
        cases = [
            ({"maxMembers": 1}, 400, "VALIDATION_ERROR"),
            ({"maxMembers": True}, 400, "VALIDATION_ERROR"),
            ({"userId": " "}, 400, "VALIDATION_ERROR"),
            ({"title": "x" * 31}, 400, "VALIDATION_ERROR"),
            ({"category": "invalid"}, 400, "VALIDATION_ERROR"),
            ({"startAt": "invalid", "roomId": "missing"}, 400, "VALIDATION_ERROR"),
            ({"startAt": "2026-11-06T15:10:00"}, 400, "VALIDATION_ERROR"),
            ({"roomId": "missing", "endAt": "2026-11-07T17:00:00+09:00"}, 404, "NOT_FOUND"),
            ({"endAt": "2026-11-06T15:20:00+09:00"}, 400, "VALIDATION_ERROR"),
            ({"endAt": "2026-11-07T17:00:00+09:00"}, 400, "VALIDATION_ERROR"),
            ({"startAt": "2026-11-06T08:00:00+09:00", "endAt": "2026-11-06T09:00:00+09:00"}, 400, "VALIDATION_ERROR"),
            ({"endAt": "2026-11-06T22:01:00+09:00"}, 400, "VALIDATION_ERROR"),
        ]
        for change, status, code in cases:
            with self.subTest(change=change):
                self.assert_error(self.client.post("/api/meetups", json=payload(**change)), status, code)
        self.assertEqual(len(self.repo.list_all()), 1)

    def test_class_conflict_all_meetups_and_touching_boundaries(self):
        self.assert_error(self.client.post("/api/meetups", json=payload(roomId="eng-302")), 409, "ROOM_OCCUPIED")
        self.assert_error(self.client.post("/api/meetups", json=payload(startAt="2026-11-06T14:14:00+09:00", endAt="2026-11-06T14:29:00+09:00")), 409, "ROOM_OCCUPIED")
        self.create(startAt="2026-11-06T14:15:00+09:00", endAt="2026-11-06T14:30:00+09:00")
        self.create(startAt="2026-11-06T16:45:00+09:00")
        self.create(roomId="eng-304", startAt="2026-11-06T14:00:00+09:00", endAt="2026-11-06T15:00:00+09:00")
        self.create(roomId="eng-304", startAt="2026-11-06T16:00:00+09:00")
        self.assert_error(self.client.post("/api/meetups", json=payload(roomId="eng-304", startAt="2026-11-06T16:30:00+09:00", endAt="2026-11-06T17:30:00+09:00")), 409, "ROOM_OCCUPIED")
        self.create(roomId="eng-304", startAt="2026-11-06T15:00:00+09:00", endAt="2026-11-06T16:00:00+09:00")

    def test_full_leave_cancel_and_idempotence(self):
        meetup = self.create(maxMembers=2)
        path = f"/api/meetups/{meetup['id']}"
        self.client.post(path + "/join", json={"userId": "guest", "nickname": "준호"})
        self.assert_error(self.client.post(path + "/join", json={"userId": "third", "nickname": "셋째"}), 409, "MEETUP_FULL")
        self.assert_error(self.client.post(path + "/leave", json={"userId": "host"}), 409, "HOST_CANNOT_LEAVE")
        self.assert_error(self.client.post(path + "/leave", json={"userId": "stranger"}), 409, "NOT_MEMBER")
        self.assert_error(self.client.post(path + "/cancel", json={"userId": "guest"}), 403, "FORBIDDEN")
        left = self.client.post(path + "/leave", json={"userId": "guest"})
        self.assertEqual(left.json()["meetup"]["memberCount"], 1)
        self.client.post(path + "/join", json={"userId": "guest", "nickname": "준호"})
        cancelled = self.client.post(path + "/cancel", json={"userId": "host"})
        self.assertEqual(cancelled.status_code, 200)
        self.assertEqual(self.client.post(path + "/cancel", json={"userId": "host"}).json(), cancelled.json())
        self.assert_error(self.client.post(path + "/join", json={"userId": "third", "nickname": "셋째"}), 409, "MEETUP_CLOSED")
        self.assert_error(self.client.post(path + "/leave", json={"userId": "guest"}), 409, "MEETUP_CLOSED")
        self.assertEqual(self.client.get(path).json()["meetup"]["status"], "cancelled")
        self.create()  # 취소된 모임은 같은 시간의 생성을 막지 않는다.

    def test_actual_clock_not_demo_at_and_contract_leave(self):
        meetup = self.create()
        path = f"/api/meetups/{meetup['id']}"
        self.client.post(path + "/join", json={"userId": "guest", "nickname": "준호"})
        self.app.dependency_overrides[now_kst] = lambda: datetime.fromisoformat("2026-11-06T17:00:00+09:00")
        self.assert_error(self.client.post(path + "/join?at=2026-11-06T15:10:00%2B09:00", json={"userId": "third", "nickname": "셋째", "at": "2026-11-06T15:10:00+09:00"}), 409, "MEETUP_CLOSED")
        self.assertEqual(self.client.post(path + "/join", json={"userId": "guest", "nickname": "준호"}).status_code, 200)
        self.assertEqual(self.client.post(path + "/leave", json={"userId": "guest"}).status_code, 200)
        self.assertEqual(self.client.get("/api/meetups", params={"at": "2026-11-06T17:00:00"}).json(), {"meetups": []})
        self.assertEqual(len(self.client.get("/api/meetups", params={"includePast": "true", "at": "2026-11-06T17:00:00"}).json()["meetups"]), 2)

    def test_list_errors_and_post_preflight(self):
        for params, status, code in [
            ({"at": "wrong"}, 400, "VALIDATION_ERROR"),
            ({"includePast": "wrong"}, 400, "VALIDATION_ERROR"),
            ({"roomId": "missing"}, 404, "NOT_FOUND"),
            ({"buildingId": "missing"}, 404, "NOT_FOUND"),
        ]:
            self.assert_error(self.client.get("/api/meetups", params=params), status, code)
        self.assert_error(self.client.get("/api/meetups/missing"), 404, "NOT_FOUND")
        self.assert_error(self.client.post("/api/meetups/missing/join", json={"userId": "guest", "nickname": "준호"}), 404, "NOT_FOUND")
        response = self.client.options("/api/meetups", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("POST", response.headers["access-control-allow-methods"])

    def test_last_seat_and_duplicate_create_are_serialized_in_memory(self):
        meetup = self.create(maxMembers=2)
        def join(number):
            return self.client.post(f"/api/meetups/{meetup['id']}/join", json={"userId": f"guest{number}", "nickname": "준호"}).status_code
        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sorted(pool.map(join, range(2))), [200, 409])
        self.assertEqual(len(self.repo.get(meetup["id"])["members"]), 2)
        with ThreadPoolExecutor(max_workers=2) as pool:
            statuses = list(pool.map(lambda _: self.client.post("/api/meetups", json=payload(roomId="eng-304")).status_code, range(2)))
        self.assertEqual(sorted(statuses), [201, 409])

    def test_core_gateway_uses_fixed_b_interface(self):
        from types import SimpleNamespace
        from unittest.mock import Mock
        room = {"id": "custom-room", "buildingId": "custom", "name": "테스트실", "floor": 1}
        check = Mock(return_value="B가 반환한 수업 충돌 사유")
        modules = {
            "core": SimpleNamespace(),
            "core.seed_loader": SimpleNamespace(get_room=lambda _: room, get_building=lambda _: {"id": "custom", "name": "별도 건물"}),
            "core.availability": SimpleNamespace(check_meetup_slot=check),
        }
        self.app.state.campus = CoreCampus()
        with patch.dict("sys.modules", modules):
            response = self.client.post("/api/meetups", json=payload(roomId="custom-room"))
        self.assert_error(response, 409, "ROOM_OCCUPIED")
        self.assertEqual(response.json()["error"]["message"], "B가 반환한 수업 충돌 사유")
        self.assertEqual(check.call_args.args[0], "custom-room")
        self.assertIsInstance(check.call_args.args[1], datetime)
        self.assertEqual(check.call_args.args[3], [])
