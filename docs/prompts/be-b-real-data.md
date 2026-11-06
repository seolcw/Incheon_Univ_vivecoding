# be-b 프롬프트·결정·검증 기록

2026-11-06 / 강산 / Codex / be-b. 비밀키 내용은 포함하지 않는다.

## 요청과 채택 기준

1. 사용자: Firestore DB를 읽어 시간·위치에 맞는 강의실 호수를 알려 주는 프로그램과 React 연동 API를 요청.
2. 에이전트: AGENTS.md, docs/SPEC.md, contracts/api.md와 기존 코드를 확인. 기존 SPEC은 가상 36개 강의실을 사용하므로 데이터 기준과 slots의 의미를 확인.
3. 사용자: be-b 역할 이슈를 제공하고 “slot은 각 강의의 수업 시간”이라고 확정. main.py·requirements.txt·모임 repo·배포는 A 소유임을 재지정.
4. 에이전트: 가상 시드가 백엔드의 예제 시간표라는 점과 최초 실데이터 요청의 차이를 설명.
5. 사용자 최종 선택: “처음 요청대로 실제 Firestore 시간표를 사용해 주세요.”

최종 채택: 실제 classrooms 수업 시간표를 기준으로 검색. 가상 36개·v1 집계 기대값은 적용하지 않는다. slots는 점유 구간이다. API 경로·필드·타입은 유지한다. docs/SPEC.md와 contracts/api.md는 변경하지 않고 전환 사항을 인계 문서에 기록했다.

## 구현에서 채택한 내용

- 건물·호수별 수업 행을 모으고 겹치는 구간을 합침. 대표 Firestore 문서 ID를 roomId로 사용.
- 호수의 A/B 접미사·하이픈·지하 표기 유지. 수업이 있는 토요일도 실제 요일에 맞게 계산.
- 요일이 없는 행을 무시하고 빈방으로 표시하면 오안내가 생기므로 해당 공간 전체를 제외.
- 정원·좌표가 없으므로 미등록 값 0, 시설은 빈 목록. 프론트에서 숨기도록 문서화. map은 개략 격자.
- 운영 [09:00,22:00), 우선순위 closed→class→meetup→empty. 끝점 접촉 허용, 1분 중첩은 충돌. 예정 모임은 수업까지 남은 시간에 영향 없음.
- 모임은 A의 meetup_repo.list_open으로 위임. 초기 직접 Firestore 조회 브리지를 제거하고 저장소 중복을 해소.
- A의 errors.ApiError와 전역 예외 핸들러에 연결하도록 구성. B 테스트는 A 인터페이스 대체물을 명시적으로 주입.

## 검증 증거

- unittest 16개 통과: 수업 종료·운영 시간·주말·1분 충돌·수업 직전/직후·모든 open 모임·접촉·취소·현재/예정 모임·필터·상세·오류·실제 스키마 변환·memory 초기화·repo 호출.
- 실제 Firestore 읽기 성공: 수업 행 2,834개, 원본 공간 375개, 요일 누락 공간 29개 제외, 검색 가능 346개, 건물 20개.
- 실제 B 라우터 조회: buildingId=15, at=2026-11-06T15:10:00+09:00, status=empty, minFreeMinutes=60 → 22개. 건물 요약·강의실 상세도 확인.
- 실제 meetups 컬렉션이 비어 있음을 확인하고 이 검색 검증에는 빈 모임 목록을 주입했다. A repo의 생산 환경 통합 검증으로 간주하지 않는다.
- 증거 파일: backend/core/live_verification.json. 테스트 실행: `.venv\Scripts\python -m unittest backend.tests.test_core -v`.

## 수정·제외·미확인

- 초기의 가상 시드 기반 설명과 테스트는 실제 시간표 기준으로 수정. 제공된 v1 원문 전체는 찾지 못했으나 실데이터 전환 확정 후 해당 원문의 시드 전체 값은 구현 기준에서 제외.
- 앞선 요청에서 예외 승인받아 만든 공통 서버 파일은 이번 B 커밋에서 제외. 이번 작업에서는 main.py·requirements.txt·CORS·include_router를 수정하지 않음.
- recommend.py·llm.py·LLM 호출은 시작하지 않음. chat은 계약 예시 스텁이며 AI 기능 완성으로 보고하지 않음.
- 모임 생성 HTTP 409·폰 참여·10초 폴링·실배포는 A/FE 통합 대기. 미확인 항목을 완료 표시하지 않음.
- 발표는 실제 데이터 기준의 5분 초안으로 작성. 모임 시연 구간은 통합 후 진행할 순서로 표시. 발표 직전 배포 URL·두 기기 검증 결과를 반영해야 함.

## 도구

Codex 코드 편집·로컬 Python unittest·FastAPI TestClient·Firebase Admin SDK의 읽기 전용 조회·GitHub 읽기(이슈/계약)·Presentations/PDF 스킬. 서버 환경 변수에만 자격증명을 전달했고 코드·이슈·로그에는 저장하지 않았다.
