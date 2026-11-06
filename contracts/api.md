# API 명세 v0 — 빈강

2026-11-06 10:45 고정. 변경은 사람이 승인한 뒤 이 파일을 직접 고친다(AGENTS.md). 설계 배경은 `docs/SPEC.md`.

## 1. 공통 규칙

| 항목 | 규칙 |
| --- | --- |
| Base URL | 프론트는 `NEXT_PUBLIC_API_URL`(예: `https://bingang-api.onrender.com`, 로컬 `http://localhost:8000`)에 경로를 붙인다. 값 끝에 `/` 없음 |
| 경로 | 모두 `/api/`로 시작 |
| JSON | camelCase, UTF-8. 백엔드 Pydantic은 `alias_generator=to_camel, populate_by_name=True` |
| 시각 | ISO 8601, 오프셋 포함 `2026-11-06T15:10:00+09:00`. 서버 계산은 Asia/Seoul. Firestore에는 Timestamp로 저장하고 응답에서 ISO로 변환 |
| `at` | 상태를 계산하는 조회의 선택 쿼리(또는 본문 필드). ISO 8601, 오프셋 없으면 +09:00으로 해석, 초 이하 버림. 없으면 서버 현재 시각. 응답의 `at`에 해석한 값을 돌려준다. 쿼리에서 `+`는 `%2B`로 인코딩(`URLSearchParams`가 처리) |
| id | 문자열. 정적 데이터는 시드의 id(`eng`, `eng-301`), 모임은 Firestore 문서 ID |
| 사용자 | 로그인 없음. 본문의 `userId`(1–64자, 프론트가 `crypto.randomUUID()`로 만들어 localStorage 보관)와 `nickname`(1–12자) |
| 성공 | GET·동작 200, 생성 201. 응답은 항상 객체 |
| 에러 | `{"error":{"code":"ERROR_CODE","message":"화면에 보여줄 한국어 문장"}}`. FastAPI 기본 `detail`·422도 이 형식으로 변환 |
| CORS | `CORS_ORIGINS`에 `http://localhost:3000`과 Vercel 주소(경로·끝 `/` 없이), 쉼표 구분 |
| 목록 | 페이지네이션 없음(강의실 36, 모임 ≤ 200) |

### 환경 변수

| 위치 | 변수 | 값 |
| --- | --- | --- |
| frontend | `NEXT_PUBLIC_API_URL` | 백엔드 주소. 빌드 시 고정, 바꾸면 재배포 |
| frontend | `NEXT_PUBLIC_USE_MOCK` | `1`이면 `src/mocks/` 응답 사용 + 헤더 MOCK 배지 |
| backend | `FIREBASE_SERVICE_ACCOUNT_JSON` | 서비스 계정 JSON 문자열 |
| backend | `STORAGE` | `firestore`(기본) / `memory` |
| backend | `CORS_ORIGINS` | 쉼표 구분 Origin 목록 |
| backend | `OPENAI_API_KEY`, `OPENAI_MODEL` | `/api/chat` 전용. 모델 기본 `gpt-4o-mini`. 키가 없으면 fallback만 동작 |
| backend | `TZ` | `Asia/Seoul` |

## 2. 에러 코드 표

| code | HTTP | 언제 |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | 필수 필드 누락, 타입·범위·형식 오류, `at` 파싱 실패, 시간 규칙 위반(같은 날짜·운영 시간·15–240분) |
| `NOT_FOUND` | 404 | `buildingId`/`roomId`/`meetupId`가 없음 |
| `FORBIDDEN` | 403 | 주최자가 아닌 사용자의 취소 |
| `ROOM_OCCUPIED` | 409 | 모임 시간이 수업 또는 같은 강의실의 다른 open 모임과 겹침 |
| `MEETUP_FULL` | 409 | 정원이 찬 모임에 참여 |
| `MEETUP_CLOSED` | 409 | 취소됐거나 `endAt`이 지난 모임에 참여·나가기 |
| `NOT_MEMBER` | 409 | 참여하지 않은 모임에서 나가기 |
| `HOST_CANNOT_LEAVE` | 409 | 주최자가 나가기(취소를 써야 함) |
| `AI_UNAVAILABLE` | 503 | LLM과 규칙 기반 fallback이 모두 실패 |
| `INTERNAL_ERROR` | 500 | 그 외 예외 |

에러 예시:

