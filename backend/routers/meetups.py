"""모임 생성·조회·참여·나가기·취소. 요청/응답은 contracts/api.md를 따른다."""

from datetime import datetime, time
import re
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, Path, Query, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

from campus_gateway import Campus
from errors import ApiError
from meetup_repo import MeetupRecord, MeetupRepo, get_repo
from meetup_time import now_kst, parse_time, query_time

router = APIRouter(prefix="/api/meetups", tags=["meetups"])


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, str_strip_whitespace=True)


class UserRequest(ApiModel):
    user_id: str = Field(min_length=1, max_length=64)


class JoinRequest(UserRequest):
    nickname: str = Field(min_length=1, max_length=12)
    avatar: str | None = Field(default=None, max_length=17)

    @field_validator("avatar", mode="before")
    @classmethod
    def valid_avatar(cls, value):
        # 상위 모델의 공백 제거 전에 원문 형식을 검사한다.
        if value is not None and (not isinstance(value, str) or re.fullmatch(r"\d{1,2}(-\d{1,2}){5}", value) is None or len(value) > 17):
            raise ValueError("아바타 형식이 올바르지 않아요.")
        return value


class CreateRequest(JoinRequest):
    room_id: str = Field(min_length=1)
    title: str = Field(min_length=1, max_length=30)
    category: Literal["study", "project", "social", "etc"]
    description: str = Field(default="", max_length=200)
    start_at: str
    end_at: str
    max_members: int = Field(ge=2, le=30, strict=True)

    @field_validator("start_at", "end_at")
    @classmethod
    def valid_timestamp(cls, value: str) -> str:
        return parse_time(value).isoformat()


def repo_for_request(request: Request) -> MeetupRepo:
    if request.app.state.meetup_repo is not None:
        return request.app.state.meetup_repo
    return get_repo()


def campus_for_request(request: Request) -> Campus:
    return request.app.state.campus


RepoDep = Annotated[MeetupRepo, Depends(repo_for_request)]
CampusDep = Annotated[Campus, Depends(campus_for_request)]
NowDep = Annotated[datetime, Depends(now_kst)]
MeetupId = Annotated[str, Path(alias="meetupId")]


def require_room(campus: Campus, room_id: str) -> dict:
    room = campus.get_room(room_id)
    if room is None:
        raise ApiError("NOT_FOUND", 404, "강의실을 찾을 수 없어요.")
    return room


def serialize_meetup(record: MeetupRecord, campus: Campus) -> dict:
    room = require_room(campus, record["roomId"])
    building = campus.get_building(room["buildingId"])
    if building is None:
        raise ApiError("NOT_FOUND", 404, "건물 정보를 찾을 수 없어요.")
    return {
        **record, "roomName": room["name"], "buildingId": building["id"],
        "members": [{**member, "avatar": member.get("avatar")} for member in record["members"]],
        "buildingName": building["name"], "floor": room["floor"],
        "memberCount": len(record["members"]), "isFull": len(record["members"]) >= record["maxMembers"],
    }


@router.get("")
def list_meetups(
    repo: RepoDep, campus: CampusDep,
    room_id: Annotated[str | None, Query(alias="roomId")] = None,
    building_id: Annotated[str | None, Query(alias="buildingId")] = None,
    include_past: Annotated[bool, Query(alias="includePast")] = False,
    at: str | None = None,
) -> dict:
    instant = query_time(at)
    if room_id is not None:
        require_room(campus, room_id)
    if building_id is not None and campus.get_building(building_id) is None:
        raise ApiError("NOT_FOUND", 404, "건물을 찾을 수 없어요.")
    records = repo.list_all() if include_past else repo.list_open(room_id)
    result = []
    for record in records:
        if room_id is not None and record["roomId"] != room_id:
            continue
        if not include_past and parse_time(record["endAt"]) <= instant:
            continue
        meetup = serialize_meetup(record, campus)
        if building_id is None or meetup["buildingId"] == building_id:
            result.append(meetup)
    return {"meetups": result}


