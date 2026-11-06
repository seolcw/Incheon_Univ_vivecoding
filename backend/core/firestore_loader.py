"""Normalize Firestore classrooms (one document per class) into searchable rooms."""

import logging
import re
from collections import Counter, defaultdict
from datetime import time
from importlib import import_module

_DAYS = {name: index for index, name in enumerate("월화수목금토일", 1)}
logger = logging.getLogger(__name__)


def normalize_classrooms(documents: list[tuple[str, dict]]) -> dict:
    groups = defaultdict(list)
    invalid_rows = []
    for document_id, row in documents:
        building_no, room_no = row.get("buildingNo"), row.get("roomNo")
        if building_no is None or room_no is None:
            # A row without a room cannot safely be assigned to a particular room.
            raise ValueError(f"강의실 위치가 없는 시간표 문서: {document_id}")
        groups[(str(building_no).strip(), str(room_no).strip().upper())].append((document_id, row))

    rooms, building_names, excluded_rooms = [], {}, []
    for (building_id, room_no), rows in sorted(groups.items()):
        match = re.fullmatch(r"(B?)([1-9][0-9]{2})(?:[A-Z])?(?:-[0-9]+)?", room_no)
        schedule = []
        valid = bool(match) and bool(building_id)
        for document_id, row in sorted(rows):
            day = _DAYS.get(row.get("day"))
            slots = row.get("slots")
            if day is None or not isinstance(slots, list) or not slots:
                valid = False
                invalid_rows.append(document_id)
                continue
            for slot in slots:
                try:
                    start, end = slot["start"], slot["end"]
                    if not (re.fullmatch(r"\d{2}:\d{2}", start)
                            and re.fullmatch(r"\d{2}:\d{2}", end)
                            and time.fromisoformat(start) < time.fromisoformat(end)):
                        raise ValueError("Invalid class interval")
                except (KeyError, TypeError, ValueError):
                    valid = False
                    invalid_rows.append(document_id)
                    continue
                schedule.append({"dayOfWeek": day, "startTime": start,
                                 "endTime": end, "title": "수업"})
        if not valid:
            excluded_rooms.append({"buildingId": building_id, "roomNo": room_no})
            continue

        # Duplicate/overlapping course rows must not create an artificial free gap.
        merged = []
        for slot in sorted(schedule, key=lambda s: (s["dayOfWeek"], s["startTime"], s["endTime"])):
            if (merged and merged[-1]["dayOfWeek"] == slot["dayOfWeek"]
                    and slot["startTime"] < merged[-1]["endTime"]):
                merged[-1]["endTime"] = max(merged[-1]["endTime"], slot["endTime"])
            else:
                merged.append(slot.copy())
        floor = int(match.group(2)) // 100 * (-1 if match.group(1) else 1)
        names = Counter(row.get("buildingName") for _, row in rows if row.get("buildingName"))
        building_names.setdefault(building_id, Counter()).update(names)
        rooms.append({
            # Preserve a real Firestore document ID as the canonical room ID.
            "id": min(document_id for document_id, _ in rows), "buildingId": building_id,
            "floor": floor, "name": f"{room_no}호", "capacity": 0, "tags": [],
            "schedule": merged,
        })

    buildings = []
    for index, building_id in enumerate(sorted(building_names)):
        names = building_names[building_id]
        buildings.append({
            "id": building_id, "name": names.most_common(1)[0][0] if names else f"{building_id}호관",
            # 0 means unprovided metadata, never a surveyed campus coordinate.
            "lat": 0, "lng": 0,
            "floors": sorted({room["floor"] for room in rooms if room["buildingId"] == building_id}),
            "map": {"x": 4 + (index % 5) * 19, "y": 4 + (index // 5) * 19, "w": 15, "h": 14},
        })
    if not rooms:
        raise ValueError("검색할 수 있는 Firestore 강의실 시간표가 없습니다.")
    return {"buildings": buildings, "rooms": rooms, "quality": {
        "documentCount": len(documents), "sourceRoomCount": len(groups),
        "searchableRoomCount": len(rooms), "excludedRooms": excluded_rooms,
        "invalidDocumentIds": sorted(set(invalid_rows)),
    }}


def load_firestore_campus() -> dict:
    package = __package__.rpartition(".")[0]
    db = import_module(f"{package}.db" if package else "db")
    client = db.get_client()
    if client is None:
        raise RuntimeError("실제 시간표 조회에는 STORAGE=firestore가 필요합니다.")
    documents = [(doc.id, doc.to_dict()) for doc in
                 client.collection("classrooms").stream(timeout=30, retry=None)]
    campus = normalize_classrooms(documents)
    quality = campus["quality"]
    logger.info("Firestore timetable: %s documents, %s searchable rooms",
                quality["documentCount"], quality["searchableRoomCount"])
    if quality["excludedRooms"]:
        logger.warning("Incomplete timetables excluded from search: %s rooms",
                       len(quality["excludedRooms"]))
    return campus