```json
{ "error": { "code": "ROOM_OCCUPIED", "message": "15:50까지 운영체제 수업이 있는 시간이에요. 16:00 이후로 잡아 주세요." } }
```

## 3. 공통 타입

### Building / BuildingSummary

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | string | 시드 id |
| name | string | 건물명 |
| lat, lng | number | 위도·경도(거리 계산용) |
| floors | number[] | 오름차순 |
| map | {x, y, w, h: number} | 캠퍼스 SVG viewBox 0–100 기준 블록 위치·크기 |
| totalCount | number | 건물의 강의실 수 |
| emptyCount | number | status가 `empty` 또는 `meetup`인 강의실 수 |
| meetupCount | number | status가 `meetup`인 강의실 수 |
| floorSummary | {floor, totalCount, emptyCount, meetupCount}[] | 층별 |

### RoomStatus

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | string | `"eng-301"` |
| buildingId, buildingName | string | |
| floor | number | |
| name | string | `"301호"` |
| capacity | number | |
| tags | string[] | 예: `"콘센트"`, `"프로젝터"`, `"화이트보드"`, `"창가"` |
| status | `"empty"` / `"meetup"` / `"class"` / `"closed"` | |
| freeUntil | string \| null | empty·meetup: 다음 수업 시작 또는 폐관(22:00). class·closed: null |
| freeMinutes | number | `at`부터 `freeUntil`까지 분. class·closed: 0 |
| classEndsAt | string \| null | class일 때 수업 종료 시각 |
| currentTitle | string \| null | class: 수업명, meetup: 모임 제목, 그 외 null |
| activeMeetupId | string \| null | meetup일 때 진행 중 모임 id |

**상태 계산 규칙** (`backend/core/availability.py`, 시각 t = `at`)

1. t가 그날 09:00 이전이거나 22:00 이후 → `closed`.
2. 그날 요일(ISO)의 `schedule` 중 `startTime ≤ t < endTime`인 수업이 있으면 → `class`, `classEndsAt` = 그 `endTime`.
3. 아니면 `freeUntil` = t 이후 첫 수업 `startTime`, 없으면 그날 22:00. `freeMinutes` = 내림(분).
4. 그 강의실의 open 모임 중 `startAt ≤ t < endAt`인 것이 있으면 → `meetup`(`currentTitle`, `activeMeetupId` 채움), 없으면 `empty`.
5. 주말은 수업이 없으므로 운영 시간 안에서는 전부 `empty`(또는 `meetup`).

### RoomDetail = RoomStatus +

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| todaySchedule | {startAt, endAt: string, title: string}[] | `at` 날짜의 수업, ISO 시각으로 변환, 시작 순 |
| meetups | Meetup[] | 이 강의실의 open 모임 중 `endAt > at`, `startAt` 순 |

### Meetup

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | string | Firestore 문서 ID |
| roomId, roomName, buildingId, buildingName | string | roomName·building*은 정적 데이터에서 파생 |
| floor | number | 파생 |
| title | string | 1–30자 |
| category | `"study"` / `"project"` / `"social"` / `"etc"` | 화면 표기: 공부 / 팀플 / 친목 / 기타 |
| description | string | 0–200자, 기본 `""` |
| startAt, endAt | string | ISO |
| maxMembers | number | 2–30 |
| hostId, hostNickname | string | |
| members | {userId, nickname: string, joinedAt: string}[] | 주최자가 첫 번째 |
| memberCount | number | `members.length` |
| isFull | boolean | `memberCount >= maxMembers` |
| status | `"open"` / `"cancelled"` | |
| createdAt | string | ISO |

### Recommendation (`/api/chat`)

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| roomId, roomName, buildingId, buildingName | string | |
| floor | number | |
| status | `"empty"` / `"meetup"` | 추천 시점 상태 |
| freeUntil | string | |
| freeMinutes | number | |
| walkMinutes | number \| null | 위치가 있을 때 건물까지 도보 분(80 m/분, 올림), 없으면 null |
| reason | string | 60자 이내 한국어 |

## 4. 엔드포인트

### GET /api/health

응답 200

```json
{ "status": "ok", "storage": "firestore", "time": "2026-11-06T15:10:00+09:00", "version": "0.1.0" }
```

에러: 없음(500이면 서버 미기동).

### GET /api/buildings

쿼리: `at`(선택)

응답 200

