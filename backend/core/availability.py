"""Seoul-time classroom availability shared by room and meetup APIs."""

from datetime import datetime, time, timedelta, timezone

from . import seed_loader

SEOUL = timezone(timedelta(hours=9), name="Asia/Seoul")


def as_seoul(value: str | datetime) -> datetime:
    if isinstance(value, str):
        value = datetime.fromisoformat(value)
    if value.tzinfo is None:
        value = value.replace(tzinfo=SEOUL)
    return value.astimezone(SEOUL)


def parse_at(value: str | None = None) -> datetime:
    if value is not None and ("T" not in value and " " not in value):
        raise ValueError("날짜와 시간을 ISO 8601 형식으로 입력해 주세요.")
    return (as_seoul(value) if value else datetime.now(SEOUL)).replace(
        second=0, microsecond=0
    )


def today_schedule(room: dict, at: datetime) -> list[dict]:
    at = as_seoul(at)
    entries = []
    for slot in room["schedule"]:
        if slot["dayOfWeek"] != at.isoweekday():
            continue
        entries.append({
            "startAt": datetime.combine(at.date(), time.fromisoformat(slot["startTime"]), SEOUL).isoformat(),
            "endAt": datetime.combine(at.date(), time.fromisoformat(slot["endTime"]), SEOUL).isoformat(),
            "title": slot["title"],
        })
    return sorted(entries, key=lambda entry: (entry["startAt"], entry["endAt"]))


def room_status(room: dict, building: dict, at: datetime, open_meetups: list[dict]) -> dict:
    at = as_seoul(at).replace(second=0, microsecond=0)
    result = {key: room[key] for key in (
        "id", "buildingId", "floor", "name", "capacity", "tags"
    )}
    result.update(buildingName=building["name"], status="closed", freeUntil=None,
                  freeMinutes=0, classEndsAt=None, currentTitle=None, activeMeetupId=None)
    opening = datetime.combine(at.date(), time(9), SEOUL)
    closing = datetime.combine(at.date(), time(22), SEOUL)
    if not opening <= at < closing:
        return result
    schedule = today_schedule(room, at)
    current = [entry for entry in schedule
               if as_seoul(entry["startAt"]) <= at < as_seoul(entry["endAt"])]
    if current:
        result.update(status="class", classEndsAt=current[0]["endAt"],
                      currentTitle=current[0]["title"])
        return result
    next_class = min((as_seoul(entry["startAt"]) for entry in schedule
                      if as_seoul(entry["startAt"]) > at), default=closing)
    free_until = min(next_class, closing)
    result.update(status="empty", freeUntil=free_until.isoformat(),
                  freeMinutes=int((free_until - at).total_seconds() // 60))
    for meetup in open_meetups:
        if (meetup["roomId"] == room["id"] and meetup["status"] == "open"
                and as_seoul(meetup["startAt"]) <= at < as_seoul(meetup["endAt"])):
            result.update(status="meetup", currentTitle=meetup["title"],
                          activeMeetupId=meetup["id"])
            break
    return result


def check_meetup_slot(room_id: str, start_at: str | datetime,
                      end_at: str | datetime, open_meetups: list[dict]) -> str | None:
    """Check overlaps after be-a validates dates, hours, and duration."""
    room = seed_loader.get_room(room_id)
    if room is None:
        return "강의실을 찾을 수 없어요."
    start, end = as_seoul(start_at), as_seoul(end_at)
    for entry in today_schedule(room, start):
        if start < as_seoul(entry["endAt"]) and as_seoul(entry["startAt"]) < end:
            return f"{entry['startAt'][11:16]}~{entry['endAt'][11:16]}에 수업이 있어요."
    for meetup in open_meetups:
        if (meetup["roomId"] == room_id and meetup["status"] == "open"
                and start < as_seoul(meetup["endAt"]) and as_seoul(meetup["startAt"]) < end):
            return "선택한 시간에 이 강의실의 다른 모임이 있어요."
    return None
