"""Load static campus data once; unknown IDs return None."""

import json
from copy import deepcopy
from pathlib import Path

_SEED_PATH = Path(__file__).resolve().parent.parent / "seed" / "campus.json"
with _SEED_PATH.open(encoding="utf-8") as seed_file:
    _CAMPUS = json.load(seed_file)
_ROOMS = {room["id"]: room for room in _CAMPUS["rooms"]}
_BUILDINGS = {building["id"]: building for building in _CAMPUS["buildings"]}


def get_room(room_id: str) -> dict | None:
    return deepcopy(_ROOMS.get(room_id))


def get_building(building_id: str) -> dict | None:
    return deepcopy(_BUILDINGS.get(building_id))


def list_rooms() -> list[dict]:
    return deepcopy(sorted(_ROOMS.values(), key=lambda room: (
        room["buildingId"], room["floor"], room["name"]
    )))
