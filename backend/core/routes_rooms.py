"""Classroom search and building summaries for the React frontend."""

from typing import Annotated, Literal
from importlib import import_module

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from . import seed_loader
from .availability import as_seoul, parse_at, room_status, today_schedule
from .meetup_reader import list_open_meetups

router = APIRouter(tags=["강의실 검색"])


class RoomFilters(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    building_id: str | None = None
    floor: int | None = None
    status: Literal["empty", "meetup", "class", "closed"] | None = None
    min_free_minutes: int = Field(default=0, ge=0, le=600)
    at: str | None = None


def _at(value):
    try:
        return parse_at(value)
    except (ValueError, OverflowError):
        raise _api_error("VALIDATION_ERROR", 400, "at을 ISO 8601 날짜·시간으로 입력해 주세요.") from None


def _api_error(code: str, status: int, message: str):
    package = __package__.rpartition(".")[0]
    module = import_module(f"{package}.errors" if package else "errors")
    return module.ApiError(code, status, message)


def get_meetups() -> list[dict]:
    return list_open_meetups()


@router.get("/api/buildings", summary="건물별·층별 빈 강의실 수")
def buildings(at: str | None = None, meetups: list[dict] = Depends(get_meetups)) -> dict:
    instant = _at(at)
    rooms = seed_loader.list_rooms()
    summaries = []
    for building_id in sorted({room["buildingId"] for room in rooms}):
        building = seed_loader.get_building(building_id)
        states = [room_status(room, building, instant, meetups)
                  for room in rooms if room["buildingId"] == building_id]

        def counts(items):
            return {"totalCount": len(items),
                    "emptyCount": sum(item["status"] in ("empty", "meetup") for item in items),
                    "meetupCount": sum(item["status"] == "meetup" for item in items)}

        summaries.append({**building, **counts(states), "floorSummary": [
            {"floor": floor, **counts([state for state in states if state["floor"] == floor])}
            for floor in building["floors"]
        ]})
    return {"at": instant.isoformat(), "buildings": summaries}


@router.get("/api/rooms", summary="시간·건물·층·최소 여유 시간으로 강의실 검색")
def rooms(filters: Annotated[RoomFilters, Query()],
          meetups: list[dict] = Depends(get_meetups)) -> dict:
    instant = _at(filters.at)
    if filters.building_id is not None and seed_loader.get_building(filters.building_id) is None:
        raise _api_error("NOT_FOUND", 404, "건물을 찾을 수 없어요.")
    results = []
    for room in seed_loader.list_rooms():
        if filters.building_id is not None and room["buildingId"] != filters.building_id:
            continue
        if filters.floor is not None and room["floor"] != filters.floor:
            continue
        state = room_status(room, seed_loader.get_building(room["buildingId"]), instant, meetups)
        if filters.status is not None and state["status"] != filters.status:
            continue
        if state["freeMinutes"] >= filters.min_free_minutes:
            results.append(state)
    return {"at": instant.isoformat(), "rooms": results}


@router.get("/api/rooms/{roomId}", summary="강의실 상태·오늘 시간표·모임 조회")
def room_detail(roomId: str, at: str | None = None,
                meetups: list[dict] = Depends(get_meetups)) -> dict:
    instant = _at(at)
    room = seed_loader.get_room(roomId)
    if room is None:
        raise _api_error("NOT_FOUND", 404, "강의실을 찾을 수 없어요.")
    building = seed_loader.get_building(room["buildingId"])
    details = []
    for meetup in meetups:
        if (meetup["roomId"] != roomId or meetup["status"] != "open"
                or as_seoul(meetup["endAt"]) <= instant):
            continue
        details.append({**meetup, "roomName": room["name"], "buildingId": room["buildingId"],
                        "buildingName": building["name"], "floor": room["floor"],
                        "memberCount": len(meetup["members"]),
                        "isFull": len(meetup["members"]) >= meetup["maxMembers"]})
    details.sort(key=lambda meetup: as_seoul(meetup["startAt"]))
    return {"at": instant.isoformat(), "room": {
        **room_status(room, building, instant, meetups),
        "todaySchedule": today_schedule(room, instant), "meetups": details,
    }}
