"""B 인계 전 명시적인 4개 방 데모와 B 인터페이스 연결 경계.

실제 엑셀 또는 전체 캠퍼스 구현이 아니다. CAMPUS_SOURCE=demo일 때만 사용한다.
"""

from copy import deepcopy
from datetime import datetime, time
from typing import Protocol

from meetup_time import KST, parse_time


class Campus(Protocol):
    def get_room(self, room_id: str) -> dict | None: ...
    def get_building(self, building_id: str) -> dict | None: ...
    def check_meetup_slot(self, room_id: str, start_at: datetime, end_at: datetime, open_meetups: list[dict]) -> str | None: ...


class CoreCampus:
    """팀의 고정 import만 사용. B 코드가 없거나 실패하면 데모로 바꾸지 않는다."""

    def get_room(self, room_id: str) -> dict | None:
        from core.seed_loader import get_room
        return get_room(room_id)

    def get_building(self, building_id: str) -> dict | None:
        from core.seed_loader import get_building
        return get_building(building_id)

    def check_meetup_slot(self, room_id: str, start_at: datetime, end_at: datetime, open_meetups: list[dict]) -> str | None:
        from core.availability import check_meetup_slot
        return check_meetup_slot(room_id, start_at, end_at, open_meetups)


class DemoCampus:
    """v1의 금요일 301~304 수업만 담은 독립 모임 API 시연용 데이터."""

    def __init__(self):
        self._building = {"id": "eng", "name": "정보대", "floors": [1, 2, 3, 4, 5]}
        self._rooms = {}
        for number, capacity, tags, classes in [
            (301, 40, ["콘센트", "프로젝터"], [("13:00", "14:15", "자료구조"), ("17:00", "18:15", "알고리즘")]),
            (302, 60, ["프로젝터"], [("14:30", "15:50", "운영체제")]),
            (303, 30, ["콘센트", "화이트보드"], [("09:00", "10:15", "컴퓨팅사고")]),
            (304, 32, ["콘센트", "창가"], [("11:00", "12:15", "데이터분석")]),
        ]:
            room_id = f"eng-{number}"
            self._rooms[room_id] = {
                "id": room_id, "buildingId": "eng", "floor": 3,
                "name": f"{number}호", "capacity": capacity, "tags": tags,
                "schedule": [{"dayOfWeek": 5, "startTime": start, "endTime": end, "title": title} for start, end, title in classes],
            }

    def get_room(self, room_id: str) -> dict | None:
        return deepcopy(self._rooms.get(room_id))

    def get_building(self, building_id: str) -> dict | None:
        return deepcopy(self._building) if building_id == "eng" else None

    def check_meetup_slot(self, room_id: str, start_at: datetime, end_at: datetime, open_meetups: list[dict]) -> str | None:
        for lesson in self._rooms[room_id]["schedule"]:
            if lesson["dayOfWeek"] != start_at.isoweekday():
                continue
            start = datetime.combine(start_at.date(), time.fromisoformat(lesson["startTime"]), KST)
            end = datetime.combine(start_at.date(), time.fromisoformat(lesson["endTime"]), KST)
            if start_at < end and start < end_at:
                return f"{lesson['startTime']}–{lesson['endTime']} {lesson['title']} 수업과 겹쳐요."
        for meetup in open_meetups:
            if meetup["roomId"] == room_id and meetup["status"] == "open":
                if start_at < parse_time(meetup["endAt"]) and parse_time(meetup["startAt"]) < end_at:
                    return "같은 강의실의 다른 모임과 시간이 겹쳐요."
        return None
