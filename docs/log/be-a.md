# be-a 작업 기록 — 창원

## 11:29 서버 기본 구성·메모리 모임 저장소 (2026-11-06)

- 바뀐 것: SPEC 6절 10:45–11:30 구간의 `backend/main.py`, `errors.py`, `meetup_repo.py`, 버전 고정 requirements 2개, `.env.example`, 실행 안내, 테스트 2개와 루트 `render.yaml`을 작성. be-b 소유 파일·SPEC·API 계약은 수정하지 않음. `STORAGE=memory`에서 Firebase 자격증명 없이 동작하며, 메모리 저장소는 get/save(upsert)/list_open을 제공함.
- API 영향: `GET /api/health`만 추가. 응답은 status/storage/time/version, time은 +09:00. ApiError와 FastAPI/Starlette 오류를 공통 error 객체로 반환하고 입력 검증 422는 400 VALIDATION_ERROR로 변환. 등록되지 않은 경로는 404 NOT_FOUND. 모임 API와 be-b 라우터는 아직 등록하지 않음.
- 확인 방법: Python 3.12.14에서 `.venv\Scripts\python -m unittest discover -s tests -p "test_*.py" -v` 6개 통과, `pip check` 통과. 메모리 저장·복사 격리·open/room 필터·Firestore 미구현 시 명시적 실패, health/CORS/404/400/409/500 확인. 실제 Uvicorn을 127.0.0.1:8000에서 띄워 health 200(storage=memory), 없는 경로 404 NOT_FOUND 확인 후 종료. Windows 샌드박스의 asyncio 소켓 제한으로 첫 실행이 대기하여 해당 프로세스를 종료하고 권한이 허용된 로컬 실행에서 검증함.
- 남은 문제: Firestore 구현·모임 생성/조회/참여 라우터·수업 겹침 검사·실제 Render 배포는 다음 구간. 메모리는 재시작하면 소실되며 단일 worker만 사용. `/api/health`는 DB 연결 성공을 보증하지 않음. 참여 정원/모임 중복 검증과 저장을 묶는 원자적 처리는 모임 라우터 구현 시 추가 필요.

### 시간표 파일 확인과 be-b 인계

- 원본: 상위 폴더 `2026-2학기_강의실_시간표_정리.xlsx`. `강의실 시간표` 시트 2,834개 데이터 행, 열은 `건물 이름 / 건물 호관 / 강의실 호실 / 시간 / 요일`. 읽기만 했으며 파일을 변경하거나 Git에 업로드하지 않음.
- 시간 셀에 여러 구간이 연속으로 들어갈 수 있음: 인문대학 15호관 119호 `(18:00~19:15)(19:25~20:40)`. be-b 변환 단계에서 각 구간을 분리해야 함.
- 모임은 변환된 `rooms[].id`를 `roomId`로 그대로 참조. 모임 저장소는 특정 건물·호실이나 `eng-*` ID에 의존하지 않음. 실제 ID 생성 규칙은 B의 데이터 변환 결과와 맞출 것.
- 수업명·좌표·정원·설비 태그는 이 파일에 없으므로 별도 메타데이터가 필요함. 이번 작업은 구조 확인이며 실제 시간표 조회/빈 강의실 계산을 검증한 것은 아님.
- SPEC 0절의 실데이터 없음 가정은 현재 업로드 상황과 다름. 문서 변경 제한에 따라 SPEC은 그대로 두고 여기에 기록함.

### 의존성·출처