```json
{
  "at": "2026-11-06T15:10:00+09:00",
  "buildings": [
    {
      "id": "eng",
      "name": "공학관",
      "lat": 37.5508,
      "lng": 127.0743,
      "floors": [1, 2, 3],
      "map": { "x": 8, "y": 14, "w": 30, "h": 22 },
      "totalCount": 12,
      "emptyCount": 7,
      "meetupCount": 1,
      "floorSummary": [
        { "floor": 1, "totalCount": 4, "emptyCount": 2, "meetupCount": 0 },
        { "floor": 2, "totalCount": 4, "emptyCount": 2, "meetupCount": 0 },
        { "floor": 3, "totalCount": 4, "emptyCount": 3, "meetupCount": 1 }
      ]
    }
  ]
}
```

에러: `VALIDATION_ERROR`(at)

### GET /api/rooms

쿼리: `buildingId`(선택), `floor`(선택, 정수), `status`(선택: empty/meetup/class/closed), `minFreeMinutes`(선택, 0–600, `freeMinutes ≥ 값`인 것만), `at`(선택). 정렬: buildingId, floor, name.

요청 예: `GET /api/rooms?buildingId=eng&floor=3&at=2026-11-06T15%3A10%3A00%2B09%3A00`

응답 200

```json
{
  "at": "2026-11-06T15:10:00+09:00",
  "rooms": [
    {
      "id": "eng-301", "buildingId": "eng", "buildingName": "공학관", "floor": 3, "name": "301호",
      "capacity": 40, "tags": ["콘센트", "프로젝터"],
      "status": "empty", "freeUntil": "2026-11-06T17:00:00+09:00", "freeMinutes": 110,
      "classEndsAt": null, "currentTitle": null, "activeMeetupId": null
    },
    {
      "id": "eng-302", "buildingId": "eng", "buildingName": "공학관", "floor": 3, "name": "302호",
      "capacity": 60, "tags": ["프로젝터"],
      "status": "class", "freeUntil": null, "freeMinutes": 0,
      "classEndsAt": "2026-11-06T15:50:00+09:00", "currentTitle": "운영체제", "activeMeetupId": null
    },
    {
      "id": "eng-303", "buildingId": "eng", "buildingName": "공학관", "floor": 3, "name": "303호",
      "capacity": 30, "tags": ["콘센트", "화이트보드"],
      "status": "meetup", "freeUntil": "2026-11-06T22:00:00+09:00", "freeMinutes": 410,
      "classEndsAt": null, "currentTitle": "카공 모여라", "activeMeetupId": "demo-m1"
    }
  ]
}
```

에러: `VALIDATION_ERROR`(floor·status·minFreeMinutes·at), `NOT_FOUND`(buildingId)

### GET /api/rooms/{roomId}

쿼리: `at`(선택)

응답 200

```json
{
  "at": "2026-11-06T15:10:00+09:00",
  "room": {
    "id": "eng-301", "buildingId": "eng", "buildingName": "공학관", "floor": 3, "name": "301호",
    "capacity": 40, "tags": ["콘센트", "프로젝터"],
    "status": "empty", "freeUntil": "2026-11-06T17:00:00+09:00", "freeMinutes": 110,
    "classEndsAt": null, "currentTitle": null, "activeMeetupId": null,
    "todaySchedule": [
      { "startAt": "2026-11-06T13:00:00+09:00", "endAt": "2026-11-06T14:15:00+09:00", "title": "자료구조" },
      { "startAt": "2026-11-06T17:00:00+09:00", "endAt": "2026-11-06T18:15:00+09:00", "title": "알고리즘" }
    ],
    "meetups": []
  }
}
```

에러: `NOT_FOUND`, `VALIDATION_ERROR`(at)

### GET /api/meetups

쿼리: `roomId`(선택), `buildingId`(선택), `includePast`(선택, `true`/`false`, 기본 false → `status == "open"`이고 `endAt > at`인 것만), `at`(선택). 정렬: `startAt` 오름차순.

응답 200

```json
{
  "meetups": [
    {
      "id": "demo-m1",
      "roomId": "eng-303", "roomName": "303호", "buildingId": "eng", "buildingName": "공학관", "floor": 3,
      "title": "카공 모여라", "category": "study", "description": "조용히 각자 공부해요. 콘센트 자리 있음",
      "startAt": "2026-11-06T15:00:00+09:00", "endAt": "2026-11-06T17:00:00+09:00",
      "maxMembers": 4,
      "hostId": "u-demo-host", "hostNickname": "민지",
      "members": [
        { "userId": "u-demo-host", "nickname": "민지", "joinedAt": "2026-11-06T14:58:00+09:00" }
      ],
      "memberCount": 1, "isFull": false, "status": "open",
      "createdAt": "2026-11-06T14:58:00+09:00"
    }
  ]
}
```

