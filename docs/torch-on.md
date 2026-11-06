# 횃불ON 시연용 구현 — 2026-11-06

사용자가 정보대만 대상으로 횃불이 페르소나 추천 기능의 구현을 요청했다. 이 작업에 필요한 frontend/와 backend/core/ 변경을 be-a에서 통합한다. 기존 모임 API·시간표 데이터는 유지한다.

- UI: 전역 레이아웃 오른쪽 아래 마스코트 → 횃불ON 대화창. 공식 기본/공부/열정 이미지로 대기·처리 중·추천 완료를 표현. 간단한 예시 질문, 대화 내역 최대 10개, 추천 카드→기준 시각을 유지한 강의실 상세→기존 모임 생성. 화면 표시 내역만 보관하고 다음 질문의 문맥으로 전달하지 않는다.
- 검색: 정보대/7호관, 현재 화면 기준 시각, 연속 이용 시간, 1~5층. 수업과 현재 모임을 제외하며 향후 모임 시작 시각도 여유 시간의 끝으로 계산. 길게 비는 순으로 최대 3개. 미래 날짜·특정 시작 시각 질문은 현재 지원 범위를 안내한다.
- 정확도: AI는 SearchIntent 구조만 생성한다. 강의실 id·층·남은 시간·이유·최종 문장은 서버의 검증된 데이터와 횃불이 말투 템플릿으로 구성한다. AI가 명시된 2시간/3층을 다른 값으로 해석해도 명시 조건은 우선한다. 조용함·콘센트·좌석 정보는 확인 불가로 안내한다.
- 위치: 한 건물만 다루며 실내 위치 데이터가 없다. GPS 권한 요청/가짜 도보 거리/임시 좌표 비교는 추가하지 않는다. 기존 API location 필드는 계속 받고 walkMinutes=null로 응답한다. 주변 요청에는 실내 거리 순서를 알 수 없다고 안내한다.
- API: POST /api/chat의 외부 요청·응답 필드/에러 형식 유지. 기존 stub 제거. 내부 LLM 출력은 기존 제안의 자유 추천 대신 SearchIntent로 바꿔 환각과 부정확한 시간 추천을 방지한다. docs/SPEC.md와 contracts/api.md는 수정하지 않았다.
- 장애: 키 없음·timeout·거부·잘못된 모델 출력·호출 제한 시 source=fallback. UI에 ‘기본 추천 · AI 연결 없이 조건 검색’을 표시한다. DB 오류는 기본 추천 성공으로 숨기지 않는다.
- OpenAI: OPENAI_API_KEY는 Render 서버에만 등록. OPENAI_MODEL 기본 gpt-4o-mini. 기존 SDK 사용, 새 패키지 없음. 질문 텍스트만 전송(사용자 id/좌표/모임 참여자 데이터 미전송), 질문·키 로그 없음. 요청별 timeout8초·retry0·최대출력350토큰·동시3개. CHAT_DAILY_CALL_LIMIT 기본200회(UTC일, 단일 프로세스 기준, 재시작 초기화, 금액 보장 한도가 아님). 0이면 AI 호출 없이 기본 추천.

## 이미지 출처

인천대학교 공식 횃불이 소개: https://www.inu.ac.kr/inu/731/subview.do
- idle.png: /sites/inu/images/sub/sub_06/character02.png
- thinking.png: /sites/inu/images/sub/sub_06/character05.png
- happy.png: /sites/inu/images/sub/sub_06/character09.png

원본 PNG를 수정 없이 사용. 권리자는 인천대학교이며 새 오픈소스 라이선스를 부여하지 않는다. 대화창에 캐릭터 출처와 ‘대회 시연용·학교 공식 챗봇 아님’을 표시한다.

## 검증

37개 backend unittest, frontend production build와 ESLint 통과. 테스트는 수업/현재·향후 모임/120분/층 조건, 결과 없음, 범위 밖 질문, 시설·거리 불확실성, OpenAI 장애와 필수 필드를 검증한다. 실제 OpenAI 호출과 공개 화면 검증 결과는 docs/log/be-a.md에 별도 기록한다.