- 런타임 직접 의존성: fastapi 0.162.0, uvicorn 0.54.0, firebase-admin 7.7.0, openai 3.46.0, pydantic 2.14.3, starlette 1.10.0. 테스트용 httpx2 2.16.0. 프로젝트 `backend/.venv`에 설치했으며 전역 환경 변경 없음. Firebase/OpenAI SDK는 다음 단계용 의존성이고 실제 외부 호출은 하지 않음.
- 엑셀 확인은 제공된 실행 환경의 openpyxl을 사용. 서버 의존성에는 엑셀 라이브러리를 추가하지 않음.
- 참고: [FastAPI 공식 예외 처리 문서](https://fastapi.tiangolo.com/tutorial/handling-errors/), [Render 공식 Blueprint 문서](https://render.com/docs/blueprint-spec). 외부 프로젝트 코드를 복사하지 않음.
- 관련 이슈: [be-a 초기 작업 #2](https://github.com/seolcw/Incheon_Univ_vivecoding/issues/2). 로컬 `be-a` 브랜치에 커밋하며 원격 push·main 병합·배포는 하지 않음.

## 11:44 수정 이슈 반영·메모리 모임 API·Firestore 연결 준비 (2026-11-06)

- 바뀐 것: 최신 [이슈 #2](https://github.com/seolcw/Incheon_Univ_vivecoding/issues/2)(수정 시각 02:31:25 UTC), #1, origin/fe의 docs/pro/spec-v1.md·docs/scope-change.md를 읽고 모임 CRUD·참여, 앱 시작 memory 시드, .python-version=3.12와 Firestore 어댑터를 추가. README에 시연 명령·B 인계·Firestore 전환 절차 기록. 기존 첫 작업을 폐기하지 않고 확장함.
- API 영향: 계약의 모임 6개 엔드포인트(목록·생성·단건·join·leave·cancel)를 구현. 생성 201, 나머지 200; 필드·방·시간·충돌 순서, 한국 시각·경계 접촉·정원·멱등·공통 에러 유지. at은 목록만 지원하고 join은 실제 시각으로 종료 검사. leave는 상세 엔드포인트 규칙을 따름(C1 미반영). 응답의 파생 필드는 저장하지 않음.
- 확인 방법: 전체 unittest 16개 통과, pip check 통과. 메모리 동일 시간 동시 생성·마지막 자리 동시 참여 각각 한 요청만 성공 확인. 실제 Uvicorn 8000 포트에서 health200, demo-m1 조회, 생성201→참여200·1→2명, 재참여 멱등, 수업 충돌409, 정원409, 목록·leave·cancel·CORS·데모 헤더 확인 후 서버 종료. 라이브 검증 서버 실제 시각 2026-11-06T11:41:40+09:00. Firestore는 가짜 클라이언트 기반 단위 검사만 통과했으며 클라우드 접속 검증은 하지 않음.
- 남은 문제: B의 core/seed/db.py와 rooms/chat 라우터가 아직 원격에 없음. 사용자도 미구현이라고 확인함. 실제 B 통합·Firestore 키/권한·서버 재시작 후 영속성·프론트/두 기기·Render 배포는 아직. Firestore 다중 인스턴스 동시 생성의 원자성은 미보장. 메모리 자동 이관은 없음. 실제 17:00 이후 고정 모임의 신규 참여는 거부됨.

### B 미구현 상태에서의 명시적 데모

- 사용자가 B 미구현을 고려해 먼저 구현하도록 지시하여 A 소유 campus_gateway.py에 CoreCampus와 DemoCampus 연결 경계를 둠. B 소유 core/, seed/, db.py, tests/test_core.py는 수정하지 않음.
- CAMPUS_SOURCE=demo를 명시해야 v1 금요일 301~304호 4개 데이터를 사용. 정보대/eng 표시는 origin/fe의 scope-change.md에 맞춤. 실제 엑셀 또는 전체 가상 캠퍼스 시드의 구현으로 보고하지 않음. Swagger 제목·시작 경고·X-Campus-Source 응답 헤더로 표시하고 실패 시 자동 demo 전환은 하지 않음.
- CAMPUS_SOURCE=core는 get_room/get_building/check_meetup_slot 고정 import 사용. 충돌 함수 인자는 room_id, KST timezone-aware datetime 시작/끝, 같은 방의 모든 open 모임(ISO 문자열)이다. B 인터페이스 테스트는 대역으로 확인했으며 B 코드 실행 성공이 아님.
- STORAGE는 별도 설정이므로 memory/core 또는 firestore/demo 조합도 가능. B 데이터 준비와 DB 전환을 독립적으로 진행할 수 있음.

### Firestore·시드·의존성

- FirestoreMeetupRepo: meetups 컬렉션, 문서 id 분리, 원본 날짜와 members.joinedAt Timestamp 저장, +09:00 ISO 응답, 파생 필드 제외. 참여·나가기·취소는 단일 문서 트랜잭션. 생성은 프로세스 내 잠금이며 분산 잠금은 아님.
- 실제 연결에는 B의 db.get_client(), 대회 전용 Firestore, 서비스 계정 권한/환경변수, STORAGE=firestore와 서버 재시작, 실제 생성·참여·재시작 후 조회 검증이 필요. 키를 코드·로그에 넣지 않음. Firestore 앱 시작 시 시드 덮어쓰기·삭제 없음.
- memory는 앱 lifespan에서 요청과 같은 repo에 demo-m1을 추가. 별도 프로세스로 memory를 초기화하지 않음. Firestore의 scripts.seed_demo 초기화는 --reset-contest-meetups를 명시해야 하며 선택 프로젝트의 meetups 범위만 초기화한다. 삭제 명령은 이번 작업에서 실행하지 않음.
- 새 패키지 설치 없음. 이미 설치된 google-cloud-firestore==2.34.1을 직접 사용하는 의존성으로 requirements.txt에 명시. 참고: [Firestore 트랜잭션 공식 문서](https://firebase.google.com/docs/firestore/manage-data/transactions), 설치 SDK의 메서드 시그니처 확인.
- 커밋은 be-a에만 작성. 원격 push·이슈 체크박스 변경·main 병합·배포는 하지 않음.

## 11:55 로컬 인증 파일 환경변수 로더 (별도 요청)

- 바뀐 것: `backend/scripts/load_firebase_env.ps1` 추가. 저장소 밖 원본 JSON을 UTF-8로 읽어 현재 PowerShell 프로세스의 FIREBASE_SERVICE_ACCOUNT_JSON과 STORAGE=firestore 설정. 원본 파일·모임 구현은 변경하지 않고 키 내용·파싱 오류 원문은 출력하지 않음. 실행: backend에서 `& .\scripts\load_firebase_env.ps1 -ServiceAccountPath 'C:\개인폴더\firebase-key.json'`. 같은 창에서 후속 서버 명령을 실행해야 하며 새 창에는 전달되지 않음.
- API 영향: 없음. origin/be-b의 c581fbe에서 db.get_client()가 같은 환경변수를 읽는 것을 확인. 원격 정보만 갱신했고 B 코드를 작업 브랜치에 병합하지 않음. availability.py는 원격에 아직 없어 CAMPUS_SOURCE=core의 생성 검증은 미준비.
- 확인 방법: PowerShell 문법 검사와 가짜 인증 데이터로 환경변수 설정, 원본 해시 불변, 잘못된 JSON 오류의 입력값 비노출, 저장소 내부 인증 파일 경로 거부 확인. 테스트 파일 제거, 테스트 환경변수 복원. 새 의존성 없음.
- 남은 문제: 실제 원본 JSON 경로 미제공으로 실키 로드·Firestore 접속은 실행하지 않음. B db.py 통합 및 실제 읽기·쓰기 확인 필요. Firestore 연결과 B의 시간 충돌 로직 준비는 별개임.

## 12:00 B db.py 통합·실제 Firestore 영속성 검증 (2026-11-06)

- 바뀐 것: be-a의 cb82b2c와 작업 트리 상태 확인 후 원격 갱신. origin/be-b 최신 c581fbe의 backend/db.py만 원본 그대로 통합. B 전체 병합·시드·라우터 스텁 등록은 하지 않음. 기존 main.py·meetup_repo.py·인증 로더 변경 없음. scripts/verify_firestore.py와 실제 실행 안내 추가.
- API 영향: 경로·필드·상태·동작 계약 변경 없음. STORAGE=firestore, CAMPUS_SOURCE=demo로 검증. db.get_client()가 기존 FirestoreMeetupRepo에 실제 클라이언트를 제공함. health200은 연결 성공 판단 근거로 사용하지 않음.
- 확인 방법: 통합 후 기존 unittest 16개 통과, 검증 스크립트 문법 검사 통과. 사용자 지정 저장소 밖 원본 JSON을 로더로 읽되 키·SDK 예외 원문·프로젝트 식별자는 출력하지 않음. 실제 Firestore 문서 읽기 성공 → 모임 생성201 및 직접 DB 읽기로 Timestamp 저장 확인 → 참여200 및 DB members 1→2 확인 → 서버 종료·재기동 → GET 단건200과 참여 응답 전체 일치 확인. 이번 검증용 고유 hostId의 모임만 삭제하고 삭제 결과 확인. 검증 프로세스 종료 및 인증 환경변수 제거, 원본 파일 SHA256 불변 확인(해시값·키값 미기록).
- 남은 문제: B의 core/availability.py는 원격에 아직 없어 CAMPUS_SOURCE=core 전환은 하지 않음. 실제 시간표/지도/프론트·두 기기·Render 배포는 별도 통합 단계. Firestore 검증용 모임은 정리했으며 운영 데모 모임을 초기화하거나 메모리 기록을 이관하지 않음.

실제 검증은 기존 모임과 섞이지 않도록 다음 날 eng-304 21:00–21:30에 생성한 임시 모임으로 수행했다. 데이터 정리는 해당 실행이 만든 기록에만 한정하며 전체 meetups 초기화 스크립트는 실행하지 않았다. 실제 검증 중 키가 들어 있는 원본 파일 내용은 도구 출력·채팅·Git·로그에 남기지 않았다. 새 패키지 설치 없음. 변경은 be-a 로컬 커밋이며 push·main 병합·배포는 하지 않음.

## 12:30 공유 접속 통합과 배포 준비
- 바뀐 것: origin/fe 1c967af와 origin/be-b a52e6e2를 be-a에 병합. 승인된 scope-change에 따라 canonical 정보대 26개 시드를 backend/seed/campus.json에 그대로 반영. main.py에 B 강의실 라우터·시작 로딩 등록, CAMPUS_SOURCE=seed 기본값 정렬. memory 데모도 11/10 eng-316으로 정렬. Render 무료·Firestore·seed 설정과 실제 DB 검증 스크립트/실행 안내 갱신.
- API 영향: 계약 변경 없음. 강의실/건물 GET과 모임 생성·참여가 동일 Firestore 모임을 조회. 채팅/LLM 라우터는 추가하지 않음.
- 확인 방법: unittest 32개 통과, frontend npm ci와 production build 통과. 실제 Firestore에서 26개 방·별도 요청 목록 조회·생성201·서로 다른 userId 참여200(1→2)·중복 참여·서버 재시작 유지 검증. 해당 검증 모임만 정리.
- 남은 문제: 공개 URL 배포 검증 진행 중. 닉네임 기반 MVP로 계정 인증 없음. 다중 worker 간 모임 생성 충돌 직렬화는 미구현이므로 worker 1 유지. 새 패키지는 추가하지 않았으며 기존 frontend lockfile로 설치함.

## 12:36 공개 웹 배포와 두 사용자 검증 완료
- 바뀐 것: be-a 60322fe push 완료. Render 무료 서비스 bingang-api와 bingang-web을 be-a에서 배포. 재현용 render.yaml에 프론트 서비스·브랜치·공개 API 환경변수를 추가하고 backend/README.md에 실제 주소와 사용법 기록. 인증키는 사용자가 Render 비밀 환경변수에 직접 입력했으며 Git/채팅에 포함하지 않음.
- API 영향: 계약 변경 없음. 공개 프론트 https://bingang-web.onrender.com, 공개 API https://bingang-api.onrender.com. CORS는 해당 프론트와 localhost:3000 허용. Vercel 계정 연결 대신 기존 로그인 Render 계정의 무료 Node 서비스로 프론트 배포.
- 확인 방법: Render 양쪽 Deploy succeeded(60322fe). 공개 API로 실제 Firestore 생성201·별도 userId 참여200·재조회·중복 참여·26개 강의실 확인, 검증 문서만 정리. 공개 Origin POST preflight200 확인. Chrome 주최자가 11/10 14:10–16:10 eng-302 모임 생성 → 독립 인앱 브라우저 닉네임 참가자가 목록에서 참여 → 양쪽 2/4명 자동 반영 확인. UI 검증 모임은 주최자 버튼으로 취소하고 빈 강의실 복귀 확인. 별도 물리 PC 두 대는 직접 검증하지 않음.
- 남은 문제: 무료 인스턴스 유휴 후 첫 요청 지연. public Git 연결은 수동 배포가 필요함. 채팅과 계정 인증은 범위 밖. 검증 화면은 저장소 밖 로컬 시각화 폴더에 보관. 기존 로컬 demo 서버는 종료했으며 공개 서버는 유지.

## 13:05 횃불ON 정보대 추천 구현
- 바뀐 것: 사용자 요청으로 frontend 대화창과 backend/core 추천·LLM 구현을 be-a에서 통합. 공식 횃불이 PNG 3종과 반응 상태, 질문 예시, 추천 카드 상세 이동. 기존 /api/chat 스텁을 실제 시간표·모임 조회로 교체하고 main.py에 등록. 문서 docs/torch-on.md와 프롬프트 로그 추가.
- API 영향: 외부 요청·응답 계약 유지. 내부 모델 출력은 SearchIntent 구조로 제한하고 서버가 사실/최종 페르소나 문장을 조합. 기존 stub의 무본문200 테스트는 실제 입력 검증400 기대값으로 변경. GPS 실내 거리·시설 추측은 하지 않음.
- 확인 방법: 전체 unittest37개, frontend build·ESLint 통과. 로컬 횃불이 클릭→3층120분 조건→304/317/302 카드 확인. 대화창 위치 오류를 브라우저에서 발견해 수정 후 재빌드. 키 없는 로컬은 source=fallback을 명시.
- 남은 문제: Render에 사용자가 OPENAI_API_KEY 등록 완료. 실제 OpenAI·공개 웹 배포 검증 진행 중. 단일 프로세스 하루200회 기본 제한은 재시작 때 초기화됨. 새 패키지 없음. 학교 공식 챗봇이 아닌 대회 시연으로 표시.

## 13:14 횃불ON 실제 OpenAI 연결 및 공개 검증 완료
- 바뀐 것: f0cf15a 구현과 1e8556b 안전 진단을 be-a에 push. 프론트 Render f0cf15a, 백엔드 Render 1e8556b 배포 성공. Render에서 사용자가 등록한 OPEN_API_KEY 이름을 OPENAI_API_KEY로 바로잡아 저장·재배포. 값은 읽어 출력하지 않았고 기존 값을 유지함.
- API 영향: 동일 /api/chat. 첫 공개 호출은 key_not_configured로 fallback임을 확인했고 성공으로 처리하지 않음. 변수명 교정 후 실제 AI 의도 해석 성공.
- 확인 방법: 공개 Chrome에서 ‘3층에서 2시간 공부할 곳’ 클릭 → 처리 중 이미지 → ‘AI 의도 해석 · 시간표 검증’ 표시와 3층120분 이상 카드304/316/317 확인. 304호 카드 클릭 후 시연14:10을 유지한 실제 강의실 상세 이동, 대화 재오픈 시 기록 유지 확인. 로컬 source=fallback와 공개 실제 LLM source를 구분해 확인. API 키·질문·서비스계정 내용을 로그에 기록하지 않음. 로컬 검증 서버 종료.
- 남은 문제: GPS 실내 거리 및 다른 건물은 이번 범위 제외. 다음 질문에 이전 대화 문맥을 전달하지 않으므로 매번 시간·층을 함께 입력. 무료 서버 첫 접속 지연과 프로세스 재시작 시 호출 제한 초기화. API 사용량은 사용자의 OpenAI 프로젝트에서 관리. 37개 테스트·프론트 build·lint 통과, 진단 변경 후 관련5개 재통과. UI 증거는 저장소 밖 torch-on-live.jpg에 저장.

## 13:22 횃불이 옆 작은 채팅창으로 조정
- 바뀐 것: 사용자 배치 요청에 따라 frontend/src/components/torch-chat.tsx의 큰 Dialog를 작은 비모달 패널로 변경. 우하단에는 횃불이만 고정하고 클릭하면 왼쪽320px 대화창. 배경 가림·홍보 문구·질문 예시 버튼 제거. Enter 전송(한글 조합 중 제외), Esc 닫기·초점 복귀, 재오픈 내역 유지. docs/torch-on.md 사용법 갱신.
- API 영향: 없음. 추천·DB·백엔드 변경 없음, 새 패키지 없음.
- 확인 방법: frontend production build와 ESLint 통과. 로컬 프론트→공개 API의 실제 OpenAI 추천으로 3층120분 이상304/316/317 확인. 패널을 연 채 배경 정보대 지도 클릭→건물 화면 이동, Esc 접기와 횃불이 재클릭 시 대화 유지 확인. 공개 프론트 배포는 이어서 진행.

## 13:27 작은 횃불이 채팅 공개 배포 완료
- 작업 중 별도 통합에서 be-a가 origin/main 64eac9b로 갱신되고 UI 수정이 stash b1107c5에 보관됨을 확인. 변경 없는 torch-chat.tsx만 해당 stash에서 복원하고 다른 지도 변경·stash는 보존. 기존 lockfile로 npm ci 후 통합 build·ESLint 재통과.
- 47b05ab를 origin/be-a에 push하고 Render bingang-web 배포 성공 확인. 공개 페이지에서 3D 지도와 우하단 마스코트·왼쪽 작은 패널, 실제 AI 추천(3층120분 이상304/317/302)을 확인. 결과는 당시 모임 상태에 따라 달라짐. 증거 화면은 저장소 밖 torch-compact-live.jpg에 저장. 로컬 검증 서버 종료. API 계약·추천 로직은 이번 변경에서 수정하지 않음.

## 13:43 횃불이 층 생략·후속 조건 오류 수정
- 바뀐 것: 사용자 오류 화면을 기준으로 core/llm.py·recommend.py를 수정. ‘7호관 2시간 이상 사용할곳’에 층을 필수로 요구하지 않게 하고 잘못된 AI 확인 플래그를 명확한 검색 규칙으로 보정. core/chat_context.py와 routes_chat.py, main.py에 사용자별 직전 조건(10분, 최대256명) 연결. ‘층 상관 없어’는 이전 이용 시간을 유지하며 전체 층 검색. 새 패키지 없음.
- API 영향: 경로·필드·타입·오류 형식 유지. 초기 단일 턴 동작에서 짧은 검색 조건 이어받기로 보완(사용자 요청). 원문 대화·DB 저장 없음, 기존 익명 userId를 사용하므로 같은 브라우저 탭끼리 조건 공유. 새 날짜·만료·재시작 시 초기화.
- 확인 방법: test_chat 8개 통과(추가3개: AI 잘못된 되묻기, 실제 라우트의 후속 조건/사용자 분리, TTL/용량). 전체41개 중40개 통과, 기존 test_core.test_main_app_routes_errors_and_post_cors는 backend.core fixture와 main의 core import가 달라404이며 아직 무본문 /api/chat을200 스텁으로 기대함. 해당 테스트·검사를 약화하거나 삭제하지 않음. 최초 backend/ 실행 시 패키지 import 오류는 PYTHONPATH에 루트와 backend를 지정해 해결.
- 남은 문제: 실제 OpenAI 공개 배포 검증 진행 중. 전체 대화 의미를 기억하는 기능은 아니며 직전 이용 시간·층 조건만 이어받는다.

## 13:46 동일 사용자 문장으로 공개 AI 재검증 완료
- 8975973 push 및 Render bingang-api Deploy succeeded/Live 확인. 공개 웹에서 ‘7호관 2시간 이상 사용할곳’ → 실제 AI 추천, 전체 층120분 이상101/102/105호 표시. 이어 ‘층 상관 없어’ → 같은120분·전체 층 조건과 추천 카드 유지. 불필요한 층 질문 반복이 사라짐을 확인.
- 프론트 변경·재배포 없이 기존 /api/chat을 사용. 검증 화면은 저장소 밖 torch-followup-fixed.jpg. 키·원문 운영 로그 추가 없음. 기존 통합 테스트1개의 fixture/import·스텁 기대값 문제는 위 기록대로 남아 있으며 챗봇 관련8개는 통과.

## 13:56 횃불이 일반 대화와 짧은 문맥 연결
- 바뀐 것: 사용자 요청으로 AI가 chat 의도의 실제 reply를 생성하도록 llm.py·recommend.py 변경. 잡담은 건물/시간 제약으로 막지 않으며 검색 답변은 계속 서버 데이터로 생성. chat_context.py에 최근3턴·10분 유효·최대256명 문맥 추가, routes_chat.py에서 일반 대화는 DB 조회 생략. frontend 대화/추천 라벨과 로딩 문구 개선. 새 패키지 없음.
- API 영향: 요청·응답 필드 및200자 reply 제한 유지. 내부 모델에 chat/reply 추가, 최대출력350→700토큰. 한 요청당 호출1회와 기존 호출 한도 유지. 최근 대화 원문은 메모리와 OpenAI 문맥에만 사용하며 DB/로그 저장 없음. 관련 문서/프롬프트 갱신.
- 확인 방법: 관련 백엔드27개(챗봇11개 포함), frontend build·lint 통과. 잡담에 잘못된 building=other/clarification=true가 있어도 생성 답변을 반환하고 DB 미조회, 최근3턴 전달·사용자 분리, 검색에 AI가 만든999호 문장을 쓰지 않음을 검증. 이전에 확인한 test_core의 통합 fixture/import·스텁 기대값 문제는 별개로 유지.
- 남은 문제: 공개 실제 AI 배포 검증 진행 중. 문맥은 재시작/만료/날짜 변경 시 초기화되고 같은 userId의 탭끼리는 공유한다.

## 14:04 일반 대화 실제 OpenAI·공개 배포 검증 완료
- e615bc8 프론트/API 배포, 이어 한국어 혼용 방지 프롬프트4babfc9 API 배포 성공. 실제 ‘시간표’에는 개인/강의실 시간표를 묻고, ‘야다’에는 가볍게 받아주는 생성 응답 확인. ‘자료구조2시간 공부했더니 피곤해’에 강의실 카드 없이 대화 응답, 과목을 다시 물으면 자료구조를 기억함. 이후3층120분 검색은304/317/302호로 정상 전환.
- 최종4babfc9에서도 자료구조 공부 응원→과목 재질문의 한국어 답변과 ‘AI 대화’ 표시 확인. 위 기록은 실제 OpenAI 응답이며 모의 테스트와 구분. 화면 증거는 저장소 밖 torch-casual-chat.jpg. 최근3턴·10분 유효 문맥과200자 답변 제한 유지, 사용자에게 무제한 기억을 보장하지 않음. GitHub be-a push 완료, 공개 웹 주소 유지.

## 13:27 main 통합 배포 및 공개 모임 초기화
- 바뀐 것: 사용자 요청으로 origin/main 64eac9b를 be-a에 fast-forward 병합하고 push. Render 배포 브랜치는 be-a 유지. bingang-web 64eac9b, bingang-api 47b05ab(64eac9b 포함) Deploy succeeded 확인. 진행 중 작은 채팅창 수정은 stash에 보존했으며 별도 작업에서 47b05ab로 커밋됨. 이번 공개 웹 검증은 main의 기존 횃불ON UI 기준.
- API 영향: 계약 변경 없음. 저장소 밖 인증 JSON을 출력 없이 로드하고 STORAGE=firestore, CAMPUS_SOURCE=seed에서 python -m scripts.seed_demo --reset-contest-meetups 실행. meetups는 demo-m1 하나, eng-316, 1명으로 초기화. 다른 컬렉션 변경 없음.
- 확인 방법: Firestore 직접 조회 및 공개 API includePast=true에서 demo-m1 하나 확인. 재배포 후 health200, X-Campus-Source=seed, 302호 empty·140분, 정보대26개 중 수업 없는 방13개 확인. 공개 브라우저에서 3D 지도와 횃불ON 표시 확인, 스크린샷은 저장소 밖 main-integration-live.jpg. Render 프론트 production build 성공. 통합 unittest는 루트와 backend를 PYTHONPATH에 함께 넣어 실행하여 38개 중37개 통과.
- 남은 문제: B 소유 tests/test_core.py의 test_main_app_routes_errors_and_post_cors는 backend.core에 적용한 fixture와 main이 사용하는 core 경로가 달라 가상 buildingId=8이404이며, 마지막 chat 무본문200 기대도 실제400 계약과 다름. 담당 범위 밖이므로 미수정, B에게 조정 필요. 두 물리 기기 시연은 사용자가 이어서 확인.
