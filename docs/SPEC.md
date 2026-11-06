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
