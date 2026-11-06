# 2026 바이브 코딩 대회

@AGENTS.md

## Claude Code의 역할

- 이 저장소에서 Claude Code의 역할은 fe다. 수정 범위는 frontend/, 작업 기록은 docs/log/fe.md.
- 최초 SPEC v0 생성을 지시받으면 AGENTS.md '기준 문서'의 예외에 따라 docs/와 contracts/에 파일을 만든다.
- 루트의 디자인 도구(package.json의 design:* 스크립트, .claude/)는 fe가 관리한다.
- docs/SPEC.md와 contracts/api.md가 있으면 아래의 "아직 정하지 않았다"는 설명보다 그 문서를 우선한다.

## 대회 정보

- 대회 시작: 2026-11-06 오전 10시 (Asia/Seoul).
- 역할: 사용자 = 프론트엔드와 디자인, 팀원 2명 = 백엔드.
- 현재는 디자인 도구만 준비한 상태다. 제품 주제, 화면, 프레임워크, API는 아직 정하지 않았다. 제품 사실이나 API를 추측해 확정하지 않는다.
- 한국어로 소통한다.

## 디자인 작업 순서

1. 사용자가 선호하는 Claude Code 내장 `/design`으로 화면 방향을 정한다. 이 명령은 로컬 커스텀 스킬로 덮어쓰지 않는다.
2. 주제와 대상 사용자가 정해지면 `/impeccable init`으로 PRODUCT.md를 작성한다. 선택된 디자인과 실제 코드가 생기면 `/impeccable document`로 DESIGN.md를 정리한다.
3. 기존 `/design` 결과를 다듬을 때는 선택한 레이아웃, 색상, 글꼴과 기능을 유지한다. `/hallmark audit <대상>`으로 검토하고, 전체 재설계는 사용자가 요청할 때 `/hallmark redesign <대상>`으로 실행한다.
4. `/impeccable critique <대상>` → 필요한 개선 → `/impeccable polish <대상>` → `/impeccable audit <대상>` 순으로 좁은 범위부터 진행한다.
5. 두 스킬의 스타일 규칙이 충돌하면 사용자가 선택한 디자인과 제품 요구사항을 우선한다. 스킬별로 별도의 디자인 시스템을 만들지 않는다. Hallmark가 design.md를 찾으면 기존 DESIGN.md를 사용한다(기본 macOS에서는 대소문자가 같은 파일로 취급된다).

## 구현과 검증

- 프레임워크를 추가할 때 기존 package.json의 design:* 스크립트와 개발 의존성을 유지하며 병합한다.
- 백엔드와 먼저 API 요청/응답, 오류 형식, 인증 방식을 합의한다. API 호출을 UI와 분리하고, 미완성 연동의 목업은 명시적으로 표시한다.
- 실제 성공/실패, 로딩, 빈 상태, 긴 한국어 문구, 키보드 포커스와 모바일 레이아웃을 확인한다.
- Hallmark의 브라우저 검사는 로컬 puppeteer-core와 설치된 Chrome을 사용한다. 실제 프론트엔드가 생기면 실행 예: `npm run design:hallmark -- src --render --url http://localhost:5173` (실제 소스 경로와 포트에 맞춘다).
- Impeccable 검사 예: `npm run design:detect -- src` 및 `npm run design:detect -- http://localhost:5173`.
- 자동 훅은 Write/Edit 등의 UI 파일 변경을 검사한다. 셸로 수정한 파일은 위 CLI로 직접 검사한다.
- 자세한 실행법과 설치 출처는 README.md를 읽는다.
