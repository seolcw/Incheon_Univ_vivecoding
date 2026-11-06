## 11:30 캠퍼스 시드·DB 초기화·API 스텁
- 바뀐 것: 건물 3개·층별 4실·총 36실 월–금 시드, seed_loader 조회 함수, Firebase get_client(memory=None), rooms/chat 고정 응답 스텁 추가. 로컬 Python 3.12.13 및 fastapi==0.162.0, firebase-admin==7.7.0, httpx==0.28.1(HTTP 검증용) 설치. main.py·requirements.txt 변경 없음.
- API 영향: GET /api/buildings, GET /api/rooms, GET /api/rooms/{roomId}, POST /api/chat은 쿼리·본문과 무관하게 계약 예시 JSON을 반환. source=llm도 고정 예시이며 실제 LLM 호출 없음. be-a는 두 router를 추가 prefix 없이 등록해야 함. get_room/get_building은 미등록 ID에 None 반환.
- 확인 방법: 루트에서 .venv\Scripts\python -m unittest backend.tests.test_core -v 실행, 4개 테스트 통과. 36실·금요일 eng-301~304·공학관 층별 빈 수 2/2/3·월–금 09:00~18:00 매분 상태 혼합·4개 HTTP 응답 계약 일치·memory 모드 확인.
- 남은 문제: Firebase 프로젝트·서비스 계정 발급 및 실제 Firestore 연결은 미확인. be-a의 라우터 등록과 의존성 버전 반영 필요. httpx TestClient 사용 중 Starlette deprecation 경고 1건(테스트 통과). availability·추천·LLM 미구현.
