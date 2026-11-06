"""정보대 공식 지도 좌표와 직선거리 환산. 사용자 좌표 저장/로그/AI 전송 없음."""
from math import asin, ceil, cos, radians, sin, sqrt

# 인천대 공식 캠퍼스맵, 2026-11-06 확인. artclSeq=15 (7호관).
# https://www.inu.ac.kr/inu/739/subview.do
# POST https://www.inu.ac.kr/campusMap/inu/8/artclList.do
INFO_LAT = 37.374672662043295
INFO_LNG = 126.63374918297687


def walking_minutes(location: dict | None) -> tuple[int | None, bool]:
    if location is None:
        return None, False
    lat, lng = radians(location["lat"]), radians(location["lng"])
    target_lat, target_lng = radians(INFO_LAT), radians(INFO_LNG)
    a = sin((target_lat - lat) / 2) ** 2 + cos(lat) * cos(target_lat) * sin((target_lng - lng) / 2) ** 2
    meters = round(6371000 * 2 * asin(sqrt(min(1.0, max(0.0, a)))), 6)
    return (None, True) if meters > 2000 else (ceil(meters / 80), False)