@router.post("", status_code=201)
def create_meetup(body: CreateRequest, repo: RepoDep, campus: CampusDep, now: NowDep) -> dict:
    require_room(campus, body.room_id)
    start, end = parse_time(body.start_at), parse_time(body.end_at)
    minutes = (end - start).total_seconds() / 60
    if start.date() != end.date() or not (time(9) <= start.time() < end.time() <= time(22)) or not (15 <= minutes <= 240):
        raise ApiError("VALIDATION_ERROR", 400, "같은 날 09:00–22:00 사이에서 15–240분으로 모임 시간을 정해 주세요.")
    stamp = now.isoformat()
    record: MeetupRecord = {
        "id": uuid4().hex, "roomId": body.room_id, "title": body.title,
        "category": body.category, "description": body.description,
        "startAt": start.isoformat(), "endAt": end.isoformat(), "maxMembers": body.max_members,
        "hostId": body.user_id, "hostNickname": body.nickname,
        "members": [{"userId": body.user_id, "nickname": body.nickname, "joinedAt": stamp, "avatar": body.avatar}],
        "status": "open", "createdAt": stamp,
    }

    def check(open_meetups: list[MeetupRecord]) -> None:
        reason = campus.check_meetup_slot(body.room_id, start, end, open_meetups)
        if reason:
            raise ApiError("ROOM_OCCUPIED", 409, reason)

    saved = repo.create_checked(record, check)
    return {"meetup": serialize_meetup(saved, campus)}


@router.get("/{meetupId}")
def get_meetup(meetup_id: MeetupId, repo: RepoDep, campus: CampusDep) -> dict:
    record = repo.get(meetup_id)
    if record is None:
        raise ApiError("NOT_FOUND", 404, "모임을 찾을 수 없어요.")
    return {"meetup": serialize_meetup(record, campus)}


@router.post("/{meetupId}/join")
def join_meetup(meetup_id: MeetupId, body: JoinRequest, repo: RepoDep, campus: CampusDep, now: NowDep) -> dict:
    def join(record: MeetupRecord) -> MeetupRecord:
        if any(member["userId"] == body.user_id for member in record["members"]):
            return record
        if record["status"] != "open" or parse_time(record["endAt"]) <= now:
            raise ApiError("MEETUP_CLOSED", 409, "종료되거나 취소된 모임이에요.")
        if len(record["members"]) >= record["maxMembers"]:
            raise ApiError("MEETUP_FULL", 409, "모임 정원이 찼어요.")
        record["members"].append({"userId": body.user_id, "nickname": body.nickname, "joinedAt": now.isoformat(), "avatar": body.avatar})
        return record
    return {"meetup": serialize_meetup(repo.update(meetup_id, join), campus)}


@router.post("/{meetupId}/leave")
def leave_meetup(meetup_id: MeetupId, body: UserRequest, repo: RepoDep, campus: CampusDep) -> dict:
    def leave(record: MeetupRecord) -> MeetupRecord:
        if record["hostId"] == body.user_id:
            raise ApiError("HOST_CANNOT_LEAVE", 409, "주최자는 나가기 대신 모임을 취소해 주세요.")
        if not any(member["userId"] == body.user_id for member in record["members"]):
            raise ApiError("NOT_MEMBER", 409, "참여 중인 모임이 아니에요.")
        # 계약의 leave 엔드포인트 규칙대로 status만 검사한다(C1 제안은 미반영).
        if record["status"] != "open":
            raise ApiError("MEETUP_CLOSED", 409, "취소된 모임이에요.")
        record["members"] = [member for member in record["members"] if member["userId"] != body.user_id]
        return record
    return {"meetup": serialize_meetup(repo.update(meetup_id, leave), campus)}


@router.post("/{meetupId}/cancel")
def cancel_meetup(meetup_id: MeetupId, body: UserRequest, repo: RepoDep, campus: CampusDep) -> dict:
    def cancel(record: MeetupRecord) -> MeetupRecord:
        if record["hostId"] != body.user_id:
            raise ApiError("FORBIDDEN", 403, "주최자만 모임을 취소할 수 있어요.")
        record["status"] = "cancelled"
        return record
    return {"meetup": serialize_meetup(repo.update(meetup_id, cancel), campus)}
