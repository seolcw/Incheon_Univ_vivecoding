# 모임 API와 공유 접속 — be-a 창원

최종 기능 통합 커밋 `6efc2b6`과 후속 모임 갱신·지도 수정 `298158b`를 포함한 `58ea37f`로 웹/API 모두 배포했다. `docs/scope-change.md`에 맞춰 정보대 강의실 26개를 시작할 때 로드하고, 모임은 Firestore에 저장한다. 횃불이 AI 대화는 제공하며 모임원 간 채팅은 이번 범위에 없다. 최신 제출 안내는 루트 README를 참고한다.

## 공개 주소 (2026-11-06 배포·검증)

- 웹: https://bingang-web.onrender.com
- 시연: https://bingang-web.onrender.com/?at=2026-11-10T14%3A10%3A00%2B09%3A00
- API: https://bingang-api.onrender.com (Swagger: `/docs`)

두 컴퓨터가 같은 웹 주소로 들어와 각자 닉네임을 정하면 한쪽이 만든 모임에 다른 쪽이 참여할 수 있다. 생성은 강의실 상세의 `모임 만들기`, 참여는 상단 `모임` 목록의 `참여하기`를 쓴다. Chrome 주최자와 독립된 인앱 브라우저 참가자로 실제 공개 URL에서 생성·참여 후 양쪽 2/4명 표시를 확인했다. 별도 물리 PC 두 대를 직접 조작한 검증은 아니다. UI 검증 모임은 확인 후 취소했다.

프론트와 API 모두 Render 무료 인스턴스다. 이번 배포는 로그인된 Render 계정에서 두 서비스를 올렸으며 Vercel 배포는 만들지 않았다. 무료 서버는 한동안 사용하지 않으면 대기 상태가 되어 첫 접속에 50초 이상 걸릴 수 있다. 로컬 PC를 꺼도 배포 서비스는 독립적으로 작동한다. 공개 Git 저장소 방식으로 연결했으므로 이후 변경은 각 서비스의 `Manual Deploy → Deploy latest commit`으로 배포한다. GitHub push만으로 배포 완료라고 판단하지 않는다.

## 로컬 실행 (PowerShell)

`backend/`에서 실행한다. 인증 JSON 원본은 저장소 밖에 둔다.

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
. .\scripts\load_firebase_env.ps1 -ServiceAccountPath 'C:\실제\저장소밖\service-account.json'
$env:CAMPUS_SOURCE = 'seed'
$env:CORS_ORIGINS = 'http://localhost:3000'
.venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
```

키 없이 확인하려면 로더 대신 `$env:STORAGE='memory'`를 설정한다. 메모리 모임은 재시작 시 사라진다. Firestore 모임은 유지된다. `.env` 파일은 자동 로드하지 않는다.

다른 PowerShell 창의 `frontend/`에서:

```powershell
npm.cmd ci
$env:NEXT_PUBLIC_USE_MOCK = '0'
$env:NEXT_PUBLIC_API_URL = 'http://localhost:8000'
npm.cmd run dev
```

`http://localhost:3000/?at=2026-11-10T14%3A10%3A00%2B09%3A00`에서 별명을 정하고 정보대 302호에 14:10–16:10 모임을 만든다. 다른 브라우저/컴퓨터는 자신의 별명으로 모임 목록에서 참여한다. 화면은 변경 시 즉시 재조회하며 최신 main은 다른 사용자의 변경을 약 5초 주기로 반영한다. 시연일 이후에는 미래의 빈 시간으로 바꿔야 한다.

## 공유 배포 설정

백엔드 Render: branch `be-a`, root `backend`, Python 3.12.14, 무료 인스턴스, build `pip install -r requirements.txt`, start `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1`.

- `STORAGE=firestore`: 모임 저장소. 키는 Render 비밀 환경변수 `FIREBASE_SERVICE_ACCOUNT_JSON`에만 입력한다.
- `CAMPUS_SOURCE=seed`: 승인된 정보대 실제 시간표 26개. `docs/reference/campus-info.json`과 `backend/seed/campus.json`은 같다.
- `CORS_ORIGINS`: 실제 프론트 URL과 `http://localhost:3000`을 쉼표로 연결한다. 마지막 `/`와 경로는 제외한다.
- `TZ=Asia/Seoul`.

