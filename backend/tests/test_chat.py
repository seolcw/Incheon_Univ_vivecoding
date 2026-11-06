"""추천의 시간·모임 제약, 실제 라우트, AI 실패 처리. 외부 API 과금 없음."""
import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from core.availability import parse_at
from core.llm import SearchIntent, interpret
from core.recommend import recommend, explicit_minutes
from core import seed_loader
from main import create_app

AT = "2026-11-10T14:10:00+09:00"


class ChatTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {"STORAGE": "memory", "CAMPUS_SOURCE": "seed", "OPENAI_API_KEY": ""})
        self.env.start()
        self.addCleanup(self.env.stop)
        seed_loader._load_source.cache_clear()

    def test_two_hours_floor_and_future_meetup_are_hard_filters(self):
        meetups = [{"roomId": "eng-304", "status": "open", "startAt": "2026-11-10T15:00:00+09:00", "endAt": "2026-11-10T16:00:00+09:00"},
                   {"roomId": "eng-316", "status": "open", "startAt": "2026-11-10T14:00:00+09:00", "endAt": "2026-11-10T16:00:00+09:00"}]
        for index, meetup in enumerate(meetups):
            meetup.update(id=f"test-{index}", title="테스트 모임")
        result = recommend("3층에서 두 시간 공부할 곳", parse_at(AT), meetups)
        rooms = result["recommendations"]
        self.assertEqual(result["source"], "fallback")
        self.assertEqual({room["roomId"] for room in rooms}, {"eng-302", "eng-317"})
        self.assertTrue(all(room["freeMinutes"] >= 120 and room["floor"] == 3 for room in rooms))
        self.assertEqual(explicit_minutes("한 시간 반"), 90)
        self.assertEqual(explicit_minutes("1시간 30분"), 90)

    def test_no_results_outside_scope_and_unknown_facilities(self):
        for message in ("2층에서 2시간 공부", "8호관 강의실", "내일 2시간 공부", "학식 메뉴 알려줘"):
            self.assertEqual(recommend(message, parse_at(AT), [])["recommendations"], [])
        near = recommend("근처에서 2시간 조용히 공부할 곳", parse_at(AT), [], has_location=True)
        self.assertIn("현장에서 확인", near["reply"])
        self.assertIn("실내 거리", near["reply"])
        self.assertTrue(all(room["walkMinutes"] is None for room in near["recommendations"]))
        self.assertEqual(recommend("빈 강의실", parse_at("2026-11-10T23:00:00+09:00"), [])["recommendations"], [])

    def test_llm_cannot_relax_explicit_duration_or_floor(self):
        intent = SearchIntent(intent="search", building="info", minutes=15, floor=1,
                              needsClarification=False, facilitiesRequested=False, mood="cheer")
        with patch("core.recommend.interpret", return_value=intent):
            result = recommend("3층에서 2시간 공부할 곳", parse_at(AT), [])
        self.assertEqual(result["source"], "llm")
        self.assertTrue(all(room["floor"] == 3 and room["freeMinutes"] >= 120 for room in result["recommendations"]))

    def test_provider_timeout_has_safe_fallback(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-not-a-real-key"}), patch("core.llm.OpenAI", side_effect=TimeoutError("do not expose")):
            self.assertIsNone(interpret("빈 강의실"))
        with patch("core.llm.OpenAI") as provider:
            self.assertIsNone(interpret("빈 강의실"))
            provider.assert_not_called()

    def test_http_validation_and_registered_route(self):
        with TestClient(create_app()) as client:
            payload = {"userId": "test-chat", "message": "3층에서 2시간 공부할 곳", "location": None, "at": AT}
            response = client.post("/api/chat", json=payload)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(set(response.json()), {"reply", "recommendations", "source"})
            self.assertLessEqual(len(response.json()["reply"]), 200)
            for bad in ({"message": " "}, {"at": "bad-date"}, {"location": {"lat": 999, "lng": 127}}):
                failed = client.post("/api/chat", json={**payload, **bad})
                self.assertEqual(failed.status_code, 400)
                self.assertEqual(failed.json()["error"]["code"], "VALIDATION_ERROR")
