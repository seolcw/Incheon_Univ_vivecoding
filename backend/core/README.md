
# 실제 시간표 검색 API - FE / be-a 전달

사용자가 2026-11-06에 실제 Firestore 사용을 선택했다. `classrooms.slots`는 **수업 시간**이다. 이번 구현은 SPEC v1의 가상 36개 강의실 및 10/6/3 집계와 혼합하지 않는다. `docs/SPEC.md`·`contracts/api.md`는 수정하지 않았다. 실제 데이터 전환 사항은 사람이 기준 문서에 반영해야 한다.

이 문서는 현재 브랜치의 API·데이터·서버 통합 인계 문서다. 기존 README, SPEC, 계약, 작업 로그, 프롬프트 기록을 확인해 여기에 연결 내용을 모았다. 구버전 `docs/course_search_api_implementation.md`는 삭제했다. `docs/prompts/pro-spec-v1.md`는 v1 작성 **요청문**이며 확정된 v1 원문이 아니다. 작업 이력은 `docs/log/be-b.md`, 사용자의 결정과 검증 근거는 `docs/prompts/be-b-real-data.md`에 남긴다.

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

이번 사용자 요청으로 `main.py`, `requirements.txt`, `.env.example`을 통합용으로 함께 저장한다. 삭제한 `core/api_support.py` 대신 계약의 `errors.ApiError(code, status, message)`를 `backend/errors.py`에 정의했다. A 쪽에도 동일 파일이 있으면 아래 연결을 기존 구현에 병합하고 중복 클래스를 만들지 않는다.

현재 main.py는 `/api/health`, 세 강의실 조회 API, `/api/chat` 계약 스텁을 등록한다. 422는 400 VALIDATION_ERROR, ApiError는 지정된 상태·코드, 없는 경로는 404 NOT_FOUND, 예상하지 못한 예외는 500 INTERNAL_ERROR로 응답한다. CORS는 지정 Origin의 GET·POST·OPTIONS와 Content-Type을 허용한다. 채팅 응답은 고정 예시이며 AI 호출이 아니다.

**아직 필요한 A 구현은 `meetup_repo.list_open(room_id=None)`와 모임 CRUD 라우터다. 현재 브랜치만으로 health·문서·채팅 스텁은 실행되지만, A repo가 없으면 강의실 조회는 INTERNAL_ERROR가 된다.** 오류를 빈 목록으로 숨기거나 임시 저장소를 중복 구현하지 않는다. 테스트의 대체 repo는 production 구현이 아니다.

repo는 과거·현재·예정에 관계없이 모든 open 모임을 camelCase·ISO 문자열·문서 ID로 반환한다. room_id가 있으면 해당 방만 반환하며 취소 모임은 제외한다. roomName·buildingName·floor·memberCount·isFull 같은 파생값은 B가 계산한다.

```python
# backend/meetup_repo.py에서 A가 제공할 인터페이스
def list_open(room_id: str | None = None) -> list[dict]:
    ...  # 실제 memory 또는 Firestore repo에 위임
```

반환 항목에는 `id`, `roomId`, `title`, `category`, `description`, `startAt`, `endAt`, `maxMembers`, `hostId`, `hostNickname`, `members`, `status`, `createdAt`이 필요하다. members 원소는 `userId`, `nickname`, `joinedAt`이다. 시각은 Timestamp 객체 대신 ISO 문자열로 반환한다.

```python
from core.routes_rooms import router as rooms_router
from core.routes_chat import router as chat_router
from core.seed_loader import load_campus
from core.availability import check_meetup_slot

# 현재 main.py에 이미 등록되어 있음. A의 main.py와 병합할 때 한 번씩만 유지.
app.include_router(rooms_router)  # 경로에 /api가 이미 있음; prefix 추가 금지
app.include_router(chat_router)  # 고정 응답 스텁, AI 완성 아님

# 현재는 첫 조회 시 로드. 시작 시 미리 읽으려면 A의 lifespan에 연결.
# async lifespan에서는 await run_in_threadpool(load_campus)를 사용.
load_campus()
```

시간표는 프로세스에서 한 번 로드하며 서버 재시작 때 다시 읽는다. 모임은 조회마다 A repo에서 읽는다. 자격증명·DB 오류 시 실제 데이터를 시드로 자동 대체하지 않는다.

`check_meetup_slot(room_id, start_at, end_at, open_meetups)`는 A가 방·입력·날짜·운영 시간·15~240분을 검증한 뒤 호출한다. 같은 방의 모든 open 모임을 전달한다. 겹치면 한국어 사유, 허용이면 None이다. A가 사유를 `409 ROOM_OCCUPIED`로 변환한다. cancelled·경계 접촉은 충돌로 보지 않는다.

실데이터 모임 시연은 `/api/rooms`에서 받은 실제 roomId로 진행해야 한다. `eng-301`, `eng-303`, 기존 demo-m1 시드는 이번 실제 데이터와 맞지 않는다. A의 시드·FE의 선택 ID를 함께 조정해야 한다.

### 병합 순서와 확인 사항

