## 11:30 캠퍼스 시드·DB 초기화·API 스텁
- 바뀐 것: 건물 3개·층별 4실·총 36실 월–금 시드, seed_loader 조회 함수, Firebase get_client(memory=None), rooms/chat 고정 응답 스텁 추가. 로컬 Python 3.12.13 및 fastapi==0.162.0, firebase-admin==7.7.0, httpx==0.28.1(HTTP 검증용) 설치. main.py·requirements.txt 변경 없음.
- API 영향: GET /api/buildings, GET /api/rooms, GET /api/rooms/{roomId}, POST /api/chat은 쿼리·본문과 무관하게 계약 예시 JSON을 반환. source=llm도 고정 예시이며 실제 LLM 호출 없음. be-a는 두 router를 추가 prefix 없이 등록해야 함. get_room/get_building은 미등록 ID에 None 반환.
- 확인 방법: 루트에서 .venv\Scripts\python -m unittest backend.tests.test_core -v 실행, 4개 테스트 통과. 36실·금요일 eng-301~304·공학관 층별 빈 수 2/2/3·월–금 09:00~18:00 매분 상태 혼합·4개 HTTP 응답 계약 일치·memory 모드 확인.
- 남은 문제: Firebase 프로젝트·서비스 계정 발급 및 실제 Firestore 연결은 미확인. be-a의 라우터 등록과 의존성 버전 반영 필요. httpx TestClient 사용 중 Starlette deprecation 경고 1건(테스트 통과). availability·추천·LLM 미구현.

## 11:49 시간·위치 검색 API와 Firestore 실데이터 확인
- 바뀐 것: rooms 고정 응답을 시간·건물·층·상태·최소 여유 시간 검색으로 변경, availability 상태·겹침 계산 및 읽기 전용 모임 연동 추가. 사용자 승인으로 main.py·CORS·오류 핸들러·requirements.txt·.env.example 생성. 새 설치 라이브러리 uvicorn==0.34.0. 키는 외부 파일에서 프로세스 환경 변수로만 읽고 저장소에 복사하지 않음.
- API 영향: GET /api/buildings·/api/rooms·/api/rooms/{roomId}·/api/health 실행 가능. at 서울 시각·분 정규화, 400 VALIDATION_ERROR·404 NOT_FOUND·500 INTERNAL_ERROR 공통 형식. 프론트 전달 문서 backend/core/README.md, 실행 시 /docs·/openapi.json. AI 스텁은 서버에 등록하지 않음.
- 확인 방법: 제공 키로 Firestore 읽기 성공(classrooms 2,834행, 공간 375개, 요일 누락 32행). unittest 7개 통과, 실제 uvicorn 8000 기동 후 금 15:10 공학관 3층·60분 필터로 301/303/304호 반환 및 OpenAPI 확인 후 검증 서버 종료. 현재 검색 데이터는 시드이며 실제 시간표 기반 결과는 아직 검증하지 않음.
- 남은 문제: classrooms.slots가 수업 시간인지 빈 시간인지와 실제 DB를 사용하도록 SPEC 기준을 바꿀지 사용자 답변 대기. 답변 전에는 실제 DB 시간표를 검색에 연결하지 않음. 요일 누락 행 처리와 실제 데이터의 위치·정원 등 없는 필드 정책 필요. be-a 모임 API 병합 시 라우터·CORS POST 허용 결합 필요. 기존 Starlette 테스트 deprecation 경고 1건.

## 12:14 실제 Firestore 시간표 검색·B 인터페이스·발표 초안
- 바뀐 것: 사용자가 slots=수업 시간과 실제 Firestore 사용을 확정하여 가상 36개/v1 집계 대신 classrooms 변환 로더 연결. 건물·호수별 병합, 대표 문서 ID, 지하/접미 호수, 중첩 수업 정리, 요일 누락 공간 전체 제외. 모임 직접 조회 브리지는 A meetup_repo.list_open 위임으로 교체. 정원·좌표 미등록=0, 시설=[], map은 개략도이며 FE 표시 규칙 문서화. 추가 패키지 설치 없음(앞선 설치: uvicorn 0.34.0). 발표 6장 PDF·PPTX 초안, 5분 발화 메모, docs/prompts/be-b-real-data.md 생성.
- API 영향: /api/buildings·/api/rooms·/api/rooms/{roomId} 경로·필드·타입 유지. buildingId는 실제 건물 번호 문자열, roomId는 대표 Firestore 문서 ID. default source는 firestore(STORAGE=memory는 명시적 데모 모드); CAMPUS_SOURCE로 지정 가능. 로딩은 프로세스당 1회, A 시작 시 load_campus 호출 권장. A errors.ApiError·repo 계약 필요. /chat은 기존 스텁만 유지. docs/SPEC.md·contracts/·A 공통 파일은 이번 작업에서 수정하지 않음.
- 확인 방법: unittest 16개 통과. 실제 Firestore 2,834행→375공간 중 29개 제외→346공간·20건물. 인문대학 buildingId=15, 금15:10, empty,60분 필터 22개와 상세·건물합계 확인(live_verification.json). 실제 meetups가 빈 컬렉션임을 확인하고 B 라우터 실조회에서는 빈 목록을 주입했으므로 A 통합검증과 구분. 발표 PPTX 구조·레이아웃·재import 검사 통과, PDF 6장 개별 렌더 확인(한글·잘림 없음).
- 남은 문제: 실제 데이터 전환의 SPEC 반영은 사람 담당. A repo·모임 라우터 미공유로 409 연동·생성/참여·두 기기·배포/CORS 미검증. 기존 eng-* 데모 모임은 실데이터 ID로 A/FE가 조정해야 함. 키의 실제 A 전달과 발표 리허설·최종 제출은 미완료. 발표는 통합 대기 표시가 있는 초안. 이전 승인으로 만든 미추적 main.py·requirements.txt·.env.example·api_support.py는 이번 커밋 제외. 테스트의 기존 Starlette deprecation 경고는 통과에 영향 없음.
