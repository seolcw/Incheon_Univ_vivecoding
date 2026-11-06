"""추천의 시간·모임 제약, 실제 라우트, AI 실패 처리. 외부 API 과금 없음."""
import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from core.availability import parse_at
from core.llm import SearchIntent, interpret
from core.recommend import recommend, explicit_minutes
from core.chat_context import ChatContexts
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

    def test_optional_floor_does_not_require_clarification_even_if_llm_says_so(self):
        mistaken = SearchIntent(intent="search", building="info", minutes=15, floor=3,
                                needsClarification=True, facilitiesRequested=False, mood="bright")
        with patch("core.recommend.interpret", return_value=mistaken):
            result = recommend("7호관 2시간 이상 사용할곳", parse_at(AT), [])
            self.assertTrue(result["recommendations"])
            self.assertIn("120분 이상", result["reply"])
            self.assertIn("전체 층", result["reply"])
            self.assertTrue(all(room["freeMinutes"] >= 120 for room in result["recommendations"]))
            for unsupported in ("내일 2시간 공부", "6층에서 2시간 공부", "오후 3시부터 2시간 공부", "0분 공부"):
                self.assertEqual(recommend(unsupported, parse_at(AT), [])["recommendations"], [])

    def test_follow_up_keeps_duration_and_clears_floor_for_same_user_only(self):
        with TestClient(create_app()) as client:
            payload = {"userId": "follow-up", "location": None, "at": AT}
            def ask(message, user_id="follow-up"):
                response = client.post("/api/chat", json={**payload, "userId": user_id, "message": message})
                self.assertEqual(response.status_code, 200)
                return response.json()
            self.assertIn("120분 이상", ask("7호관 2시간 이상 사용할곳")["reply"])
            anywhere = ask("층 상관 없어")
            self.assertTrue(anywhere["recommendations"])
            self.assertIn("120분 이상", anywhere["reply"])
            self.assertIn("전체 층", anywhere["reply"])
            third = ask("그럼 3층은?")
            self.assertTrue(third["recommendations"])
            self.assertTrue(all(room["floor"] == 3 and room["freeMinutes"] >= 120 for room in third["recommendations"]))
            self.assertIn("60분 이상", ask("그럼 1시간")["reply"])
            self.assertIn("전체 층", ask("층 상관 없어")["reply"])
            self.assertIn("15분 이상", ask("층 상관 없어", "another-user")["reply"])
            self.assertIn("15분 이상", ask("7호관 빈 강의실 추천")["reply"])

    def test_search_context_expires_and_is_bounded(self):
        contexts = ChatContexts(ttl=10, capacity=1)
        intent = SearchIntent(intent="search", building="info", minutes=120, floor=3,
                              needsClarification=False, facilitiesRequested=False, mood="bright")
        with patch("core.chat_context.monotonic", return_value=100):
            contexts.save("first", "2026-11-10", intent)
            contexts.save("second", "2026-11-10", intent)
            self.assertIsNone(contexts.get("first", "2026-11-10"))
            self.assertEqual(contexts.get("second", "2026-11-10").minutes, 120)
        with patch("core.chat_context.monotonic", return_value=111):
            self.assertIsNone(contexts.get("second", "2026-11-10"))
        contexts.save("second", "2026-11-10", intent)
        self.assertIsNone(contexts.get("second", "2026-11-11"))

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

    def test_small_talk_uses_generated_reply_without_building_gate_or_database(self):
        generated = SearchIntent(intent="chat", building="other", minutes=120, floor=None,
                                 needsClarification=True, facilitiesRequested=False, mood="calm",
                                 reply="두 시간이나 집중했구나. 잠깐 물 마시고 쉬자! 지금은 수다 떨어도 좋아.")
        with TestClient(create_app()) as client, patch("core.recommend.interpret", return_value=generated), patch("core.routes_chat.list_open_meetups") as database:
            for message in ("야다", "2시간 공부했더니 피곤해", "도서관에서 졸았어", "강의실 말고 수다 떨자"):
                response = client.post("/api/chat", json={"userId": "casual", "message": message, "location": None, "at": AT})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json(), {"reply": generated.reply, "recommendations": [], "source": "llm"})
            database.assert_not_called()

    def test_recent_conversation_reaches_ai_but_not_other_users(self):
        generated = SearchIntent(intent="chat", building="info", minutes=15, floor=None,
                                 needsClarification=False, facilitiesRequested=False, mood="bright", reply="어떤 과목이 제일 고민이야?")
        with TestClient(create_app()) as client, patch("core.recommend.interpret", return_value=generated) as ai:
            payload = {"userId": "talker", "location": None, "at": AT}
            for message in ("공부가 막막해", "자료구조", "어디부터 할까", "응", "예시도 알려줘"):
                self.assertEqual(client.post("/api/chat", json={**payload, "message": message}).status_code, 200)
            history = ai.call_args.kwargs["history"]
            self.assertEqual(len(history), 6)
            self.assertEqual(history[-2]["content"], "응")
            self.assertEqual(history[-1]["role"], "assistant")
            client.post("/api/chat", json={**payload, "userId": "stranger", "message": "안녕"})
            self.assertEqual(ai.call_args.kwargs["history"], [])

    def test_ai_text_cannot_invent_room_availability_and_failure_is_labelled(self):
        generated = SearchIntent(intent="search", building="info", minutes=120, floor=3,
                                 needsClarification=False, facilitiesRequested=False, mood="bright",
                                 reply="999호가 지금 비어 있으니 예약했어!")
        with patch("core.recommend.interpret", return_value=generated):
            result = recommend("3층 2시간 공부할 곳", parse_at(AT), [])
            self.assertNotIn("999", result["reply"])
            self.assertTrue(result["recommendations"])
        failed = recommend("안녕", parse_at(AT), [])
        self.assertEqual(failed["source"], "fallback")
        self.assertIn("AI 연결", failed["reply"])
