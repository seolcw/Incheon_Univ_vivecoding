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
