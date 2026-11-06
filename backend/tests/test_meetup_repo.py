"""모임 원본 보존과 be-b에 제공할 조회 경계를 확인한다."""

from copy import deepcopy
import os
import unittest
from unittest.mock import patch
from types import SimpleNamespace

import meetup_repo
from meetup_repo import MemoryMeetupRepo, MeetupRecord


def example() -> MeetupRecord:
    return {
        "id": "demo-m1", "roomId": "eng-303", "title": "카공 모여라",
        "category": "study", "description": "조용히 각자 공부해요.",
        "startAt": "2026-11-06T15:00:00+09:00", "endAt": "2026-11-06T17:00:00+09:00",
        "maxMembers": 4, "hostId": "u-demo-host", "hostNickname": "민지",
        "members": [{"userId": "u-demo-host", "nickname": "민지", "joinedAt": "2026-11-06T14:58:00+09:00"}],
        "status": "open", "createdAt": "2026-11-06T14:58:00+09:00",
    }


class MeetupRepoTests(unittest.TestCase):
    def test_save_and_read_isolate_nested_members(self):
        repo = MemoryMeetupRepo()
        row = example()
        saved = repo.save(row)
        row["members"][0]["nickname"] = "입력 변경"
        saved["members"].clear()
        retrieved = repo.get("demo-m1")
        self.assertEqual(retrieved, example())
        retrieved["members"].clear()
        self.assertEqual(len(repo.get("demo-m1")["members"]), 1)
        self.assertIsNone(repo.get("missing"))

    def test_list_open_filters_room_and_status_but_keeps_past_records(self):
        repo = MemoryMeetupRepo()
        repo.save(example())
        cancelled = deepcopy(example())
        cancelled.update(id="cancelled", status="cancelled")
        repo.save(cancelled)
        earlier = deepcopy(example())
        earlier.update(id="earlier", roomId="eng-301", startAt="2026-11-06T14:00:00+09:00")
        repo.save(earlier)
        with patch.dict(os.environ, {"STORAGE": "memory"}), patch.object(meetup_repo, "_memory_repo", repo):
            self.assertEqual([row["id"] for row in meetup_repo.list_open()], ["earlier", "demo-m1"])
            rows = meetup_repo.list_open("eng-303")
            self.assertEqual(rows, [example()])
            rows[0]["members"].clear()
            self.assertEqual(meetup_repo.list_open("eng-303"), [example()])
            self.assertEqual(meetup_repo.list_open("missing"), [])
        cancelled["status"] = "open"
        repo.save(cancelled)
        self.assertEqual(len(repo.list_open()), 3)

    def test_firestore_does_not_silently_return_memory(self):
        with patch.dict(os.environ, {"STORAGE": "firestore"}), patch.dict("sys.modules", {"db": SimpleNamespace(get_client=lambda: None)}), patch.object(meetup_repo, "_firestore_repo", None):
            with self.assertRaises(RuntimeError):
                meetup_repo.list_open()
