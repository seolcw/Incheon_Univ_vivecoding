"""직전 검색 조건과 최근 3턴을 잠시 메모리에 보관. DB·로그에 저장하지 않는다."""
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
            saved_date, expires, intent, _ = entry
            if saved_date != date or expires <= monotonic():
                self._entries.pop(user_id, None)
                return None
            return intent.model_copy() if intent else None

    def history(self, user_id: str, date: str) -> list[dict]:
        with self._lock:
            entry = self._entries.get(user_id)
            if entry is None:
                return []
            if entry[0] != date or entry[1] <= monotonic():
                self._entries.pop(user_id, None)
                return []
            return [message.copy() for message in entry[3]]

    def save(self, user_id: str, date: str, intent: SearchIntent, message: str = "", reply: str = "") -> None:
        with self._lock:
            old = self._entries.pop(user_id, None)
            old = old if old and old[0] == date and old[1] > monotonic() else None
            search = old[2] if old else None
            history = list(old[3]) if old else []
            if intent.intent == "search" and intent.building == "info" and not intent.needsClarification:
                search = intent.model_copy(update={"reply": ""})
            elif intent.intent == "search":
                search = None
            if message and reply:
                history.extend([{"role": "user", "content": message[:300]},
                                {"role": "assistant", "content": reply[:200]}])
            self._entries[user_id] = (date, monotonic() + self.ttl, search, history[-6:])
            while len(self._entries) > self.capacity:
                self._entries.popitem(last=False)
