[목표]
아래 SPEC v0을 구현 직전 수준의 SPEC v1으로 구체화해 줘.
팀은 이미 v0의 API 명세로 구현을 시작했다.

[상황]
- 대회: "AI로 다시 쓰는 대학 생활"(예시: AI 캠퍼스 사주풀이, 교수님과 나의 궁합. 부제: 문제 해결을 넘어 새로운 경험을 만드는 창의적인 웹). 2026-11-06(금) 10:10–15:00 안에 개발·발표·시연 준비를 끝내야 하고, 참고 코드 출처를 명시해야 한다.
- 심사: 창의력 20(아이디어 참신성·학교 문제 해결), AI 활용 능력 15(AI 툴 활용도·프롬프트 로그), 결과물 완성도 15(작동 여부·시연 명확).
- 우리 제품 "빈강": 빈 강의실 확인 + 빈 강의실에서 모임 만들기·참여 + 캠퍼스 시각화(MVP), AI 추천 챗봇(시간 나면).
- 인원·역할: 프론트 1명(Mac, Claude Code: 화면 전체·데모 조작), 백엔드 A(Windows, Codex: CRUD API·DB·배포), 백엔드 B(Windows, Codex: AI 기능·핵심 로직·발표 자료, 너를 운영).
- 스택: Next.js + TypeScript + Tailwind + shadcn/ui / FastAPI(Python) + Firebase Firestore / Vercel + Render. 폴더 frontend/ backend/ contracts/ docs/, 브랜치 fe / be-a / be-b, 1시간마다 main 병합.
- 체크포인트: 10:45 API 명세 고정 / 12:00 첫 배포 / 13:30 핵심 흐름 동작 / 14:15 기능 추가 중단 / 14:40 코드 수정 중단 / 15:00 제출. 발표 5분.
- 네 출력은 사람이 검토한 뒤 docs/pro/spec-v1.md와 docs/proposals.md로 저장되고, 각 역할의 AI 에이전트가 "지시된 변경만" 코드에 반영한다. 에이전트는 SPEC의 MVP만 구현하고 '시간 나면'과 proposals는 사람이 옮기기 전까지 구현하지 않는다.
지금 시각 10:30, 구현 마감 15:00

[제약]
- API 계약(경로, 메서드, 필드명, 타입, 필수 여부, 응답 구조, HTTP 상태)은 바꾸지 말 것. 바꿔야 한다고 판단하면 본문에 넣지 말고 '계약 변경 제안'에 따로 적을 것
- 스택과 v0의 '기술 결정'은 유지할 것. 문제가 있으면 proposals에만 적을 것
- 기존 기능 보완은 MVP 완료나 데모를 막는 문제에 한정하고, 추가 작업 시간은 전체 합계 30분 이내. 넘는 것은 위험 요소로 보고할 것
- 완전히 새로운 기능과 선택적 개선은 본문에 넣지 말고 proposals에만
- 엣지 케이스는 데모에 나오거나 핵심 흐름을 멈추게 하는 것만
- SPEC v1은 v0의 1.5배 분량 이내로 쓸 것

