"""Fixed contract examples only; no state calculation or AI calls."""

import json

from fastapi import APIRouter

router = APIRouter()


@router.get("/api/buildings")
def buildings_stub() -> dict:
    return json.loads('''
{
  "at": "2026-11-06T15:10:00+09:00",
  "buildings": [
    {
      "id": "eng",
      "name": "공학관",
      "lat": 37.5508,
      "lng": 127.0743,
      "floors": [1, 2, 3],
      "map": { "x": 8, "y": 14, "w": 30, "h": 22 },
      "totalCount": 12,
      "emptyCount": 7,
      "meetupCount": 1,
      "floorSummary": [
        { "floor": 1, "totalCount": 4, "emptyCount": 2, "meetupCount": 0 },
        { "floor": 2, "totalCount": 4, "emptyCount": 2, "meetupCount": 0 },
        { "floor": 3, "totalCount": 4, "emptyCount": 3, "meetupCount": 1 }
      ]
    }
  ]
}
''')


@router.get("/api/rooms")
def rooms_stub() -> dict:
    return json.loads('''
{
  "at": "2026-11-06T15:10:00+09:00",
  "rooms": [
    {
      "id": "eng-301", "buildingId": "eng", "buildingName": "공학관", "floor": 3, "name": "301호",
      "capacity": 40, "tags": ["콘센트", "프로젝터"],
      "status": "empty", "freeUntil": "2026-11-06T17:00:00+09:00", "freeMinutes": 110,
      "classEndsAt": null, "currentTitle": null, "activeMeetupId": null
    },
    {
      "id": "eng-302", "buildingId": "eng", "buildingName": "공학관", "floor": 3, "name": "302호",
      "capacity": 60, "tags": ["프로젝터"],
      "status": "class", "freeUntil": null, "freeMinutes": 0,
      "classEndsAt": "2026-11-06T15:50:00+09:00", "currentTitle": "운영체제", "activeMeetupId": null
    },
    {
      "id": "eng-303", "buildingId": "eng", "buildingName": "공학관", "floor": 3, "name": "303호",
      "capacity": 30, "tags": ["콘센트", "화이트보드"],
      "status": "meetup", "freeUntil": "2026-11-06T22:00:00+09:00", "freeMinutes": 410,
      "classEndsAt": null, "currentTitle": "카공 모여라", "activeMeetupId": "demo-m1"
    }
  ]
}
''')


@router.get("/api/rooms/{roomId}")
def room_detail_stub(roomId: str) -> dict:
    return json.loads('''
{
  "at": "2026-11-06T15:10:00+09:00",
  "room": {
    "id": "eng-301", "buildingId": "eng", "buildingName": "공학관", "floor": 3, "name": "301호",
    "capacity": 40, "tags": ["콘센트", "프로젝터"],
    "status": "empty", "freeUntil": "2026-11-06T17:00:00+09:00", "freeMinutes": 110,
    "classEndsAt": null, "currentTitle": null, "activeMeetupId": null,
    "todaySchedule": [
      { "startAt": "2026-11-06T13:00:00+09:00", "endAt": "2026-11-06T14:15:00+09:00", "title": "자료구조" },
      { "startAt": "2026-11-06T17:00:00+09:00", "endAt": "2026-11-06T18:15:00+09:00", "title": "알고리즘" }
    ],
    "meetups": []
  }
}
''')
