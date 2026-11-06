# 빈강 — 빈 강의실에서 시작하는 대학 생활

인천대학교 정보대(7호관)의 시간표로 빈 강의실을 찾고, 모임을 만들고 참여하는 웹 서비스입니다. 오른쪽 아래 횃불이 챗봇은 자연어 강의실 추천과 일상 대화를 제공합니다.

2026-11-06 「AI로 다시 쓰는 대학 생활」 바이브코딩 대회 제출 저장소입니다.

## 바로 사용하기

- **[공개 웹 서비스](https://bingang-web.onrender.com)**
- **[대회 시연 링크 — 2026-11-10 화요일 14:10 기준](https://bingang-web.onrender.com/?at=2026-11-10T14%3A10%3A00%2B09%3A00)**
- [API 문서 (Swagger)](https://bingang-api.onrender.com/docs)
- [GitHub 저장소](https://github.com/seolcw/Incheon_Univ_vivecoding)

무료 Render 인스턴스가 대기 중이면 첫 접속에 시간이 걸릴 수 있습니다. 노트북과 폰에서 같은 시연 링크를 열고 서로 다른 닉네임을 설정하세요.

## 구현한 기능

| 기능 | 내용 |
| --- | --- |
| 빈 강의실 찾기 | 정보대 1–5층, 강의실 26개의 가공된 실제 시간표와 모임을 반영해 상태·이용 가능 시간을 표시 |
| 캠퍼스와 층별 보기 | 캠퍼스 시각화에서 정보대를 선택하고 층별 도면과 강의실 상세로 이동 |
| 모임 만들기·참여 | 시간 슬라이더로 모임 시간 선택, 다른 기기에서 참여·나가기, 주최자 취소, 프로필 아바타 표시 |
| 횃불이 AI | 오른쪽 아래 마스코트를 눌러 작은 대화창 열기, 자연어 추천·일상 대화·최근 대화 문맥 반영 |
| 위치를 반영한 추천 | 위치 허용 시 건물까지 직선거리를 80m/분으로 환산한 도보 예상 시간 표시. 2km 초과는 안내 제외, 직접 말한 현재 층은 가까운 층 우선 추천에 반영 |

모임은 Firestore에 저장되며 다른 사용자의 변경은 약 10초마다 갱신합니다. 강의실 데이터는 `CAMPUS_SOURCE=seed`로 저장소의 시간표를 읽습니다. 사용자 좌표는 GPT에 전송하거나 로그·DB에 저장하지 않습니다.

## 3분 시연 순서

1. 두 기기에서 시연 링크를 열고 닉네임·아바타를 설정합니다.
2. 정보대 → 3층 → 302호에서 비어 있는 시간과 시간표를 확인합니다.
3. 302호에 14:10–16:10, 정원 4명으로 모임을 만듭니다. 두 번째 기기에서 모임 목록을 열어 참여하고 인원이 늘어나는지 확인합니다.
4. 횃불이를 눌러 “7호관에서 2시간 공부할 곳 찾아줘”, “3층에 있어”라고 말하거나 일상 대화를 나눕니다.

수업·모임 상태는 선택한 기준 시각에 따라 달라집니다. 시연 날짜가 지난 뒤에는 미래의 빈 시간으로 변경해야 모임에 참여할 수 있습니다.

## 기술 구성

- 프론트: Next.js 16.4.5, React 19.3, TypeScript, Tailwind CSS, shadcn/ui, SWR, Three.js.
- 서버: Python 3.12, FastAPI. 강의실 계산과 AI 추천 조건 검증은 서버에서 처리합니다.
- 저장: Firebase Firestore (`meetups`), 로컬 검증용 memory 저장소.
- AI: OpenAI API (`gpt-4o-mini` 기본값). 키가 없거나 호출에 실패하면 기본 응답임을 표시합니다.
- 배포: Render `bingang-web` / `bingang-api`. 현재 두 서비스의 배포 브랜치는 `be-a`이며 제출 통합 브랜치는 `main`입니다.

## 로컬 실행 (PowerShell)

Python 3.12와 Node.js 22를 설치한 뒤 저장소 루트에서 실행합니다. 키 없이 실행하는 예시이며 모임은 서버 재시작 시 초기화됩니다.

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
$env:STORAGE = 'memory'
$env:CAMPUS_SOURCE = 'seed'
$env:CORS_ORIGINS = 'http://localhost:3000'
.venv\Scripts\python -m uvicorn main:app --port 8000 --workers 1
```

다른 PowerShell 창에서 저장소의 `frontend/` 폴더로 이동합니다.

```powershell
npm.cmd ci
$env:NEXT_PUBLIC_API_URL = 'http://localhost:8000'
$env:NEXT_PUBLIC_USE_MOCK = '0'
npm.cmd run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. 실제 Firestore 연결 방법과 환경변수는 [백엔드 실행 안내](backend/README.md), [환경변수 예시](backend/.env.example)를 참고하세요. 인증 JSON은 저장소 밖에 보관하고 `FIREBASE_SERVICE_ACCOUNT_JSON`, `OPENAI_API_KEY`는 서버 환경변수로만 설정합니다. 백엔드는 `.env`를 자동으로 읽지 않습니다.

## 문서와 검증 기록

- [초기 설계](docs/SPEC.md) / [실제 정보대 데이터로 변경한 범위](docs/scope-change.md) / [API 계약](contracts/api.md)
- [횃불이 구현·출처](docs/torch-on.md) / [아바타·위치 추천 인계](docs/be-a-final-handoff.md)
- [AI 프롬프트 로그](docs/prompts/) / [프론트 작업 기록](docs/log/fe.md) / [백엔드 A 작업 기록](docs/log/be-a.md) / [백엔드 B 작업 기록](docs/log/be-b.md)
- 기능 통합 커밋 `6efc2b6`으로 두 Render 서비스 배포 성공, 공개 API 응답·실제 모임 조회 확인. 아바타·챗봇·모임 관련 검사 31개 통과. 실제 Firestore 생성·참여·재시작 후 유지 검증 이력은 백엔드 작업 기록에 있습니다.
- 전체 검사 중 `tests/test_core.py`의 통합 테스트 1개는 fixture/import 경로와 이전 스텁 기대값 조정이 남아 있습니다. 전체 검사 통과로 보고하지 않습니다. 실제 폰·두 물리 기기의 최종 시연은 팀에서 확인합니다.

## 시연 범위와 출처

정보대 단일 건물 시연이며 휴강·보강, 실제 문 개방 여부와 시설 사용 승인은 확인하지 않습니다. 모임은 공간 예약이 아닙니다. 닉네임과 브라우저 userId로 구분하는 대회용 구현이며 계정 인증·모임원 간 채팅·푸시 알림은 포함하지 않습니다.

- 시간표: 팀이 제공한 2026-2학기 강의실 시간표 가공 데이터. 실제 사용 데이터는 [campus.json](backend/seed/campus.json)입니다.
- 횃불이 이미지: [인천대학교 공식 캐릭터 소개](https://www.inu.ac.kr/inu/731/subview.do). 권리자는 인천대학교이며 비공식 대회 시연용입니다.
- 정보대 위치: [인천대학교 공식 캠퍼스 지도](https://www.inu.ac.kr/inu/739/subview.do), 2026-11-06 확인. 실내 층 위치는 GPS로 추측하지 않습니다.
- 디자인 도구와 참고 자료의 출처는 아래 기존 개발 환경 기록에 보존했습니다.

---

<details>
<summary>초기 프론트엔드 디자인 환경 및 도구 출처</summary>

아래는 프로젝트 시작 당시 설정 기록이며 현재 실행 방법은 위 안내를 따릅니다.

## 바이브 코딩 대회 — 프론트엔드 디자인 환경

현재 프로젝트에 Claude Code용 Hallmark와 Impeccable을 설치했다. 앱 프레임워크는 대회 주제가 정해진 후 추가한다.

## 시작하기

이 폴더에서 `claude`를 실행한다. 이미 열려 있던 Claude Code 세션은 다시 시작한 뒤 `/skills`에서 `hallmark`, `impeccable`을 확인한다. 새로 설치한 스킬은 다음 세션/턴에서 다시 탐색해야 보일 수 있다.

```sh
claude
```

아래 명령은 **Claude Code 채팅 입력창**에 입력한다. 일반 터미널 명령이 아니다.

```text
/design [대회 주제, 대상 사용자, 핵심 화면, 원하는 분위기]
/impeccable init
/hallmark audit [구현된 파일 또는 경로]
/impeccable critique [화면 또는 컴포넌트]
/impeccable polish [화면 또는 컴포넌트]
/impeccable audit [화면 또는 컴포넌트]
```

`/design`은 Claude Code 내장 기능으로 로컬 설치 대상이 아니다. 이 컴퓨터의 CLI 버전은 2.1.318이다. 로그인한 계정의 기능 제공 여부는 Claude Code에서 `/design`을 입력해 확인해야 한다. 필요하면 Claude Code의 `/login`으로 Max 계정에 로그인한다. 이 설정 과정에서는 디자인 생성이나 유료 모델 호출을 실행하지 않았다.

Hallmark는 새 페이지도 만들 수 있다: `/hallmark [요청]`. 이미 선택한 디자인을 다듬을 때는 `audit`부터 사용하고, 구조를 바꿀 때만 `/hallmark redesign [경로]`를 사용한다. Impeccable은 현재 통합 명령 형식(`/impeccable polish ...`)을 사용한다.

## 터미널에서 검사하기

의존성은 설치되어 있다. 다른 컴퓨터에서 복제한 경우 프로젝트 루트에서 `npm ci`를 실행한다. 브라우저 검사에는 Chrome 또는 Chromium이 필요하며, 자동 탐지가 안 되면 실행 파일 경로를 `CHROME_PATH`로 지정한다. Node 22.12 이상이 필요하다.

아래 `src`, 개발 서버 URL, HTML 경로는 실제 앱에 맞춰 바꾼다.

```sh
# Hallmark 정적 검사
npm run design:hallmark -- src

# 실행 중인 앱의 브라우저 검사
npm run design:hallmark -- src --render --url http://localhost:5173

# Impeccable 소스 검사와 렌더링 검사
npm run design:detect -- src
npm run design:detect -- http://localhost:5173

# 로컬 HTML 페이지 브라우저 검사
npm run design:hallmark -- ./index.html --render
```

검사 결과의 스타일 제안은 선택한 디자인과 함께 판단한다. Impeccable `detect`의 종료 코드는 0=발견 없음, 2=발견 있음, 1=검사 오류다.

## 구성

| 경로 | 용도 |
| --- | --- |
| `.claude/skills/hallmark/` | Hallmark 본체, 테마, 브라우저/정적 검사 도구 |
| `.claude/skills/impeccable/` | Impeccable 4.8.0 및 로컬 실행 엔진 |
| `.claude/agents/` | Impeccable 공식 설치기가 제공한 작업별 에이전트 정의 |
| `.claude/settings.json` | 두 스킬의 프로젝트 자동 검사 훅 |
| `CLAUDE.md` | 디자인 작업 순서와 백엔드 협업 원칙 |
| `design-skills.lock.json` | 설치 출처, 버전, 파일 해시 |
| `package.json`, `package-lock.json` | 브라우저 검사 의존성과 실행 스크립트 |

자동 훅은 프로젝트를 신뢰한 Claude Code에서 세션 시작, UI 파일 편집, 응답 종료 시 동작한다. Claude Code의 `/hooks`에서 등록 상태를 볼 수 있다. 프로젝트 파일만 변경했으며 사용자 전역 스킬/권한 설정은 변경하지 않았다. Impeccable live 모드의 복사 적용은 현재 채팅 에이전트를 사용하도록 설정했다.

PRODUCT.md와 DESIGN.md는 제품 정보 및 선택한 화면이 생긴 후 작성한다. 실제 한국어 폰트, 색상, 간격, 컴포넌트 규칙을 여기에 기록해 두 스킬이 같은 기준을 사용하게 한다.

## 공식 출처 및 업데이트

- [Hallmark / Together AI](https://github.com/Nutlope/hallmark): 커밋 `407fa689f4a276f2fd389208d271d0fef08f5058`의 `skills/hallmark`를 프로젝트에 설치했다. MIT 라이선스가 폴더에 포함되어 있다.
- [Impeccable / Paul Bakaus](https://github.com/pbakaus/impeccable): `npx --yes impeccable@4.8.0 install --providers=claude --scope=project --yes` 공식 설치기로 설치했다. Apache-2.0 라이선스를 함께 보관한다.
- [Claude Code 스킬 문서](https://code.claude.com/docs/en/skills), [Claude Code 공식 변경 기록](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md).

대회 중 자동 업데이트는 하지 않는다. 대회 후 업데이트할 때는 변경 내용을 검토하고 설치 버전과 해시 기록을 함께 갱신한다. Impeccable 공식 설치기는 훅을 `.claude/settings.local.json`에 쓸 수 있으므로, 업데이트 후 공유 설정과 중복 등록되지 않았는지 확인한다.

</details>