[다듬을 것]
1. AI 추천(POST /api/chat)의 실행 명세: LLM에 보내는 system·user 프롬프트 본문(한국어), 후보 목록을 넣는 형식, 출력 JSON 검증 규칙(roomId가 후보 밖·3개 초과·reply 비어 있음·JSON 파싱 실패)별 처리, 8초 타임아웃과 OPENAI_API_KEY 부재 시 fallback 문구. 백엔드 B가 core/llm.py와 core/recommend.py에 그대로 옮길 수 있게.
2. 데모 시드 backend/seed/campus.json 전체 값: 건물 3개(이름·lat·lng·floors·map 좌표)와 강의실 36개(id·floor·name·capacity·tags·월–금 schedule). 조건: 2026-11-06(금) 15:10 기준으로 공학관 3층이 301호 비어있음(17:00까지, 13:00–14:15 자료구조·17:00–18:15 알고리즘)·302호 수업 중(운영체제, 15:50 종료)·303호 데모 모임(demo-m1)·304호 오늘 남은 수업 없음이 되고, 월–금 09:00–18:00 어느 정각에도 건물마다 비어있음과 수업 중이 둘 다 있을 것. JSON 코드 블록 하나로 써 줘.
3. 상태 계산과 모임 겹침 판정의 엣지 케이스 기대값 표: 수업이 끝나는 정각(endTime == at), 운영 시간 경계(08:59, 09:00, 21:59, 22:00), at이 주말, 모임이 수업과 1분 겹침, 모임이 수업 직후 시작(endTime == startAt), 같은 강의실 open 모임 2개, cancelled 모임은 무시. backend/tests/test_core.py의 테스트 케이스 목록(함수명·입력·기대 결과)으로.
4. 프론트 화면별 상태와 시연 절차: 화면 5개 × (로딩 / 빈 상태 / 오류 / 목업) 문구와 처리, ?at= → localStorage demoAt 전달 규칙(언제 해제되는지 포함), 10초 폴링이 모임 생성·참여 직후 즉시 갱신되게 하는 SWR mutate 지점, 노트북과 폰에서 각각 누를 순서(닉네임 입력부터 참여 완료까지).
5. 12:00 첫 배포와 병합 체크리스트: Render(루트 backend/, 시작 명령, 환경 변수 6개)와 Vercel(루트 frontend/, NEXT_PUBLIC_API_URL) 설정 순서, CORS 확인용 curl 한 줄, 콜드스타트 대응, 병합 시각(11:45·12:45·13:45·14:30)마다 main에 있어야 하는 것, Firestore 자격증명 실패 시 STORAGE=memory 전환 절차.

[출력]
1. 가정한 내용 목록 (되묻지 말고 합리적으로 가정)
2. 반드시 고칠 것 (v0 대비, 최대 7개, 중요도 순)
3. SPEC v1 전문
4. 계약 변경 제안 (없으면 "없음". 사람이 승인하기 전에는 반영하지 않는다)
5. proposals.md 전문 (제안마다 내용 / 심사기준 효과 / 예상 시간 / 필요 조건 / 위험)

[SPEC v0]
# SPEC v0 — 빈강 (빈 강의실 확인·모임·캠퍼스 시각화)

작성 2026-11-06 10:40 · 구현 10:45–15:00 · API 전문은 `contracts/api.md` · 팀 규칙은 `AGENTS.md`가 우선

## 0. 가정 목록

1. **마감은 브리프의 15:00을 따른다.** 입력 3·협업 플랜의 16:00보다 대회 브리프(10:10~15:00)가 우선. 체크포인트를 15:00에 맞춰 당겼다. 주최 측이 16:00을 확인하면 14:15 이후 체크포인트를 모두 +1시간.
2. 발표 5분(시연 약 2.5분 포함), 발표는 15:00 이후 팀 순서대로. 제출물은 배포 URL·GitHub 저장소·발표 자료 PDF·프롬프트 로그. 백업 시연 영상은 내부 보험용.
3. 학교 시간표 실데이터는 없다. 가상 캠퍼스 시드(건물 3·층 3·강의실 36, 월–금 시간표)를 쓰고, 건물명·좌표는 팀 학교에 맞춰 바꿀 수 있게 JSON 한 파일에 둔다.
4. 로그인 없음. 브라우저가 만든 `userId` + 닉네임(localStorage)으로 사용자를 구분한다. 두 기기 시연은 노트북 + 폰(또는 시크릿 창).
5. 서비스명 "빈강"은 임시명. 서버 시각은 Asia/Seoul, 건물 운영 09:00–22:00(전 건물 동일).
6. AI 챗봇(기능 4)은 MVP 밖이지만 API 계약은 지금 고정한다. 백엔드 B가 13:30 이후 구현하며, OpenAI API 키는 백엔드 B가 보유한다고 가정.
7. 이 문서·계약은 AGENTS.md의 "최초 SPEC v0 생성" 예외로 만들었다. 생성 이후 수정은 사람이 직접 한다. 이 폴더는 아직 git 초기화 전이므로 백엔드 A가 10:45에 GitHub 저장소를 만들고 현재 폴더(docs/, contracts/, AGENTS.md 포함)를 main 첫 커밋으로 올린다.
8. 모임은 강의실을 독점 예약하지 않지만, **같은 강의실·겹치는 시간대에는 모임 1개만** 허용한다(시연 상태를 단순하게).
9. 시연은 `?at=2026-11-06T15:10:00+09:00`으로 시각을 고정해서 한다. 시드는 이 시각에 데모 장면이 나오도록 작성한다.
10. 기능 담당(사용자 확정): 프론트 = 기능 1·3 화면(빈 강의실 표시·시각화), 팀원1 = 백엔드 A(be-a) = 기능 2 모임, 팀원2 = 백엔드 B(be-b) = 데이터 가공·DB 구축·기능 1 백엔드(빈 강의실 찾기). AI 챗봇은 "시간 나면"이므로 B에 둔다. 배포는 AGENTS.md대로 A.

