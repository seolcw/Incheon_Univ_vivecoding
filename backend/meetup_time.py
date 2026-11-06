"""모임 API의 한국 시각 처리. 조회 at만 분 단위로 자른다."""

from datetime import datetime, timedelta, timezone

from errors import ApiError

KST = timezone(timedelta(hours=9), name="Asia/Seoul")


def now_kst() -> datetime:
    return datetime.now(KST)


def parse_time(value: str, *, allow_naive: bool = False) -> datetime:
    try:
        if "T" not in value:
            raise ValueError("시각이 필요합니다.")
        result = datetime.fromisoformat(value)
        if result.tzinfo is None:
            if not allow_naive:
                raise ValueError("시간대가 필요합니다.")
            result = result.replace(tzinfo=KST)
        return result.astimezone(KST)
    except (TypeError, ValueError, OverflowError) as exc:
        raise ApiError("VALIDATION_ERROR", 400, "날짜와 시각을 ISO 8601 형식으로 입력해 주세요.") from exc


def query_time(value: str | None) -> datetime:
    return (parse_time(value, allow_naive=True) if value is not None else now_kst()).replace(second=0, microsecond=0)
