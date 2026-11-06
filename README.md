# Incheon_Univ_vivecoding
인천대학교 6시간 바이브코딩 대회 팀 프로젝트

---

# 바이브 코딩 대회 — 프론트엔드 디자인 환경

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