## 1. 개요

- **한 줄:** 지금 비어 있는 강의실을 캠퍼스 지도에서 바로 찾고, 그 강의실에 "카공 모여라" 같은 모임을 열어 사람을 모으는 웹 서비스.
- **대상:** 스터디룸이 부족해 빈 강의실을 찾는 재학생. 특히 다음 수업 전에 미리 자리 잡고 싶은데 앞 시간 수업 여부를 에브리타임으로 매번 확인하는 학생.
- **심사기준별 어필**
  - 창의력 20: 에브리타임 확인 반복 → 캠퍼스 지도 한 화면. 빈 공간을 "모임 장소"로 바꿔 사람까지 연결(공간 문제 + 커뮤니티).
  - AI 활용 15: 설계(GPT Pro)·구현(Claude Code, Codex) 프롬프트 로그를 `docs/prompts/`에 보관해 발표에서 공개. AI 챗봇이 위치·시간·목적으로 강의실을 추천(시간 나면).
  - 완성도 15: 배포 URL에서 두 기기로 시연. 모든 조회 API가 `at` 파라미터로 시연 시각을 재현하므로 어느 시간에 발표해도 같은 장면.
- **제출:** 마감 15:00 / 제출물: 배포 URL(Vercel), GitHub 저장소 main, 발표 자료 PDF, `docs/prompts/` 프롬프트 로그, README 참고 코드 출처 / 담당: 백엔드 A(저장소·URL 제출), 백엔드 B(발표 자료·발표), 프론트(시연 조작·백업 영상).

## 2. 기능 목록

**MVP**

| # | 기능 | 입력 → 결과 | 완료 기준 |
| --- | --- | --- | --- |
| 1 | 빈 강의실 확인 | 건물·층·최소 여유 시간 → 강의실별 상태(비어있음/수업 중/모임 중)와 "N분 후 수업" | 배포 URL에서 공학관 3층을 열면 시드 시간표 기준 상태·남은 시간이 맞고, "60분 이상" 필터가 동작 |
| 2 | 모임 만들기·참여 | 빈 강의실 + 제목·목적·시간·정원 → 모임 생성; 다른 사용자가 목록에서 참여 → 인원 갱신 | 노트북에서 만든 모임이 폰에 10초 안에 보이고, 참여하면 인원 1/4→2/4. 정원 초과는 "정원 마감", 수업 중 시간은 생성 거부 |
| 3 | 캠퍼스 시각화 | 캠퍼스 지도 → 건물별 빈 강의실 수 색상 → 클릭 시 층 탭·강의실 격자 | 건물 색이 빈 비율에 따라 바뀌고, 지도→건물→층→강의실 상세까지 3클릭 |

**시간 나면 (우선순위 순)**

1. AI 추천 챗봇(기능 4): `POST /api/chat`. 위치(GPS 또는 건물 선택) + 메시지 → 추천 3개와 이유. 계약은 고정, 백엔드 B 13:30 이후·프론트 `/chat` 화면 13:30 이후.
2. 빈 강의실 알림: 관심 강의실이 비면 브라우저 알림. 새 엔티티 필요 → 대회 후.
3. 실제 캠퍼스 지도 이미지 배경, 실제 시간표 연동.
4. 모임 검색·카테고리 필터, 내가 만든/참여한 모임 보기.

## 3. 화면 목록과 데모 시나리오

**화면** (`frontend/src/app`, 파일명 kebab-case)

