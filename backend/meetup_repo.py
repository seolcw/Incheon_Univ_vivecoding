"""모임 원본 저장소. 강의실 정보와 인원 수 등 파생 필드는 저장하지 않는다."""

from copy import deepcopy
from datetime import datetime
import os
from threading import RLock
from typing import Literal, Protocol, TypedDict


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


def storage_mode() -> Literal["memory", "firestore"]:
    mode = os.environ.get("STORAGE", "firestore").strip().lower() or "firestore"
    if mode not in ("memory", "firestore"):
        raise ValueError("STORAGE는 memory 또는 firestore여야 합니다.")
    return mode


_memory_repo = MemoryMeetupRepo()


def get_repo() -> MeetupRepo:
    if storage_mode() == "memory":
        return _memory_repo
    # 연결 실패를 빈 목록으로 숨기지 않는다. Firestore 구현은 다음 작업 구간이다.
    raise NotImplementedError("Firestore 모임 저장소는 아직 미구현입니다. 지금은 STORAGE=memory로 실행하세요.")


def list_open(room_id: str | None = None) -> list[MeetupRecord]:
    """be-b 상태 계산에 제공하는 계약: camelCase, ISO 문자열, 파생 필드 없음."""
    return get_repo().list_open(room_id)
