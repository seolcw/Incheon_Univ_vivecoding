"""모임 원본 저장소. 강의실 정보와 인원 수 등 파생 필드는 저장하지 않는다."""

from copy import deepcopy
from datetime import datetime
import os
from threading import RLock
from typing import Callable, Literal, Protocol, TypedDict

from errors import ApiError
from meetup_time import KST


class Member(TypedDict):
    userId: str
    nickname: str
    joinedAt: str


class MeetupRecord(TypedDict):
    id: str
    roomId: str
    title: str
    category: Literal["study", "project", "social", "etc"]
    description: str
    startAt: str
    endAt: str
    maxMembers: int
    hostId: str
    hostNickname: str
    members: list[Member]
    status: Literal["open", "cancelled"]
    createdAt: str


class MeetupRepo(Protocol):
    def get(self, meetup_id: str) -> MeetupRecord | None: ...

    def save(self, meetup: MeetupRecord) -> MeetupRecord:
        """id로 전체 원본을 저장하거나 교체한다(upsert)."""
        ...

    def list_open(self, room_id: str | None = None) -> list[MeetupRecord]: ...

    def list_all(self) -> list[MeetupRecord]: ...

    def create_checked(self, meetup: MeetupRecord, check: Callable[[list[MeetupRecord]], None]) -> MeetupRecord: ...

    def update(self, meetup_id: str, change: Callable[[MeetupRecord], MeetupRecord]) -> MeetupRecord: ...

    def delete(self, meetup_id: str) -> None: ...


class MemoryMeetupRepo:
    """단일 프로세스용 저장소. 반환값 변경은 save 전까지 저장소에 반영되지 않는다."""

    def __init__(self):
        self._meetups: dict[str, MeetupRecord] = {}
        self._lock = RLock()

    def get(self, meetup_id: str) -> MeetupRecord | None:
        with self._lock:
            return deepcopy(self._meetups.get(meetup_id))

    def save(self, meetup: MeetupRecord) -> MeetupRecord:
        with self._lock:
            stored = deepcopy(meetup)
            self._meetups[stored["id"]] = stored
            return deepcopy(stored)

    def list_open(self, room_id: str | None = None) -> list[MeetupRecord]:
        # 과거 여부는 at를 아는 호출자가 판단한다. 여기서는 status만 필터한다.
        with self._lock:
            records = [
                row for row in self._meetups.values()
                if row["status"] == "open"
                and (room_id is None or row["roomId"] == room_id)
            ]
            return deepcopy(sorted(records, key=lambda row: datetime.fromisoformat(row["startAt"])))

    def list_all(self) -> list[MeetupRecord]:
        with self._lock:
            return deepcopy(sorted(self._meetups.values(), key=lambda row: datetime.fromisoformat(row["startAt"])))

    def create_checked(self, meetup: MeetupRecord, check: Callable[[list[MeetupRecord]], None]) -> MeetupRecord:
        with self._lock:
            check(self.list_open(meetup["roomId"]))
            return self.save(meetup)

    def update(self, meetup_id: str, change: Callable[[MeetupRecord], MeetupRecord]) -> MeetupRecord:
        with self._lock:
            current = self.get(meetup_id)
            if current is None:
                raise ApiError("NOT_FOUND", 404, "모임을 찾을 수 없어요.")
            return self.save(change(current))

    def delete(self, meetup_id: str) -> None:
        with self._lock:
            self._meetups.pop(meetup_id, None)


def to_firestore(record: MeetupRecord) -> dict:
    """문서 ID와 파생 필드는 저장하지 않고 원본 시간만 Timestamp로 바꾼다."""
    result = {key: deepcopy(record[key]) for key in MeetupRecord.__annotations__ if key != "id"}
    for key in ("startAt", "endAt", "createdAt"):
        result[key] = datetime.fromisoformat(result[key])
    for member in result["members"]:
        member["joinedAt"] = datetime.fromisoformat(member["joinedAt"])
    return result


def from_firestore(snapshot) -> MeetupRecord | None:
    if not snapshot.exists:
        return None
    result = snapshot.to_dict()
    result = {key: deepcopy(result[key]) for key in MeetupRecord.__annotations__ if key != "id"}
    result["id"] = snapshot.id
    for key in ("startAt", "endAt", "createdAt"):
        result[key] = result[key].astimezone(KST).isoformat()
    for member in result["members"]:
        member["joinedAt"] = member["joinedAt"].astimezone(KST).isoformat()
    return result


class FirestoreMeetupRepo:
    """실클라이언트는 B의 db.get_client()로 주입한다. 메모리 fallback 없음."""

    def __init__(self, client):
        self._client = client
        self._collection = client.collection("meetups")
        self._create_lock = RLock()

    def get(self, meetup_id: str) -> MeetupRecord | None:
        return from_firestore(self._collection.document(meetup_id).get())

    def save(self, meetup: MeetupRecord) -> MeetupRecord:
        self._collection.document(meetup["id"]).set(to_firestore(meetup))
        return deepcopy(meetup)

    def list_all(self) -> list[MeetupRecord]:
        records = [from_firestore(snapshot) for snapshot in self._collection.stream()]
        return sorted(records, key=lambda row: datetime.fromisoformat(row["startAt"]))

    def list_open(self, room_id: str | None = None) -> list[MeetupRecord]:
        # 대회 규모(최대 200개): 복합 색인 없이 원본을 읽어 같은 기준으로 필터한다.
        return [row for row in self.list_all() if row["status"] == "open" and (room_id is None or row["roomId"] == room_id)]

    def create_checked(self, meetup: MeetupRecord, check: Callable[[list[MeetupRecord]], None]) -> MeetupRecord:
        # 동일 프로세스 내 직렬화. 여러 서버의 동시 생성은 별도 분산 잠금이 필요하다.
        with self._create_lock:
            check(self.list_open(meetup["roomId"]))
            self._collection.document(meetup["id"]).create(to_firestore(meetup))
            return deepcopy(meetup)

    def update(self, meetup_id: str, change: Callable[[MeetupRecord], MeetupRecord]) -> MeetupRecord:
        from google.cloud.firestore import transactional

        reference = self._collection.document(meetup_id)

        @transactional
        def apply(transaction):
            current = from_firestore(reference.get(transaction=transaction))
            if current is None:
                raise ApiError("NOT_FOUND", 404, "모임을 찾을 수 없어요.")
            updated = change(current)
            transaction.set(reference, to_firestore(updated))
            return updated

        return apply(self._client.transaction())

    def delete(self, meetup_id: str) -> None:
        self._collection.document(meetup_id).delete()


def storage_mode() -> Literal["memory", "firestore"]:
    mode = os.environ.get("STORAGE", "firestore").strip().lower() or "firestore"
    if mode not in ("memory", "firestore"):
        raise ValueError("STORAGE는 memory 또는 firestore여야 합니다.")
    return mode


_memory_repo = MemoryMeetupRepo()
_firestore_repo: FirestoreMeetupRepo | None = None
_repo_lock = RLock()


def get_repo() -> MeetupRepo:
    if storage_mode() == "memory":
        return _memory_repo
    global _firestore_repo
    with _repo_lock:
        if _firestore_repo is None:
            from db import get_client
            client = get_client()
            if client is None:
                raise RuntimeError("Firestore 모드에 유효한 클라이언트가 없습니다.")
            _firestore_repo = FirestoreMeetupRepo(client)
        return _firestore_repo


def list_open(room_id: str | None = None) -> list[MeetupRecord]:
    """be-b 상태 계산에 제공하는 계약: camelCase, ISO 문자열, 파생 필드 없음."""
    return get_repo().list_open(room_id)
