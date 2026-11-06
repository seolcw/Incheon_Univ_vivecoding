"""짧은 후속 답변용 검색 조건만 보관. 원문·추천 결과·개인정보는 저장하지 않는다."""
from collections import OrderedDict
from threading import Lock
from time import monotonic

from .llm import SearchIntent


class ChatContexts:
    def __init__(self, ttl: float = 600, capacity: int = 256):
        self.ttl, self.capacity = ttl, capacity
        self._entries = OrderedDict()
        self._lock = Lock()

    def get(self, user_id: str, date: str) -> SearchIntent | None:
        with self._lock:
            entry = self._entries.get(user_id)
            if entry is None:
                return None
            saved_date, expires, intent = entry
            if saved_date != date or expires <= monotonic():
                self._entries.pop(user_id, None)
                return None
            return intent.model_copy()

    def save(self, user_id: str, date: str, intent: SearchIntent) -> None:
        with self._lock:
            self._entries.pop(user_id, None)
            if intent.intent == "search" and intent.building == "info" and not intent.needsClarification:
                self._entries[user_id] = (date, monotonic() + self.ttl, intent.model_copy())
                while len(self._entries) > self.capacity:
                    self._entries.popitem(last=False)