| 경로 | 화면 | 핵심 요소 |
| --- | --- | --- |
| `/` | 캠퍼스 지도 | 인라인 SVG 건물 블록(빈 비율 색상), 상단 "지금 빈 강의실 N개", 시연 시각 배지, 첫 방문 닉네임 다이얼로그 |
| `/buildings/[buildingId]` | 층별 보기 | 층 탭, 강의실 카드 격자(상태 색·남은 시간·태그), 최소 여유 분 필터 |
| `/rooms/[roomId]` | 강의실 상세 | 오늘 시간표 타임라인, 현재 상태, 이 강의실 모임 목록, "모임 만들기" |
| `/meetups` | 모임 목록 | 진행·예정 모임 카드(인원/정원, 참여·나가기·취소), 생성 다이얼로그(빈 강의실 선택) |
| `/chat` (시간 나면) | AI 추천 | 채팅 입력, 위치 허용 또는 건물 선택, 추천 카드 → 강의실 상세 이동 |

공통: 모바일 우선. `NEXT_PUBLIC_USE_MOCK=1`이면 헤더에 MOCK 배지. 10초 폴링(생성·참여 직후 즉시 재조회). URL에 `?at=`이 있으면 localStorage `demoAt`에 저장하고 모든 조회에 전달, 헤더에 "시연 시각 15:10" 배지와 해제 버튼. 상태 색: 비어있음 초록 / 모임 중 파랑 / 수업 중 빨강 / 운영 종료 회색.

**데모 시나리오 (발표 5분, `at`=금 15:10 고정)**

| 시간 | 장면 | 조작 |
| --- | --- | --- |
| 0:00–0:40 | 문제·한 줄 소개 | 슬라이드 |
| 0:40–1:30 | 기능 3 + 1 | 지도에서 초록 건물(공학관) 클릭 → 3층 탭 → "301호 110분 비어있음(17:00까지)" vs "302호 수업 중, 15:50 종료" vs "303호 모임 중" → 필터 60분 |
| 1:30–2:30 | 기능 2 | 301호 상세 → 모임 만들기 "카공 모여라" 15:10–17:00 정원 4 → 폰에서 `/meetups` → 참여 → 노트북 인원 2/4 갱신, 지도에서 301호가 "모임 중" 파랑 |
| 2:30–3:10 | 기능 4 (없으면 생략) | `/chat` "근처에서 2시간 조용히 공부할 곳" → 추천 3개·이유 → 카드 클릭으로 상세 이동 |
| 3:10–4:00 | AI 활용 | `docs/prompts/` 로그, 역할·도구 분담 슬라이드 |
| 4:00–5:00 | 확장·마무리 | 실제 시간표 연동, 알림, 질의응답 |

시연 전 14:50: `backend/scripts/seed_demo.py`(멱등: 고정 id 데모 모임 upsert + 나머지 삭제) 실행, `/api/health`로 Render 깨우기, 노트북·폰 모두 같은 `?at=` 적용 확인.

## 4. 데이터 모델

**정적 데이터** `backend/seed/campus.json` — 서버 시작 시 메모리 로드, Firestore에 저장하지 않음

- `buildings[]`: `id` string, `name` string, `lat` number, `lng` number, `floors` number[], `map` {`x`,`y`,`w`,`h` number, 0–100 viewBox 좌표}
- `rooms[]`: `id` string("eng-301"), `buildingId` string, `floor` number, `name` string("301호"), `capacity` number, `tags` string[], `schedule[]` {`dayOfWeek` number(ISO, 월=1…일=7), `startTime` "HH:MM", `endTime` "HH:MM", `title` string}

**Firestore** — 컬렉션 1개 `meetups/{meetupId}` (문서 id = API의 `id`, 필드명 camelCase, 시각은 Timestamp로 저장하고 응답에서 ISO 8601로 변환)

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| roomId | string | rooms[].id |
| title | string | 1–30자 |
| category | string | "study" / "project" / "social" / "etc" |
| description | string | 0–200자 |
| startAt, endAt | Timestamp | 같은 날짜, 09:00–22:00 안, 15분 ≤ endAt−startAt ≤ 240분 |
| maxMembers | number | 2–30 |
| hostId, hostNickname | string | 주최자 = members[0] |
| members | array of map | {userId string, nickname string, joinedAt Timestamp} |
| status | string | "open" / "cancelled" |
| createdAt | Timestamp | 서버 시각 |