1. B의 `db.py`, `core/`, 테스트 변경을 반영한다. A의 기존 `main.py`·`errors.py`·requirements가 있으면 통째로 덮어쓰지 않고 필요한 import·핸들러·버전을 합친다.
2. `errors.ApiError`를 서버와 모든 라우터가 같은 모듈 경로로 import하도록 한다. `uvicorn main:app --app-dir backend` 실행에서는 `errors`/`core`, 패키지 방식에서는 `backend.errors`/`backend.core`를 사용하며 두 방식을 한 프로세스에서 섞지 않는다.
3. A의 repo.list_open을 연결하고 모임 라우터를 한 번 등록한다. B 라우터에는 이미 `/api`가 있으므로 추가 prefix를 붙이지 않는다. 기존 A의 app lifespan·repo 초기화는 보존한다.
4. 모임 생성은 A가 입력·방 존재·운영 시간·기간을 검증한 뒤 같은 방의 모든 open 모임을 B의 check_meetup_slot에 전달한다. 사유가 있으면 `raise ApiError("ROOM_OCCUPIED", 409, reason)`로 반환한다.
5. 실제 데이터에서는 FE의 건물·호수 선택 목록을 API로 로드한다. `row_*` roomId, 정원·좌표 미등록 값, 지하 층을 처리한다. 시연 모임 ID와 실제 roomId의 연결을 확인한다.
6. 통합 서버에서 아래 검증을 한 번 수행한다. health 200은 repo/Firestore 준비 완료를 뜻하지 않는다.

| 검증 | 기대 |
| --- | --- |
| `/api/rooms?buildingId=15&status=empty&minFreeMinutes=60&at=2026-11-06T15%3A10%3A00%2B09%3A00` | 실제 DB 기반 200. 저장된 검증 당시 결과는 22개이며 수업·모임 데이터 변경 시 달라질 수 있음 |
| 위 응답의 roomId로 상세 조회 | todaySchedule·현재/예정 모임·상태 일치 |
| 없는 방 / 잘못된 floor 또는 at | 404 NOT_FOUND / 400 VALIDATION_ERROR, 공통 error 객체 |
| FE Origin으로 GET·POST preflight | CORS 허용 Origin·메서드·Content-Type 확인 |
| 수업 또는 두 번째 open 모임과 1분 겹치게 생성 | 실제 모임 라우터가 409 ROOM_OCCUPIED 반환 |
| 노트북 생성→폰 참여 | 201→200, 1/4→2/4, 다른 기기 10초 폴링 갱신 |

## 환경·의존성·실행

실제 조회: `STORAGE=firestore`, `CAMPUS_SOURCE=firestore`, `FIREBASE_SERVICE_ACCOUNT_JSON`.

`.env.example`은 변수 이름 목록이며 자동으로 로드되지 않는다. PowerShell 또는 배포 환경에 값을 설정한다. `CORS_ORIGINS`에는 `http://localhost:3000`과 실제 Vercel Origin을 쉼표로 연결한다(경로·끝 `/` 없음). 프론트 `NEXT_PUBLIC_API_URL`은 백엔드 Origin이며 변경하면 프론트를 다시 빌드한다. 프론트 변수는 이 서버의 .env.example에 넣지 않는다.

`CAMPUS_SOURCE` 미지정 시 STORAGE=memory는 기존 로컬 seed, 그 외에는 firestore다. 실제 시간표를 사용하면서 memory 모임 저장소를 쓰는 혼합 모드는 지원하지 않는다. 데모 seed는 이전 v0 자료이며 이번 실데이터 검증 및 v1 집계와 별개다.

키를 환경 변수로 읽는 PowerShell 예(실제 키 파일은 저장소 밖에서 A에게 안전한 경로로 전달):

```powershell
.\.venv\Scripts\python -m pip install -r backend\requirements.txt
$env:FIREBASE_SERVICE_ACCOUNT_JSON = Get-Content -LiteralPath 'C:\실제경로\서비스계정.json' -Raw -Encoding utf8
$env:STORAGE = 'firestore'
$env:CAMPUS_SOURCE = 'firestore'
$env:CORS_ORIGINS = 'http://localhost:3000'
# A의 meetup_repo.py와 모임 라우터가 통합된 후 전체 기능 검증
.\.venv\Scripts\python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000
```

로컬 검증 버전: Python 3.12.13, fastapi 0.162.0, pydantic 2.14.3, firebase-admin 7.7.0, httpx 0.28.1(테스트), uvicorn 0.34.0. requirements.txt에는 이 버전을 고정했다. 추가 설치는 없다. FastAPI Query 모델을 사용하므로 구버전으로 내릴 때 호환성을 확인해야 한다. Render의 Root Directory는 `backend`, Build는 `pip install -r requirements.txt`, Start는 `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1`이다. 배포·모임 repo 운영 책임은 A에게 있다.

## 확인된 범위와 통합 대기

- 기존 핵심 테스트 16개에 실제 main 앱의 라우터·공통 오류·POST CORS 연결 확인을 추가하여 총 17개가 통과했다. 실행: `.venv\Scripts\python -m unittest backend.tests.test_core -v`. 공통 오류는 실제 errors.ApiError를 사용하며 A repo는 테스트에서 명시적으로 대체한다. 별도 uvicorn 프로세스를 memory 모드로 기동해 /api/health 200을 확인한 후 종료했다.
- 실제 Firestore를 읽어 B의 세 조회 라우터를 TestClient로 확인. 실제 `meetups` 컬렉션이 비어 있음을 확인한 뒤 조회 테스트에 빈 목록을 주입했다. production A repo 연동 확인을 뜻하지 않는다.
- A의 모임 라우터가 아직 로컬·공유 be-a 브랜치에 없어 POST 409, 생성·참여, 두 기기 10초 갱신, 배포 CORS는 미확인이다.
- 이번 후속 요청으로 main.py·errors.py·requirements.txt·.env.example을 커밋에 포함한다. 삭제한 api_support.py를 참조하지 않는다. A가 기존 공통 파일을 보유한 경우 위 병합 순서대로 결합한다. 발표 파일·생성 스크립트·임시 산출물은 사용자 요청으로 삭제했으며 이 인계에 포함되지 않는다.