프론트 배포는 `frontend/`, build `npm ci && npm run build`, 실행이 필요한 호스팅에서는 `npm run start -- --hostname 0.0.0.0 --port $PORT`. `NEXT_PUBLIC_API_URL`은 공개 백엔드 HTTPS 주소, `NEXT_PUBLIC_USE_MOCK=0`. API 주소를 바꾸면 다시 빌드한다. 다른 컴퓨터에서는 localhost가 아니라 같은 공개 프론트 주소로 접속한다.

`/api/health`의 storage 값은 선택된 설정이며 실제 DB 연결 검사가 아니다. 연결 실패 시 메모리/샘플 데이터로 대체하지 않는다. `CAMPUS_SOURCE=demo`는 예전 4개 방 모임 API 검증용이고, `firestore`는 B의 전체 강의실 로더를 명시적으로 쓸 때만 선택한다.

## API

전문은 `contracts/api.md`. 모임 생성 POST `/api/meetups`는 201, 별도 사용자의 POST `/api/meetups/{id}/join`은 200과 증가한 `memberCount`를 반환한다. GET 목록/단건, POST leave/cancel도 제공한다. 강의실 GET `/api/rooms`, `/api/rooms/{id}`, `/api/buildings`는 실제 시드와 현재 모임을 함께 반영한다.

Firestore 날짜는 Timestamp, API는 ISO 8601 +09:00. 참여/나가기/취소는 트랜잭션으로 갱신한다. 동일 사용자 재참여는 인원을 늘리지 않는다. 생성 시 수업·다른 모임과 겹치면 409. 한 서버의 생성 요청만 직렬화하므로 단일 worker를 유지한다. 닉네임과 브라우저 저장 userId를 사용하는 대회 MVP이며 계정 인증은 포함하지 않는다.

## 검증

`backend/`에서:

```powershell
$env:PYTHONUTF8 = '1'
$env:PYTHONPATH = (Resolve-Path ..).Path
.venv\Scripts\python -m unittest discover -s tests -p 'test_*.py' -v
# 위 인증 로더와 CAMPUS_SOURCE=seed 설정 후, 비어 있는 포트 사용
.venv\Scripts\python -m scripts.verify_firestore --port 8011
# 공개 서버 검증 (이 경우 재시작은 하지 않음)
.venv\Scripts\python -m scripts.verify_firestore --base-url 'https://실제-백엔드-주소'
```

초기 32개 단위/통합 검사와 프론트 production build 통과 이력이 있다. 최신 아바타·챗봇·모임 관련 검사 31개가 통과했으며 전체 검사에서는 `tests/test_core.py`의 통합 fixture/import 경로와 이전 스텁 기대값 문제 1개가 남아 있다. 실제 Firestore 검사에서 26개 방 조회, 별도 요청의 모임 조회, 생성201, 다른 userId 참여200(1→2), 중복 참여 인원 유지, 로컬 서버 재시작 후 유지 확인. 새 아바타 저장 검사는 memory API와 모의 Firestore 어댑터 기준이며 공개 API의 avatar 응답 필드도 확인했다. 검증 스크립트는 고유 hostId로 생성한 자기 검증 문서만 정리한다. 기존 모임과 demo-m1을 초기화하지 않는다.

출처: [FastAPI 예외 처리](https://fastapi.tiangolo.com/tutorial/handling-errors/), [Render FastAPI 배포](https://render.com/docs/deploy-fastapi). 외부 구현 코드는 복사하지 않았다.

## 횃불ON 추천

오른쪽 아래 횃불이를 눌러 ‘3층에서 두 시간 공부할 곳’이라고 입력한다. Render의 bingang-api에 OPENAI_API_KEY를 등록하면 AI 의도 해석을 사용한다. OPENAI_MODEL 기본 gpt-4o-mini, CHAT_DAILY_CALL_LIMIT 기본200. 키가 없거나 AI 호출이 실패하면 기본 추천임을 명시한다. 상세 구현·제약·이미지 출처는 docs/torch-on.md, 프롬프트 로그는 docs/prompts/torch-on-v1.md에 있다. 두 서비스에 최신 be-a를 수동 배포해야 한다.