응답에서 파생(저장 안 함): `roomName`, `buildingId`, `buildingName`, `floor`(정적 데이터), `memberCount`, `isFull`. 저장소는 `backend/meetup_repo.py`의 `MeetupRepo` 인터페이스 뒤에 두고, 환경변수 `STORAGE=memory`면 메모리 구현으로 대체한다.

## 5. API 요약

| 메서드 | 경로 | 용도 | 담당 |
| --- | --- | --- | --- |
| GET | `/api/health` | 배포·깨우기 확인 | A |
| GET | `/api/buildings?at=` | 건물별 빈 강의실 수·층 요약 | B |
| GET | `/api/rooms?buildingId=&floor=&status=&minFreeMinutes=&at=` | 강의실 상태 목록 | B |
| GET | `/api/rooms/{roomId}?at=` | 강의실 상세(오늘 시간표·모임) | B |
| GET | `/api/meetups?roomId=&buildingId=&includePast=&at=` | 모임 목록 | A |
| POST | `/api/meetups` | 모임 생성(수업·모임 겹침 검사) | A (+B의 `core/availability.py` 함수) |
| GET | `/api/meetups/{meetupId}` | 모임 상세 | A |
| POST | `/api/meetups/{meetupId}/join` | 참여 | A |
| POST | `/api/meetups/{meetupId}/leave` | 나가기 | A |
| POST | `/api/meetups/{meetupId}/cancel` | 주최자 취소 | A |
| POST | `/api/chat` | AI 추천 (시간 나면) | B |

전문은 `contracts/api.md`.

## 6. 담당 분배

**폴더 소유** (AGENTS.md 수정 범위의 구체화)

- 프론트(fe, 사용자) — 기능 1·3 화면: `frontend/` 전체. 루트 디자인 도구(`package.json`의 `design:*`, `.claude/`).
- 백엔드 B(be-b, 팀원2) — 데이터 가공·DB 구축·빈 강의실 찾기: `backend/core/`(`seed_loader.py`, `availability.py`, `recommend.py`, `llm.py`, `routes_rooms.py`, `routes_chat.py`), `backend/seed/`, `backend/db.py`(Firebase 초기화), `backend/tests/test_core.py`. Firebase 프로젝트·Firestore 생성·서비스 계정 키 발급도 B.
- 백엔드 A(be-a, 팀원1) — 모임: 위를 제외한 `backend/` 전체 — `main.py`, `errors.py`, `meetup_repo.py`, `routers/meetups.py`, `scripts/seed_demo.py`, `requirements.txt`, `render.yaml`, `.env.example` — 와 Render 배포, 저장소 루트 설정. 라우터 등록(`include_router`)은 A만.
- `docs/SPEC.md`, `contracts/`: 생성 이후 사람이 직접 수정. 에이전트는 변경이 필요하면 사람에게 알린다. 작업 기록은 `docs/log/{fe,be-a,be-b}.md`, 커밋 접두어 `[fe]` `[be]` `[spec]`.

**A↔B 인터페이스** (10:45 고정, 서로 import만 하고 수정하지 않는다)

- B가 제공: `db.get_client()`(firebase-admin Firestore 클라이언트, `STORAGE=memory`면 None) / `core.seed_loader.get_room(room_id)`, `get_building(building_id)`, `list_rooms()` / `core.availability.check_meetup_slot(room_id, start_at, end_at, open_meetups) -> str | None`(겹치면 한국어 사유, 아니면 None → A가 `ROOM_OCCUPIED`로 변환)
- A가 제공: `meetup_repo.list_open(room_id=None) -> list[dict]`(API 필드명, ISO 문자열, 파생 필드 없음) — B의 상태 계산과 강의실 상세가 사용
- 11:15까지 B가 `routes_rooms.py`·`routes_chat.py` 스텁(계약 예시 JSON 반환)을 be-b에 커밋 → 11:45 병합 → 12:00 배포에 전 엔드포인트 스텁 포함

브랜치 `fe` / `be-a` / `be-b`. main 병합 11:45 · 12:45 · 13:45 · 14:30.

