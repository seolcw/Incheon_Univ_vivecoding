"""Firestore 어댑터 단위 검사. 실제 Firebase 또는 에뮬레이터 접속 검사가 아니다."""

from copy import deepcopy
from datetime import datetime, timezone
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from errors import ApiError
from meetup_repo import FirestoreMeetupRepo, from_firestore, to_firestore
from scripts.seed_demo import demo_meetup


class FakeDocument:
    def __init__(self, data, identifier):
        self.data, self.id = data, identifier

    def get(self, transaction=None):
        return SimpleNamespace(id=self.id, exists=self.id in self.data, to_dict=lambda: deepcopy(self.data[self.id]))

    def set(self, data):
        self.data[self.id] = deepcopy(data)

    def create(self, data):
        if self.id in self.data:
            raise AssertionError("문서 중복")
        self.set(data)

    def delete(self):
        self.data.pop(self.id, None)


class FakeCollection:
    def __init__(self):
        self.data = {}

    def document(self, identifier):
        return FakeDocument(self.data, identifier)

    def stream(self):
        return [self.document(identifier).get() for identifier in self.data]


class FakeTransaction:
    def __init__(self):
        self.writes = []

    def set(self, reference, data):
        self.writes.append((reference, data))


def fake_transactional(fn):
    def commit(transaction):
        result = fn(transaction)
        for reference, data in transaction.writes:
            reference.set(data)
        return result
    return commit


class FirestoreRepoTests(unittest.TestCase):
    def setUp(self):
        self.collection = FakeCollection()
        self.client = SimpleNamespace(collection=lambda name: self.collection, transaction=FakeTransaction)
        self.repo = FirestoreMeetupRepo(self.client)

    def test_timestamp_conversion_id_and_derived_fields(self):
        original = demo_meetup()
        original["memberCount"] = 999
        stored = to_firestore(original)
        self.assertNotIn("id", stored)
        self.assertNotIn("memberCount", stored)
        self.assertIsInstance(stored["startAt"], datetime)
        self.assertIsInstance(stored["members"][0]["joinedAt"], datetime)
        stored["startAt"] = stored["startAt"].astimezone(timezone.utc)
        self.collection.document("demo-m1").set(stored)
        self.assertEqual(from_firestore(self.collection.document("demo-m1").get()), demo_meetup())

    def test_store_filters_and_update_abort(self):
        self.repo.create_checked(demo_meetup(), lambda rows: self.assertEqual(rows, []))
        cancelled = demo_meetup()
        cancelled.update(id="cancelled", status="cancelled")
        self.repo.save(cancelled)
        self.assertEqual(self.repo.list_open("eng-303"), [demo_meetup()])
        self.assertEqual(self.repo.list_open("missing"), [])
        self.assertIsNone(self.repo.get("missing"))

        def join(row):
            row["members"].append({"userId": "guest", "nickname": "준호", "joinedAt": "2026-11-06T15:10:00+09:00"})
            return row

        def reject(row):
            row["members"].clear()
            raise ApiError("MEETUP_CLOSED", 409, "종료된 모임이에요.")

        with patch("google.cloud.firestore.transactional", fake_transactional):
            updated = self.repo.update("demo-m1", join)
            self.assertEqual(len(updated["members"]), 2)
            self.assertEqual(self.repo.get("demo-m1"), updated)
            with self.assertRaises(ApiError):
                self.repo.update("demo-m1", reject)
            self.assertEqual(self.repo.get("demo-m1"), updated)
            with self.assertRaises(ApiError):
                self.repo.update("missing", join)
        self.repo.delete("cancelled")
        self.assertEqual(len(self.repo.list_all()), 1)

    def test_avatar_roundtrip_and_legacy_data(self):
        original = demo_meetup()
        original["members"][0]["avatar"] = "99-99-99-99-99-99"
        self.repo.save(original)
        self.assertEqual(self.repo.get(original["id"])["members"][0]["avatar"], original["members"][0]["avatar"])
        def join(row):
            row["members"].append({"userId": "new", "nickname": "참가", "joinedAt": row["createdAt"], "avatar": None})
            return row
        with patch("google.cloud.firestore.transactional", fake_transactional):
            self.repo.update(original["id"], join)
        restarted = FirestoreMeetupRepo(self.client)
        self.assertIsNone(restarted.get(original["id"])["members"][1]["avatar"])
        original["members"][0].pop("avatar")
        self.repo.save(original)
        self.assertEqual(restarted.get(original["id"]), original)
