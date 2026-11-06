"""정보대 횃불ON: 실제 시간표와 모임에 근거한 추천."""
from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from .availability import parse_at
from .meetup_reader import list_open_meetups
from .recommend import recommend, resolve_intent
from .routes_rooms import _api_error

router = APIRouter(tags=["횃불ON"])

class Location(BaseModel):
    lat: float = Field(ge=-90, le=90, allow_inf_nan=False)
    lng: float = Field(ge=-180, le=180, allow_inf_nan=False)

class ChatRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, str_strip_whitespace=True)
    user_id: str = Field(min_length=1, max_length=64)
    message: str = Field(min_length=1, max_length=300)
    location: Location | None
    at: str | None = None

@router.post("/api/chat")
def chat(body: ChatRequest, request: Request) -> dict:
    try:
        at = parse_at(body.at)
    except (ValueError, OverflowError):
        raise _api_error("VALIDATION_ERROR", 400, "시각을 ISO 8601 형식으로 입력해 줘.") from None
    contexts = request.app.state.chat_contexts
    date = at.date().isoformat()
    resolved = resolve_intent(body.message, contexts.get(body.user_id, date), history=contexts.history(body.user_id, date))
    meetups = list_open_meetups() if resolved[0].intent == "search" else []
    result = recommend(body.message, at, meetups, has_location=body.location is not None, resolved=resolved)
    contexts.save(body.user_id, date, resolved[0], body.message, result["reply"])
    return result
