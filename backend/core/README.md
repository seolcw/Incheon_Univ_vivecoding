
# 실제 시간표 검색 API - FE / be-a 전달

사용자가 2026-11-06에 실제 Firestore 사용을 선택했다. `classrooms.slots`는 **수업 시간**이다. 이번 구현은 SPEC v1의 가상 36개 강의실 및 10/6/3 집계와 혼합하지 않는다. `docs/SPEC.md`·`contracts/api.md`는 수정하지 않았다. 실제 데이터 전환 사항은 사람이 기준 문서에 반영해야 한다.

## 데이터 기준

- Firestore `classrooms`: `buildingNo`, `buildingName`, `roomNo`, `day`, `slots[{start,end}]`. 같은 건물·호수의 수업을 하나로 모은다. 중복·중첩 수업 구간은 합친다.
- `buildingId`는 건물 번호 문자열(`"15"` 등). `id`는 그 강의실에 속한 Firestore 문서 ID 중 사전순 첫 ID(`"row_00180"` 등). 프론트와 모임 저장소는 API가 반환한 ID를 사용한다. 원본 문서를 삭제·재수입하면 ID가 바뀔 수 있으므로 기존 모임과 함께 이관해야 한다.
- 호수 접미사와 지하 호수 보존: `118A호`, `117C-1호`, `B103호`. 층은 호수 규칙으로 도출하며 `B103`은 `-1`이다. 실제 층 배치 검증 자료는 DB에 없다.
- 요일 또는 수업 구간이 잘못된 행이 있으면 **해당 공간 전체를 검색에서 제외**한다. 건물·호수 자체가 없는 문서는 전체 로딩을 실패시켜 부정확한 결과를 막는다.
- 2026-11-06 실조회: 2,834행 / 원본 공간 375개 / 제외 29개 / 검색 가능 346개 / 건물 20개. `live_verification.json`은 키를 포함하지 않은 검증 기록이다.
- 정원·시설·위경도는 원본에 없다. 기존 필드 타입을 유지하기 위해 `capacity=0`, `tags=[]`, `lat=0`, `lng=0`은 **미등록 값**으로 사용한다. FE는 정원 0명을 표시하거나 `(0,0)`을 지도에 찍지 말고 해당 정보를 숨긴다. `map`은 정렬된 건물을 격자로 배치한 개략도이며 실제 캠퍼스 위치가 아니다. 정원·좌표로 추천하거나 거리 계산하는 기능은 구현하지 않았다.
- 원본에 강의명이 없어 시간표 `title`은 `수업`이다. 실제 토요일 수업도 적용한다. 수업 없는 요일은 수업 시간표 기준으로 비어 있다고 계산한다.
- 운영 시간은 기존 계약의 매일 09:00~22:00이다. 이 API는 수업 시간표와 모임을 계산하며 현장 점유를 측정하지 않는다.

## 프론트 조회

| 메서드 | 경로 | 용도 |
| --- | --- | --- |
| GET | `/api/buildings?at=` | 실제 건물 ID·이름·층·상태 집계 |
| GET | `/api/rooms?buildingId=&floor=&status=&minFreeMinutes=&at=` | 조건에 맞는 강의실 |
| GET | `/api/rooms/{roomId}?at=` | 상태·오늘 시간표·진행/예정 모임 |

`at`은 ISO 8601 시각이며 생략하면 서울 현재 시각, 오프셋이 없으면 서울 시각으로 해석한다. 초·소수초는 버린다. `floor`는 정수, `minFreeMinutes`는 0~600이다. `status`는 `empty/meetup/class/closed`이며 빈방만 찾으면 `empty`를 지정한다. 일치하는 방이 없으면 `200`과 `rooms: []`다. 건물·방이 없으면 `404 NOT_FOUND`, 잘못된 조건은 `400 VALIDATION_ERROR`다.

```ts
const params = new URLSearchParams({
  buildingId: "15", // /api/buildings에서 선택한 ID
  status: "empty",
  minFreeMinutes: "60",
  at: "2026-11-06T15:10:00+09:00",
});
const baseUrl = process.env.NEXT_PUBLIC_API_URL; // Next.js
const response = await fetch(`${baseUrl}/api/rooms?${params}`);
const data = await response.json();
if (!response.ok) throw new Error(data.error.message);
// data.rooms.map(room => `${room.buildingName} ${room.name}`)
```

Vite React는 환경 변수 접근을 `import.meta.env.VITE_API_URL`로 바꾼다. `URLSearchParams`로 시간대의 `+`를 인코딩한다. 서비스 계정은 백엔드에만 둔다.

실제 조회 예: 15호관 인문대학, 금 15:10, 60분 이상 → 22개. 응답의 첫 항목:

```json
{
  "at": "2026-11-06T15:10:00+09:00",
  "rooms": [{
    "id": "row_00180", "buildingId": "15", "buildingName": "인문대학",
    "floor": 1, "name": "102호", "capacity": 0, "tags": [],
    "status": "empty", "freeUntil": "2026-11-06T22:00:00+09:00",
    "freeMinutes": 410, "classEndsAt": null,
    "currentTitle": null, "activeMeetupId": null
  }]
}
```