에러: `VALIDATION_ERROR`(includePast·at), `NOT_FOUND`(roomId·buildingId)

### POST /api/meetups

요청

```json
{
  "roomId": "eng-301",
  "title": "카공 모여라",
  "category": "study",
  "description": "조용히 각자 공부, 콘센트 자리 있어요",
  "startAt": "2026-11-06T15:10:00+09:00",
  "endAt": "2026-11-06T17:00:00+09:00",
  "maxMembers": 4,
  "userId": "7c2e1b9a-5d3f-4e8a-9b1c-2f6d8a4e0c11",
  "nickname": "민지"
}
```

검증(순서대로): 필수 필드·타입·길이(`VALIDATION_ERROR`) → `roomId` 존재(`NOT_FOUND`) → `startAt`·`endAt`이 같은 날짜, 09:00 ≤ startAt < endAt ≤ 22:00, 15분 ≤ 길이 ≤ 240분(`VALIDATION_ERROR`) → `core.availability.check_meetup_slot`로 수업·open 모임 겹침(`ROOM_OCCUPIED`). `description` 생략 시 `""`. 과거 시각 제한은 없다(시연 시각 고정 때문).

응답 201

```json
{
  "meetup": {
    "id": "Zk3pQ9vL2mN8xR1t",
    "roomId": "eng-301", "roomName": "301호", "buildingId": "eng", "buildingName": "공학관", "floor": 3,
    "title": "카공 모여라", "category": "study", "description": "조용히 각자 공부, 콘센트 자리 있어요",
    "startAt": "2026-11-06T15:10:00+09:00", "endAt": "2026-11-06T17:00:00+09:00",
    "maxMembers": 4,
    "hostId": "7c2e1b9a-5d3f-4e8a-9b1c-2f6d8a4e0c11", "hostNickname": "민지",
    "members": [
      { "userId": "7c2e1b9a-5d3f-4e8a-9b1c-2f6d8a4e0c11", "nickname": "민지", "joinedAt": "2026-11-06T15:09:40+09:00" }
    ],
    "memberCount": 1, "isFull": false, "status": "open",
    "createdAt": "2026-11-06T15:09:40+09:00"
  }
}
```

에러: `VALIDATION_ERROR`, `NOT_FOUND`, `ROOM_OCCUPIED`

### GET /api/meetups/{meetupId}

응답 200: `{ "meetup": Meetup }` (위와 같은 형태). 취소된 모임도 반환한다.

에러: `NOT_FOUND`

### POST /api/meetups/{meetupId}/join

요청

```json
{ "userId": "a1f4c6e2-8b7d-4c3a-9e5f-1d2b3c4d5e6f", "nickname": "준호" }
```

규칙: 이미 멤버면 변경 없이 200(멱등). `status != "open"` 또는 `endAt ≤ 서버 현재 시각`이면 `MEETUP_CLOSED`. `isFull`이면 `MEETUP_FULL`.

응답 200

```json
{
  "meetup": {
    "id": "Zk3pQ9vL2mN8xR1t",
    "roomId": "eng-301", "roomName": "301호", "buildingId": "eng", "buildingName": "공학관", "floor": 3,
    "title": "카공 모여라", "category": "study", "description": "조용히 각자 공부, 콘센트 자리 있어요",
    "startAt": "2026-11-06T15:10:00+09:00", "endAt": "2026-11-06T17:00:00+09:00",
    "maxMembers": 4,
    "hostId": "7c2e1b9a-5d3f-4e8a-9b1c-2f6d8a4e0c11", "hostNickname": "민지",
    "members": [
      { "userId": "7c2e1b9a-5d3f-4e8a-9b1c-2f6d8a4e0c11", "nickname": "민지", "joinedAt": "2026-11-06T15:09:40+09:00" },
      { "userId": "a1f4c6e2-8b7d-4c3a-9e5f-1d2b3c4d5e6f", "nickname": "준호", "joinedAt": "2026-11-06T15:11:05+09:00" }
    ],
    "memberCount": 2, "isFull": false, "status": "open",
    "createdAt": "2026-11-06T15:09:40+09:00"
  }
}
```

