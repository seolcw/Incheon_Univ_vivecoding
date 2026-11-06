# be-a 서버 첫 작업 구간

현재 구현은 SPEC 6절 10:45–11:30 범위다. FastAPI 서버·CORS·공통 오류·상태 확인과 메모리 모임 저장소가 있다. 모임 생성·참여 HTTP API, Firestore 저장소, be-b 라우터 등록은 다음 작업이다.

## 실행 (Windows PowerShell, Python 3.12)

아래 명령은 저장소의 `backend/` 폴더에서 실행한다. 이미 `.venv`가 있으면 생성·설치를 생략할 수 있다.

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements-dev.txt
$env:STORAGE = "memory"
$env:CORS_ORIGINS = "http://localhost:3000"
.\.venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000 --workers 1
```

다른 PowerShell 창에서 확인:

```powershell
Invoke-RestMethod http://localhost:8000/api/health
```

`{"status":"ok","storage":"memory","time":"현재 한국 시각 ISO 8601","version":"0.1.0"}` 형태가 반환된다. `/api/missing`은 HTTP 404와 `{"error":{"code":"NOT_FOUND","message":"..."}}`를 반환한다. Swagger는 `http://localhost:8000/docs`에서 볼 수 있다.

검증:

```powershell
.\.venv\Scripts\python -m unittest discover -s tests -p "test_*.py" -v
.\.venv\Scripts\python -m pip check
```

## 환경변수와 저장소

- `.env.example`은 변수 이름 목록이다. `.env`를 자동 로드하지 않으므로 PowerShell `$env:...` 또는 배포 환경변수로 설정한다.
- 현재는 반드시 `STORAGE=memory`로 실행한다. 계약상 생략 시 기본값은 `firestore`지만 Firestore 저장소는 아직 구현하지 않았다. Firestore 선택 상태에서 저장소 호출 시 명시적으로 실패하며 메모리로 몰래 전환하지 않는다.
- `/api/health`는 서버 생존과 선택한 저장 모드만 표시한다. Firestore 접속 검사가 아니다.
- `CORS_ORIGINS`는 쉼표로 구분한다. 생략 시 `http://localhost:3000`. 배포 시 실제 프론트 Origin을 추가한다.
- `FIREBASE_SERVICE_ACCOUNT_JSON`, `OPENAI_API_KEY`, `OPENAI_MODEL`은 현재 단계에서 읽거나 호출하지 않는다.
- 메모리는 프로세스 하나에서만 공유된다. 재시작·재배포 시 데이터가 사라진다. 시연에서는 `--workers 1`을 유지한다.

`meetup_repo.get_repo()`는 공유 저장소를 반환한다. `save(record)`는 전체 원본을 id로 upsert하고, `get(id)`는 원본 또는 `None`을 반환한다. `list_open(room_id=None)`은 open 모임만 시작 시각 순으로 반환한다. 기간 필터는 호출자가 `at`로 계산한다. 날짜는 오프셋을 포함한 ISO 문자열이며, 필드명과 타입은 `MeetupRecord`에 있다. 반환 데이터와 중첩 members는 복사본이다. 개별 저장·조회에는 잠금을 쓰지만, 생성 중복 검사·참여 정원 검사와 쓰기를 묶는 원자적 처리는 다음 모임 API 구현 단계에서 추가해야 한다.

be-b는 `from meetup_repo import list_open`을 사용한다. `roomName`, `buildingName`, `floor`, `memberCount`, `isFull` 같은 파생 필드는 저장소에 넣지 않는다.

## 업로드한 시간표와 연결

상위 작업 폴더의 `2026-2학기_강의실_시간표_정리.xlsx`를 읽어 확인했다. `강의실 시간표` 시트에 헤더를 제외한 2,834행이 있으며 열은 `건물 이름`, `건물 호관`, `강의실 호실`, `시간`, `요일`이다. 예를 들어 인문대학 15호관 119호의 시간 셀 하나에 `(18:00~19:15)(19:25~20:40)`처럼 여러 구간이 들어 있다.

이 파일의 정적 데이터 변환은 be-b 소유인 `core/`, `seed/`에서 수행한다. be-a는 변환 결과의 `rooms[].id`를 모임의 `roomId`로 그대로 받는다. 건물 호관과 호실을 함께 써야 같은 호실 번호를 가진 다른 건물을 구분할 수 있다. 이 단계에서는 실제 roomId 규칙을 새로 확정하거나 시간표를 런타임에 로드하지 않았다. 수업명·좌표·정원·설비 태그는 해당 엑셀 열에 없으므로 실제 데이터와 보충 메타데이터를 구분해야 한다.

## 배포 설정과 참고

저장소 루트 `render.yaml`은 `backend/`를 실행 루트로 사용하며 `plan: free`, `STORAGE=memory`, 단일 worker를 지정했다. 배포 설정만 작성했으며 실제 Render 서비스 생성·배포는 아직 하지 않았다. CORS 값에는 실제 프론트 Origin을 입력한다.

작성 참고: [FastAPI 예외 처리 공식 문서](https://fastapi.tiangolo.com/tutorial/handling-errors/), [Render Blueprint 공식 문서](https://render.com/docs/blueprint-spec). 외부 프로젝트 구현 코드를 복사하지 않았다.
