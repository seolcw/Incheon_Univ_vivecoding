"""AI는 의도만 해석. 추천의 모든 방·시간·이유는 서버 데이터로 구성한다."""
import re
from datetime import datetime

from . import seed_loader
from .availability import as_seoul, room_status
from .llm import SearchIntent, interpret


def explicit_minutes(message: str) -> int | None:
    normalized = message
    for word, number in (("한", "1"), ("두", "2"), ("세", "3"), ("네", "4")):
        normalized = re.sub(word + r"\s*시간", number + "시간", normalized)
    hours = re.search(r"(\d+(?:\.\d+)?)\s*시간\s*(반)?", normalized)
    minutes = re.search(r"(\d+)\s*분", normalized)
    if not hours and not minutes:
        return None
    return (int(float(hours[1]) * 60) + (30 if hours[2] else 0) if hours else 0) + (int(minutes[1]) if minutes else 0)


def fallback_intent(message: str) -> SearchIntent:
    duration = explicit_minutes(message)
    floor_match = re.search(r"(\d+)\s*층", message)
    floor = int(floor_match[1]) if floor_match else None
    buildings = re.findall(r"(\d+)\s*호관", message)
    other = any(number != "7" for number in buildings) or bool(re.search(r"공학관|도서관|인문대|경영대|자연대", message))
    search = bool(re.search(r"강의실|빈\s*(방|공간)|공부|카공|스터디|7\s*호관|정보대|정보기술|자리|추천", message))
    greeting = bool(re.search(r"안녕|반가|고마|감사|누구|횃불|응원|힘들|지쳤", message))
    clarify = bool(re.search(r"내일|모레|어제|다음|오후|오전|\d+\s*시(?!간)|\d+:\d+|월요일|화요일|수요일|목요일|금요일|토요일|일요일", message))
    return SearchIntent(
        intent="search" if search else "greeting" if greeting else "out_of_scope",
        building="other" if other else "info", minutes=max(1, min(duration or 15, 1440)),
        floor=floor if floor in range(1, 6) else None,
        needsClarification=clarify or (floor is not None and floor not in range(1, 6)) or (duration is not None and not 1 <= duration <= 660),
        facilitiesRequested=bool(re.search(r"콘센트|조용|인실|명|정원|화이트보드|프로젝터|창가", message)),
        mood="cheer" if re.search(r"힘들|지쳤|응원|시험", message) else "bright",
    )


def recommend(message: str, at: datetime, meetups: list[dict], *, has_location: bool = False) -> dict:
    rules = fallback_intent(message)
    ai = interpret(message)
    intent = ai or rules
    source = "llm" if ai else "fallback"

    def answer(reply, rooms=None):
        return {"reply": reply[:200], "recommendations": rooms or [], "source": source}

    if rules.building == "other" or intent.building == "other":
        return answer("앗, 이번 탐험은 정보대(7호관)만 가능해! 다른 건물 정보는 아직 없어. 정보대에서 필요한 시간을 알려줘. 🔥")
    if rules.needsClarification or intent.needsClarification:
        return answer("시간을 정확히 맞추고 싶어! 화면의 기준 시각부터 이용할 시간과 1~5층 중 원하는 층을 말해 줘. 예: ‘3층에서 2시간 공부할 곳’. 🔥")
    if intent.intent == "greeting":
        return answer("안녕! 나는 횃불이야. 잠깐 쉬어도 괜찮아, 다시 시작하는 너를 응원할게! 🔥 정보대에서 공부할 곳이 필요하면 시간과 층을 알려줘.")
    if intent.intent != "search":
        return answer("그건 아직 내가 확인할 수 없는 정보야. 지금은 정보대 빈 강의실 찾기를 도와줄 수 있어! ‘7호관에서 2시간 공부할 곳’처럼 물어봐 줘. 🔥")

    minutes = explicit_minutes(message) or intent.minutes
    floor_match = re.search(r"(\d+)\s*층", message)
    floor = int(floor_match[1]) if floor_match else intent.floor
    candidates = []
    for room in seed_loader.list_rooms():
        if room["buildingId"] != "eng" or (floor is not None and room["floor"] != floor):
            continue
        state = room_status(room, seed_loader.get_building("eng"), at, meetups)
        if state["status"] != "empty":
            continue
        until = as_seoul(state["freeUntil"])
        for meetup in meetups:
            if meetup["roomId"] == room["id"] and meetup["status"] == "open":
                start = as_seoul(meetup["startAt"])
                if at < start < until:
                    until = start
        available = int((until - at).total_seconds() // 60)
        if available < minutes:
            continue
        candidates.append({"roomId": room["id"], "roomName": room["name"],
            "buildingId": "eng", "buildingName": "정보대", "floor": room["floor"],
            "status": "empty", "freeUntil": until.isoformat(), "freeMinutes": available,
            "walkMinutes": None, "reason": f"{until:%H:%M}까지 수업·모임 없이 {available}분 비어 있어."})
    candidates.sort(key=lambda room: (-room["freeMinutes"], room["floor"], room["roomName"]))
    chosen = candidates[:3]
    prefix = {"bright": "좋아, 공부할 자리를 밝혀줄게! 🔥", "calm": "천천히 살펴봤어. 🔥", "cheer": "공부하는 너를 응원해! 🔥"}[intent.mood]
    if not chosen:
        return answer(f"앗, {at:%H:%M} 기준 정보대{' ' + str(floor) + '층' if floor else ''}에 연속 {minutes}분 비어 있는 강의실이 없어. 시간을 줄이거나 층 조건을 바꿔볼까?")
    reply = f"{prefix} {at:%H:%M} 기준, {minutes}분 이상 비어 있는 정보대 강의실이야."
    if intent.facilitiesRequested or rules.facilitiesRequested:
        reply += " 조용함·콘센트·좌석 정보는 없어서 현장에서 확인해 줘."
    if has_location or re.search(r"가까|근처|주변|GPS|gps", message):
        reply += " 정보대 한 건물만 비교해. 실내 거리 순서는 알 수 없어."
    reply += " 카드에서 시간표를 확인해 줘!"
    return answer(reply, chosen)