위 예시는 22개 중 첫 항목만 발췌했다. 상세의 `todaySchedule`은 시작 순서, `meetups`는 같은 강의실의 open 모임 중 `endAt > at`인 항목을 시작 순으로 반환한다. 모임은 독점 예약이 아니므로 `freeUntil`은 다음 **수업** 또는 폐관까지다. 건물의 `emptyCount`는 `empty + meetup`이다.

## be-a 연결

필요한 A 인터페이스는 `errors.ApiError(code, status, message)` 및 `meetup_repo.list_open(room_id=None)`다. repo는 모든 open 모임을 camelCase·ISO 문자열·문서 ID로 반환한다. B는 A의 repo로 위임하며 별도 저장소나 모임 CRUD를 구현하지 않는다. A 모듈이 없을 때 빈 목록으로 숨기지 않는다.

```python
from core.routes_rooms import router as rooms_router
from core.routes_chat import router as chat_router
from core.seed_loader import load_campus
from core.availability import check_meetup_slot

# main.py에서 A가 등록
app.include_router(rooms_router)  # 경로에 /api가 이미 있음; prefix 추가 금지
app.include_router(chat_router)  # 고정 응답 스텁, AI 완성 아님

# 서버 시작 시 한 번 호출 권장. async lifespan에서는 run_in_threadpool 사용.
load_campus()
```

시간표는 프로세스에서 한 번 로드하며 서버 재시작 때 다시 읽는다. 모임은 조회마다 A repo에서 읽는다. 자격증명·DB 오류 시 실제 데이터를 시드로 자동 대체하지 않는다.

`check_meetup_slot(room_id, start_at, end_at, open_meetups)`는 A가 방·입력·날짜·운영 시간·15~240분을 검증한 뒤 호출한다. 같은 방의 모든 open 모임을 전달한다. 겹치면 한국어 사유, 허용이면 None이다. A가 사유를 `409 ROOM_OCCUPIED`로 변환한다. cancelled·경계 접촉은 충돌로 보지 않는다.

실데이터 모임 시연은 `/api/rooms`에서 받은 실제 roomId로 진행해야 한다. `eng-301`, `eng-303`, 기존 demo-m1 시드는 이번 실제 데이터와 맞지 않는다. A의 시드·FE의 선택 ID를 함께 조정해야 한다.

## 환경·의존성·실행

실제 조회: `STORAGE=firestore`, `CAMPUS_SOURCE=firestore`, `FIREBASE_SERVICE_ACCOUNT_JSON`.

`CAMPUS_SOURCE` 미지정 시 STORAGE=memory는 기존 로컬 seed, 그 외에는 firestore다. 실제 시간표를 사용하면서 memory 모임 저장소를 쓰는 혼합 모드는 지원하지 않는다. 데모 seed는 이전 v0 자료이며 이번 실데이터 검증 및 v1 집계와 별개다.

키를 환경 변수로 읽는 PowerShell 예(실제 키 파일은 저장소 밖에서 A에게 안전한 경로로 전달):

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_JSON = Get-Content -LiteralPath 'C:\실제경로\서비스계정.json' -Raw -Encoding utf8
$env:STORAGE = 'firestore'
$env:CAMPUS_SOURCE = 'firestore'
# A의 main.py·errors.py·meetup_repo.py가 통합된 후 실행
.\.venv\Scripts\python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000
```

로컬 검증 버전: Python 3.12.13, fastapi 0.162.0, pydantic 2.14.3, firebase-admin 7.7.0, httpx 0.28.1(테스트), uvicorn 0.34.0(앞선 작업에서 설치). 이번 B 작업의 추가 설치는 없다. requirements.txt·CORS·라우터 등록은 A가 반영한다. FastAPI Query 모델을 사용하므로 구버전으로 내릴 때 호환성을 확인해야 한다.

## 확인된 범위와 통합 대기

- `.venv\Scripts\python -m unittest backend.tests.test_core -v`: 16개 통과. 시간 경계·겹침·취소·필터·정렬·404/400·실제 스키마 변환·repo 호출 계약 확인. A 인터페이스는 테스트에서 명시적으로 대체했다.
- 실제 Firestore를 읽어 B의 세 조회 라우터를 TestClient로 확인. 실제 `meetups` 컬렉션이 비어 있음을 확인한 뒤 조회 테스트에 빈 목록을 주입했다. production A repo 연동 확인을 뜻하지 않는다.
- A의 모임 라우터가 아직 로컬·공유 be-a 브랜치에 없어 POST 409, 생성·참여, 두 기기 10초 갱신, 배포 CORS는 미확인이다.
- 이전 요청의 예외 승인으로 만든 미추적 main.py·requirements.txt·.env.example·api_support.py는 이번 B 커밋에 포함하지 않는다. 실제 통합은 A 소유 파일을 사용한다.