| 시간 | 프론트 | 백엔드 A | 백엔드 B |
| --- | --- | --- | --- |
| 10:45–11:30 | `create-next-app frontend/`, Tailwind·shadcn, 레이아웃·닉네임 다이얼로그, `lib/api.ts`(fetch 래퍼 + 목업 모드 + `demoAt`) | GitHub 저장소·브랜치 생성, FastAPI 뼈대·CORS·에러 형식·`/api/health`, `meetup_repo.py`(memory 구현 먼저) | Firebase 프로젝트·Firestore·서비스 계정 키 발급(11:15까지 A에게 전달), `db.py`, `seed/campus.json`(실제 시간표가 있으면 변환, 없으면 가상 시드: 건물 3·강의실 36·월–금), `core/seed_loader.py`, 라우터 스텁 커밋 |
| 11:30–12:00 | 캠퍼스 지도 화면(목업) | **Render 배포(환경변수에 B의 키) → 12:00 배포 URL 공유**, 프론트가 curl로 확인 | `core/availability.py`(상태·건물 요약·`at`·겹침 판정), `tests/test_core.py`, 배포 서버에서 Firestore 연결 확인 |
| 12:00–13:00 | 층별 보기·강의실 상세, 목업→실API 전환 | `meetup_repo.py` Firestore 구현, `routers/meetups.py` 생성·목록·상세·참여·나가기·취소 + 검증·에러 코드 | `routes_rooms.py` 실제 로직 연결, `core/recommend.py`(거리·규칙 추천) |
| 13:00–13:30 | 모임 목록·생성·참여 화면 실API 연결 | `ROOM_OCCUPIED`에 B 함수 연결, 재배포 | 발표 자료 초안(문제·해결·화면·AI 활용) |
| **13:30 체크** | 핵심 흐름(지도→층→상세→모임 생성→폰 참여)이 배포 URL에서 통과 | | |
| 13:30–14:15 | 두 기기 테스트, 빈/로딩/오류 상태, 디자인 다듬기, (시간 나면) `/chat` | 버그 수정, `scripts/seed_demo.py`, 로그 | (시간 나면) `routes_chat.py` + `core/llm.py`(LLM + fallback) |
| **14:15 기능 추가 중단** | | | |
| 14:15–14:40 | 버그 수정, Vercel 최종 배포, 리허설 | 최종 배포·환경변수 점검, README 참고 코드 출처 | 발표 자료 완성, 프롬프트 로그 정리 `docs/prompts/` |
| **14:40 코드 수정 중단** | | | |
| 14:40–15:00 | 백업 영상 녹화, 시연 리허설 | 제출(저장소·URL·자료) | 발표 리허설 |

## 7. 안 할 것

- 로그인·회원가입·Firebase Auth
- 실제 학교 시간표 크롤링·에브리타임 연동(시드로 대체)
- 강의실 독점 예약·관리자 승인·관리자 화면
- 푸시 알림·이메일
- 모임 채팅·댓글·신고
- 실제 도면·실내 지도(층은 격자로 추상화)
- 지난 모임 기록·통계, 페이지네이션
- 다국어, 다크모드 전용 작업, Cloud Storage

## 8. 구현 위험 요소와 대응

| 위험 | 대응 |
| --- | --- |
| Render 무료 플랜 콜드스타트(~50초) | 발표 5분 전 `/api/health` 호출. 프론트 로딩 상태에 "서버 깨우는 중" 문구 |
| 시연 시각에 비어있음/수업 중이 섞이지 않음 | 모든 조회 API `at` 지원, 프론트 `?at=`로 고정. 시드는 금 15:10에 데모 장면이 나오고, 월–금 09–18시 어느 시각에도 건물마다 두 상태가 섞이게 작성 |
| Firestore 자격증명 실패 | B가 11:15까지 키 발급·로컬 연결 확인. 안 되면 `STORAGE=memory`로 배포(시연 중 서버 재시작 금지) |
| CORS·환경변수 불일치 | 계약의 환경변수 표 그대로(`NEXT_PUBLIC_API_URL`, `CORS_ORIGINS`). 12:00 배포 직후 프론트에서 실제 호출 |
| LLM 지연·형식 오류 | 8초 타임아웃, JSON 검증 실패 시 규칙 기반 fallback, 응답에 `source` 표시 |
| 위치 권한 거부·부정확 | 건물 선택으로 위치 대체 |
| 병합 충돌 | 폴더·파일 소유 고정, 라우터 등록은 A만, 1시간마다 병합 |
| 시간 부족 | 14:15 기능 중단. 기능 1–3만으로 발표되게 시나리오 유지 |

