"""Shared campus access: actual Firestore timetable, or explicit demo seed."""

import json
import os
from copy import deepcopy
from functools import lru_cache
from pathlib import Path
from threading import Lock

from .firestore_loader import load_firestore_campus

_SEED_PATH = Path(__file__).resolve().parent.parent / "seed" / "campus.json"
_LOAD_LOCK = Lock()


@lru_cache(maxsize=2)
def _load_source(source: str):
    if source == "firestore":
        campus = load_firestore_campus()
    elif source == "seed":
        with _SEED_PATH.open(encoding="utf-8") as seed_file:
            campus = json.load(seed_file)
    else:
        raise ValueError("CAMPUS_SOURCE는 firestore 또는 seed여야 합니다.")
    return (campus, {room["id"]: room for room in campus["rooms"]},
            {building["id"]: building for building in campus["buildings"]})


def _data():
    default_source = "seed" if os.environ.get("STORAGE") == "memory" else "firestore"
    source = os.environ.get("CAMPUS_SOURCE", default_source)
    with _LOAD_LOCK:
        return _load_source(source)


def load_campus() -> dict:
    """Call once at startup; cached until restart. Never silently fall back."""
    return deepcopy(_data()[0])


def get_room(room_id: str) -> dict | None:
    return deepcopy(_data()[1].get(room_id))


def get_building(building_id: str) -> dict | None:
    return deepcopy(_data()[2].get(building_id))


def list_rooms() -> list[dict]:
    return deepcopy(sorted(_data()[1].values(), key=lambda room: (
        room["buildingId"], room["floor"], room["name"]
    )))
