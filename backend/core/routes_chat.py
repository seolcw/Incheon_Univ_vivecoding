"""Fixed contract examples only; no state calculation or AI calls."""

import json

from fastapi import APIRouter

router = APIRouter()


@router.post("/api/chat")
def chat_stub() -> dict:
    return json.loads('''
{
  "reply": "공학관 301호가 가장 가까워요. 17:00까지 비어 있고 콘센트가 있어서 2시간 공부하기 좋아요.",
  "recommendations": [
    {
      "roomId": "eng-301", "roomName": "301호", "buildingId": "eng", "buildingName": "공학관", "floor": 3,
      "status": "empty", "freeUntil": "2026-11-06T17:00:00+09:00", "freeMinutes": 110,
      "walkMinutes": 2, "reason": "17:00까지 비어 있고 콘센트가 있어 장시간 공부에 적합"
    },
    {
      "roomId": "eng-304", "roomName": "304호", "buildingId": "eng", "buildingName": "공학관", "floor": 3,
      "status": "empty", "freeUntil": "2026-11-06T22:00:00+09:00", "freeMinutes": 410,
      "walkMinutes": 2, "reason": "오늘 남은 수업이 없어 시간 제한 없이 사용 가능"
    }
  ],
  "source": "llm"
}
''')