## 9. 기술 결정

| 항목 | 결정 | 이유 | 대안 |
| --- | --- | --- | --- |
| 백엔드 언어 | Python 3.12 + FastAPI | Render 네이티브 런타임이라 Dockerfile 없이 12:00 배포 가능, firebase-admin·openai 예제가 Codex에 가장 흔함 | ASP.NET Core 8 (Render는 Docker 필요, Unity C#과 웹 C#은 별개 학습) |
| 정적 캠퍼스 데이터 | `backend/seed/campus.json`을 서버 시작 시 메모리 로드 | 시드 동기화·읽기 비용 없음, 로컬·배포 동일 | Firestore `buildings`/`rooms` 컬렉션 |
| Firestore 범위 | `meetups` 컬렉션만, `MeetupRepo` 인터페이스 + `STORAGE=memory` 대체 | 동적 데이터만 DB, 자격증명 실패해도 배포 가능 | 전부 Firestore |
| 인증 | 없음. `crypto.randomUUID()` userId + 닉네임을 localStorage | 회원 흐름 없이 두 기기 시연 가능 | Firebase Auth 익명 로그인 |
| 프론트 데이터 접근 | 전부 FastAPI 경유, 프론트에 Firebase SDK 없음 | 계약 하나로 통일, 키 노출 없음 | 프론트에서 Firestore 직접 읽기 |
| 실시간 갱신 | SWR `refreshInterval` 10초 폴링 + 변경 직후 `mutate` | 한 줄로 끝, 시연 체감 충분 | Firestore onSnapshot |
| 프론트 구조·상태 | App Router, `src/app` 라우트 · `src/components` · `src/lib/api.ts`(fetch 래퍼 + 목업 + `demoAt`) · `src/lib/types.ts` · `src/mocks/`. 전역 스토어 없음, URL 쿼리(`floor`)와 localStorage(`userId`, `nickname`, `demoAt`)만 | 화면 4개에 스토어는 과함 | TanStack Query + zustand |
| UI | shadcn/ui(Button, Card, Badge, Dialog, Sheet, Tabs, Select, Slider, Input, Sonner) + Tailwind. 캠퍼스 지도는 인라인 SVG 건물 블록 | 설치 즉시 사용, 지도 라이브러리 학습 불필요 | Leaflet + 실제 지도 타일 |
| 시간 처리 | 서버 Asia/Seoul 고정, 모든 조회에 `at` 쿼리, 응답은 ISO +09:00, Firestore는 Timestamp | 시연 시각 재현, 시간대 버그 차단 | 클라이언트 시각 계산 |
| AI 호출 | OpenAI Chat Completions, `response_format: json_object`, 단일 턴, 8초 타임아웃, 규칙 기반 fallback | 형식 보장 + 실패해도 시연 지속 | Anthropic Messages API |
| 백엔드 구조 | `backend/` 루트에 `main.py`(앱·CORS·예외 핸들러·라우터 등록), `errors.py`, `meetup_repo.py`, `routers/meetups.py`, `scripts/`(A) · `db.py`, `core/`, `seed/`, `tests/test_core.py`(B) | 시작 명령 `uvicorn main:app`에 맞춤, 사람별 폴더 소유가 명확 | `app/` 패키지 |
| 직렬화·동기 | Pydantic `alias_generator=to_camel, populate_by_name=True`. firebase-admin은 동기 SDK라 라우트는 `def` | AGENTS.md 규칙, 이벤트 루프 블로킹 방지 | async + 스레드풀 |
| 에러 처리 | `errors.ApiError(code, status, message)` + 전역 핸들러. 422는 400 `VALIDATION_ERROR`로 변환 | 프론트가 한 형식만 처리 | FastAPI 기본 422 |
| 배포 | Vercel(루트 `frontend/`, `NEXT_PUBLIC_API_URL`) + Render Web Service(루트 `backend/`, `uvicorn main:app --host 0.0.0.0 --port $PORT`) | 기본 스택·AGENTS.md | Railway |
| 루트 package.json | 디자인 검사용으로 유지, 앱은 `frontend/`에 별도 package.json | CLAUDE.md의 `design:*` 스크립트 유지 (`npm run design:detect -- frontend/src`) | 루트에 Next 병합 |

[API 명세 v0]
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
