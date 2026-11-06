"""Firebase initialization shared with the meetup repository."""

import json
import os
from functools import lru_cache
from threading import Lock

_INIT_LOCK = Lock()


def get_client():
    """Return a shared Firestore client, or None in memory mode."""
    if os.environ.get("STORAGE", "firestore") == "memory":
        return None
    with _INIT_LOCK:
        return _get_firestore_client()


@lru_cache(maxsize=1)
def _get_firestore_client():
    import firebase_admin
    from firebase_admin import credentials, firestore

    service_account = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    if not service_account:
        raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_JSON 환경 변수가 필요합니다.")
    try:
        app = firebase_admin.get_app()
    except ValueError:
        credential = credentials.Certificate(json.loads(service_account))
        app = firebase_admin.initialize_app(credential)
    return firestore.client(app=app)