에러: `VALIDATION_ERROR`, `NOT_FOUND`, `MEETUP_CLOSED`, `MEETUP_FULL`

### POST /api/meetups/{meetupId}/leave

요청

```json
{ "userId": "a1f4c6e2-8b7d-4c3a-9e5f-1d2b3c4d5e6f" }
```

규칙: 주최자면 `HOST_CANNOT_LEAVE`. 멤버가 아니면 `NOT_MEMBER`. `status != "open"`이면 `MEETUP_CLOSED`.

응답 200: `{ "meetup": Meetup }` (해당 멤버가 빠진 상태)

에러: `VALIDATION_ERROR`, `NOT_FOUND`, `HOST_CANNOT_LEAVE`, `NOT_MEMBER`, `MEETUP_CLOSED`

### POST /api/meetups/{meetupId}/cancel

요청

```json
{ "userId": "7c2e1b9a-5d3f-4e8a-9b1c-2f6d8a4e0c11" }
```

규칙: `userId != hostId`면 `FORBIDDEN`. 이미 취소됐으면 변경 없이 200(멱등).

응답 200: `{ "meetup": Meetup }` (`status: "cancelled"`)

에러: `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`

### POST /api/chat (시간 나면)

요청

```json
{
  "userId": "7c2e1b9a-5d3f-4e8a-9b1c-2f6d8a4e0c11",
  "message": "지금 근처에서 2시간 정도 조용히 공부할 곳 추천해줘",
  "location": { "lat": 37.5511, "lng": 127.0738 },
  "at": "2026-11-06T15:10:00+09:00"
}
```

`message` 1–300자. `location`은 null 허용(위치 권한 거부 시 프론트가 선택한 건물의 `lat`/`lng`를 넣거나 null). `at` 선택. 단일 턴(대화 이력은 프론트 화면에만 보관).

처리(`backend/core/recommend.py` → `core/llm.py`):

1. 후보 = `at` 기준 status가 `empty` 또는 `meetup`인 강의실. `location`이 있으면 건물까지 Haversine 거리 → `walkMinutes`로 정렬, 없으면 `freeMinutes` 내림차순. 상위 10개.
2. 후보 10개와 `message`를 LLM에 보내 아래 "AI 출력 JSON 스키마"로 받는다(8초 타임아웃).
3. 검증 통과 → `source: "llm"`. 타임아웃·파싱 실패·후보 밖 roomId만 남음·키 없음 → 규칙 기반: 상위 3개에 문구 템플릿("{building} {room}, {freeUntil}까지 비어 있어요. 도보 {walk}분") → `source: "fallback"`.
4. 후보가 0개면 추천 빈 배열과 안내 문장으로 200.

응답 200

```json
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
```

에러: `VALIDATION_ERROR`, `AI_UNAVAILABLE`(LLM과 fallback 모두 실패)

## 5. AI 출력 JSON 스키마 (LLM → 백엔드)

LLM은 아래 객체 하나만 출력한다(`response_format: json_object`). 백엔드는 검증 후 정적 데이터로 필드를 채워 `Recommendation`으로 바꾼다.

```json
{
  "reply": "공학관 301호가 가장 가까워요. 17:00까지 비어 있고 콘센트가 있어서 2시간 공부하기 좋아요.",
  "recommendations": [
    { "roomId": "eng-301", "reason": "17:00까지 비어 있고 콘센트가 있어 장시간 공부에 적합" },
    { "roomId": "eng-304", "reason": "오늘 남은 수업이 없어 시간 제한 없이 사용 가능" }
  ]
}
```

| 필드 | 타입 | 검증 |
| --- | --- | --- |
| reply | string | 1–200자 한국어. 비어 있으면 fallback 문구로 대체 |
| recommendations | array | 0–3개. 후보 목록에 없는 `roomId`는 버림. 중복 제거 |
| recommendations[].roomId | string | 후보의 id |
| recommendations[].reason | string | 1–60자. 넘치면 60자로 자름 |

LLM 입력(후보 1개당): `{ "roomId", "buildingName", "floor", "roomName", "capacity", "tags", "freeMinutes", "freeUntil", "status", "walkMinutes" }`. 시스템 프롬프트 요지: "캠퍼스 빈 강의실 안내 도우미. 후보 밖 강의실을 추천하지 말 것. 사용자가 말한 시간·목적·인원·조용함·콘센트를 반영. JSON만 출력."
