# 팀 규칙 (모든 AI 에이전트 공통)

## 역할
- fe: 프론트 (Mac, Claude Code)
- be-a: 백엔드 A (Windows, Codex). CRUD API, DB, 배포
- be-b: 백엔드 B (Windows, Codex). AI 기능, 핵심 로직
- 내가 어느 역할인지는 각자의 개인 설정 파일(CLAUDE.md 또는 ~/.codex/AGENTS.md)에 적혀 있다.

## 스택 기본값
- 프론트는 Next.js, 백엔드는 FastAPI(Python), 데이터는 Firebase(Firestore, 필요하면 Auth)다.
- SPEC의 '기술 결정'이 백엔드를 C#으로 정했다면 이 문서의 Python 항목은 C# 대응 항목으로 읽는다. (main.py → Program.cs, pathlib → Path.Combine)

## 기준 문서
- 구현 전에 docs/SPEC.md와 contracts/api.md를 먼저 읽는다. SPEC과 다르게 구현하지 않는다.
- 구현 대상은 SPEC의 MVP다. SPEC의 '시간 나면' 목록과 docs/proposals.md는 사람이 MVP로 옮기기 전까지 구현하지 않는다.
- docs/SPEC.md와 contracts/는 수정하지 않는다. 바꿔야 하면 고치지 말고 사람에게 알린다.
- 예외: 사람이 최초 SPEC v0 생성을 지시한 작업에 한해 docs/SPEC.md, contracts/api.md, docs/prompts/pro-spec-v1.md를 새로 만들 수 있다. 생성 이후에는 사람이 수정한다.

## 수정 범위
- fe: frontend/
- be-b: SPEC의 담당 분배에서 정한 핵심 로직 폴더와 Firebase 초기화 코드(backend/core/, backend/seed/, backend/db.py, backend/tests/test_core.py)
- be-a: be-b 범위를 제외한 backend/ 전체, 공통 파일(main.py, requirements.txt), 저장소 루트 설정
- 누구나 자기 작업 기록 파일에는 추가할 수 있다. (아래 '작업 기록')
- 범위 밖 파일을 고쳐야 하면 고치지 말고 사람에게 알린다. 예: be-b가 main.py에 라우터 등록 한 줄이 필요하면 be-a에게 요청한다.

## API 형식
- 경로는 /api/ 로 시작한다.
- JSON 필드는 camelCase, 날짜는 ISO 8601 문자열 (날짜만 쓰면 YYYY-MM-DD). Pydantic 모델은 alias_generator=to_camel, populate_by_name=True로 camelCase를 주고받는다.
- id는 Firestore 문서 ID이며 문자열이다.
- 에러 응답: {"error": {"code": "ERROR_CODE", "message": "화면에 보여줄 한국어 문장"}}
- FastAPI 기본 에러({"detail": ...})와 422 검증 오류도 exception handler로 이 형식으로 바꾼다. 검증 오류는 400 VALIDATION_ERROR다.
- 로컬 포트: 프론트 3000, 백엔드 8000.
- 배포(Render) 시작 명령: uvicorn main:app --host 0.0.0.0 --port $PORT
- 프론트는 API 주소를 NEXT_PUBLIC_API_URL에서 읽는다. 이 값은 빌드할 때 고정되므로 바꾸면 다시 빌드·배포한다.
- CORS 허용 Origin은 http://localhost:3000과 배포된 Vercel 주소(https://...)를 경로와 마지막 / 없이 등록한다.

## 데이터 (Firebase)
- 서버는 firebase-admin으로 Firestore에 접근한다. 서비스 계정 키는 FIREBASE_SERVICE_ACCOUNT_JSON 환경 변수에서 읽고, 키 파일을 저장소에 두지 않는다.
- 프론트는 FastAPI만 호출하고 Firestore에 직접 접근하지 않는다. 예외는 SPEC의 '기술 결정'에 적힌 것만이다. (예: Firebase Auth 로그인, 실시간 구독)
- Firestore 필드명은 API와 같은 camelCase로 저장한다. 시각은 Firestore Timestamp로 저장하고 응답에서 ISO 8601로 바꾼다.
- firebase-admin은 동기 SDK다. async def 안에서 직접 호출하지 않고 라우트를 def로 쓴다.
- Cloud Storage는 Blaze 요금제(결제 수단 등록)가 필요하므로 사람이 승인하기 전에는 쓰지 않는다.
- 데모 시드 데이터는 여러 번 실행해도 중복되지 않는 스크립트로 넣는다.

## Mac · Windows 공통
- 프론트 파일명은 소문자 kebab-case, Python 파일과 폴더는 소문자 snake_case. 참조 경로는 대소문자까지 일치시킨다.
- npm scripts는 Mac과 Windows 모두에서 동작해야 한다. rm, cp, VAR=값 형태를 쓰지 않는다.
- 경로는 문자열로 이어 붙이지 않는다. (Node: path.join, Python: pathlib.Path)
- 텍스트 파일을 열 때는 항상 encoding="utf-8"을 명시한다. (한글 Windows의 기본 인코딩은 cp949)
- Python 의존성은 backend/requirements.txt에 버전을 고정해 적는다.
- 사람에게 안내하는 터미널 명령은 그 사람의 셸 기준으로 쓴다. (Mac: zsh, Windows: PowerShell)
- Windows에서는 가상환경을 activate하지 않고 .venv\Scripts\python으로 실행한다. (PowerShell 실행 정책에 막힐 수 있음)

## 작업 방식
- SPEC의 '기술 결정'을 따른다. 같은 일을 다른 라이브러리로 하지 않는다.
- 새 라이브러리를 추가하면 변경 요약에 적는다.
- API 키 같은 비밀 값은 코드와 커밋에 넣지 않는다. .env.example에는 변수 이름만 둔다.
- 커밋은 자기 브랜치(fe, be-a, be-b)에 하고, 메시지 앞에 [fe] [be] [spec] 중 하나를 붙인다.
- docs/pro/의 Pro 결과를 반영할 때는 현재 코드를 다시 읽고 지시된 변경만 반영한다. 파일이나 모듈을 통째로 교체하지 않는다.

## 멈추는 기준
- 작업 지시의 완료 기준을 만족하면 더 다듬지 말고 멈추고 보고한다.
- 완료 확인은 한 번: 완료 기준의 대표 흐름을 실제 입력과 결과로 한 번 확인하고, 관련 빌드나 실행까지 통과하면 끝낸다. 그 밖의 테스트나 리팩터링은 늘리지 않는다.
- 엣지 케이스는 데모 시나리오에 나오거나 핵심 흐름을 멈추게 하는 것만 처리한다.
  나머지는 작업 기록의 '남은 문제'에 한 줄로 적는다.
- 같은 문제로 3번 실패하면 멈추고 시도한 내용을 보고한다.

## 작업 기록
- 기능 하나를 끝내면 자기 역할의 기록 파일 맨 아래에 추가한다: fe → docs/log/fe.md, be-a → docs/log/be-a.md, be-b → docs/log/be-b.md
- 형식: "## HH:MM 기능 이름" 제목 아래에 바뀐 것 / API 영향 / 확인 방법 / 남은 문제를 한 줄씩.
