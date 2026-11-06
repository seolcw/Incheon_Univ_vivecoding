# be-a 모임 API — 창원

수정된 [이슈 #2](https://github.com/seolcw/Incheon_Univ_vivecoding/issues/2)의 SPEC v1 작업계획과 기존 API 계약을 기준으로 서버·모임 생성/조회/참여/나가기/취소를 구현했다. 메모리와 실제 Firestore 모두 생성·참여를 검증했고 Firestore는 서버 재시작 후 모임·참여 인원 유지도 확인했다(2026-11-06). B의 충돌 검사·강의실 조회와 프론트 화면 연동은 아직이며 프론트 화면은 성민 담당이다.

## 실행 (Windows PowerShell, Python 3.12)

아래 명령은 저장소의 `backend/` 폴더에서 실행한다. 이미 `.venv`가 있으면 생성·설치를 생략할 수 있다.

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements-dev.txt
$env:STORAGE = "memory"
$env:CAMPUS_SOURCE = "demo"
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
- 위 명령은 키 없는 `STORAGE=memory` 실행이다. 실제 Firestore 실행은 아래 인증 로더 절차를 따른다. 생략 시 기본값은 firestore이며 B의 db.py는 c581fbe 원본으로 통합했다. 연결 실패를 빈 목록이나 메모리로 자동 대체하지 않는다.
- `CAMPUS_SOURCE=demo`는 B 구현 전 가상 301~304호 4개만 쓰는 모임 API 시연이다. 실제 엑셀·전체 캠퍼스·강의실 조회 API가 아니다. Swagger 제목, 시작 로그, `X-Campus-Source: demo` 헤더로 표시한다. 생략 시 기본값은 `core`이며 B의 로더와 충돌 검사 코드를 사용한다.
- `/api/health`는 서버 생존과 선택한 저장 모드만 표시한다. Firestore 접속 검사가 아니다.
- `CORS_ORIGINS`는 쉼표로 구분한다. 생략 시 `http://localhost:3000`. 배포 시 실제 프론트 Origin을 추가한다.
- memory 모드에는 Firebase 키가 필요 없다. Firestore 모드는 B의 `db.get_client()`가 `FIREBASE_SERVICE_ACCOUNT_JSON`을 읽는다. OpenAI 호출은 하지 않는다.
- 메모리는 프로세스 하나에서만 공유된다. 재시작·재배포 시 데이터가 사라진다. 시연에서는 `--workers 1`을 유지한다.

`meetup_repo.get_repo()`는 공유 저장소를 반환한다. `save(record)`는 원본 upsert, `get(id)`는 원본 또는 None, `list_all()`은 전체 기록, `list_open(room_id=None)`은 open 모임 전체를 시작 순으로 반환한다. 기간 필터는 호출자가 at으로 계산한다. 날짜는 ISO 문자열이며 필드명·타입은 MeetupRecord에 있다. `create_checked()`와 `update()`는 검증 후 저장한다. 메모리는 검증과 저장을 함께 잠그고 Firestore의 참여·나가기·취소는 트랜잭션으로 갱신한다. Firestore의 동시 생성은 같은 프로세스에서만 직렬화하므로 여러 서버의 동시 생성은 남은 위험이다.

be-b는 `from meetup_repo import list_open`을 사용한다. `roomName`, `buildingName`, `floor`, `memberCount`, `isFull` 같은 파생 필드는 저장소에 넣지 않는다.

## 업로드한 시간표와 연결

상위 작업 폴더의 `2026-2학기_강의실_시간표_정리.xlsx`를 읽어 확인했다. `강의실 시간표` 시트에 헤더를 제외한 2,834행이 있으며 열은 `건물 이름`, `건물 호관`, `강의실 호실`, `시간`, `요일`이다. 예를 들어 인문대학 15호관 119호의 시간 셀 하나에 `(18:00~19:15)(19:25~20:40)`처럼 여러 구간이 들어 있다.

수정 이슈는 v1 가상 데이터를 기준으로 하므로 위 엑셀은 아직 런타임에 연결하지 않았다. B의 정적 데이터 변환 결과에 있는 rooms[].id를 모임 roomId로 그대로 받는다. 이번 임시 데모는 `origin/fe`의 `docs/scope-change.md`에 맞춰 건물명 정보대·id eng를 유지하고 v1의 금요일 301~304호 수업만 사용한다. 전체 시드나 월–금 상태 계산이 완성된 것은 아니다. B의 db.py만 원본 그대로 통합했고 core/, seed/는 가져오지 않았다.

## 배포 설정과 참고

저장소 루트 render.yaml은 backend/를 실행 루트로 사용하며 plan: free, STORAGE=memory, CAMPUS_SOURCE=demo, 단일 worker를 지정했다. 실제 Render 배포는 아직 하지 않았다. CORS에는 실제 프론트 Origin을 입력한다. 로컬 OPTIONS는 확인했지만 실제 Vercel·두 기기 검증은 아직이다.

작성 참고: [FastAPI 예외 처리 공식 문서](https://fastapi.tiangolo.com/tutorial/handling-errors/), [Render Blueprint 공식 문서](https://render.com/docs/blueprint-spec). 외부 프로젝트 구현 코드를 복사하지 않았다.

## 모임 만들기와 참여 시연

서버를 켠 뒤 `http://localhost:8000/docs` 또는 다른 PowerShell 창에서 실행한다.

```powershell
$apiBase = "http://localhost:8000"
$createBody = @{
  roomId = "eng-301"
  title = "카공 모여라"
  category = "study"
  startAt = "2026-11-06T15:10:00+09:00"
  endAt = "2026-11-06T17:00:00+09:00"
  maxMembers = 4
  userId = "demo-host-changwon"
  nickname = "창원"
} | ConvertTo-Json
$created = Invoke-RestMethod -Method Post -Uri "$apiBase/api/meetups" -ContentType "application/json; charset=utf-8" -Body ([System.Text.Encoding]::UTF8.GetBytes($createBody))
$meetupId = $created.meetup.id
$joinBody = @{ userId = "demo-guest"; nickname = "준호" } | ConvertTo-Json
$joined = Invoke-RestMethod -Method Post -Uri "$apiBase/api/meetups/$meetupId/join" -ContentType "application/json; charset=utf-8" -Body ([System.Text.Encoding]::UTF8.GetBytes($joinBody))
$joined.meetup | Select-Object id,title,memberCount,maxMembers,isFull
```

생성 201·1/4 → 참여 200·2/4. 같은 userId의 재참여는 멱등이다. 같은 시간 모임을 다시 생성하면 409이므로 재시연하려면 이전 모임 취소 또는 memory 서버 재시작이 필요하다. **위 고정 시연은 실제 2026-11-06 17:00 전에 참여해야 한다.** 이후에는 미래의 유효한 시간으로 바꾸거나 녹화를 사용한다. at으로 실제 참여 종료 판정을 우회하지 않는다.

| 메서드 | 경로 | 동작 |
| --- | --- | --- |
| GET | `/api/meetups?roomId=&buildingId=&includePast=&at=` | 종료 전 open 모임. includePast=true는 종료·취소를 포함한 전체 기록 |
| POST | `/api/meetups` | 생성 201, 호스트를 첫 멤버로 저장 |
| GET | `/api/meetups/{meetupId}` | 취소된 모임도 조회 |
| POST | `/api/meetups/{meetupId}/join` | 참여, 정원·실제 종료 시각 검사 |
| POST | `/api/meetups/{meetupId}/leave` | 나가기, 호스트·비멤버·취소 상태 검사 |
| POST | `/api/meetups/{meetupId}/cancel` | 호스트만 취소, 멱등 |

생성 검증은 필드→방 존재→KST 같은 날·09–22시·15–240분→충돌 순서다. 경계 접촉은 허용하고 취소 모임은 무시한다. leave는 계약 상세 규칙대로 status만 검사하며 종료 후 leave도 막자는 C1 제안은 반영하지 않았다.

## B와 Firestore 연결 순서

1. 강산이 `core.seed_loader.get_room/get_building`, `core.availability.check_meetup_slot`을 제공하면 CAMPUS_SOURCE=core로 전환한다. A는 충돌 함수에 timezone-aware KST datetime 2개와 해당 방의 모든 open 모임(ISO 문자열)을 전달한다. B 강의실/건물 라우터의 main.py 등록은 코드 인계 후 별도로 진행한다.
2. B의 db.get_client() 통합과 실제 Firestore 검증은 완료했다. 실행할 PowerShell 창에서 아래 로더로 FIREBASE_SERVICE_ACCOUNT_JSON과 STORAGE=firestore를 설정한다. 캠퍼스 충돌 코드는 아직 없으므로 CAMPUS_SOURCE=demo를 유지한다.
3. 생성→참여→서버 재시작→모임 유지까지 실제 DB에서 확인한다. 저장소 어댑터는 Timestamp 저장과 ISO +09:00 응답을 처리한다. 프론트 API 계약은 바뀌지 않는다.

**실제 Firestore 읽기·쓰기·모임 생성/참여·서버 재시작 후 유지까지 검증했다.** 메모리 모임은 자동 이관하지 않는다. Firestore 앱 시작 시 기존 데이터를 지우거나 데모 데이터를 덮어쓰지 않는다.

backend 폴더에서 실행하며 원본 인증 파일은 저장소 밖에 둔다. 아래 예시 경로를 본인 파일 경로로 바꾼다. 키 내용은 출력하지 않는다.

```powershell
& .\scripts\load_firebase_env.ps1 -ServiceAccountPath 'C:\개인폴더\firebase-key.json'
$env:CAMPUS_SOURCE = 'demo'
$env:CORS_ORIGINS = 'http://localhost:3000'
.\.venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000 --workers 1
```

로더의 환경변수는 현재 창과 그 자식 프로세스에만 적용된다. 새 창을 열면 로더를 다시 실행한다. 이 검증 작업에서 사용한 임시 프로세스는 종료했고 사용자 터미널에 인증 환경변수를 영구 저장하지 않았다.

서버를 아직 실행하지 않은 상태에서 동일한 실제 접속 검증을 재실행하려면, 로더와 CAMPUS_SOURCE 설정 후 아래를 실행한다. 기본 8000 포트는 비어 있어야 하며 다른 포트를 쓰려면 `--port 8001`을 지정한다.

```powershell
.\.venv\Scripts\python -m scripts.verify_firestore
```

이 명령은 실제 Firestore를 읽고 다음 날 21:00–21:30의 eng-304에 임시 모임을 만든다. 참여 인원이 2명인지 확인하고 서버를 재시작해 재조회한 뒤, 이번 실행의 고유 hostId로 생성한 모임만 삭제한다. 기존 모임이나 demo-m1은 수정하지 않는다. 같은 방·시간에 기존 모임이 있으면 409로 실패하며 기존 모임을 지우지 않는다. 키·예외 원문은 출력하지 않는다.

## 데모 시드와 검증 범위

memory 앱 시작 시 실제 요청의 repo에 demo-m1(eng-303, 11/06 15–17시, 호스트 민지 1명)을 넣는다. 재시작하면 다른 모임은 사라진다. 별도 프로세스의 시드 스크립트로 실행 중 메모리를 초기화할 수 없다.

Firestore 초기화 명령은 아래와 같다. **선택된 프로젝트의 meetups에서 demo-m1 외 모든 모임을 삭제하므로 대회 전용 DB에서만 사용한다.** 이번 작업에서는 실행하지 않았다.

```powershell
.\.venv\Scripts\python -m scripts.seed_demo --reset-contest-meetups
```

16개 테스트와 pip check 통과. 메모리 모드의 실제 8000 포트에서 생성201→참여200·1→2명, 재참여·정원409·수업충돌409·목록·나가기·취소·CORS를 확인했다. 2026-11-06에는 B의 원본 db.py 통합 후 같은 16개 테스트를 다시 통과했고, 실제 Firestore 읽기·모임 생성201·Timestamp 저장·참여200(1→2명)·서버 재시작 후 유지·검증 데이터 정리를 완료했다. 인증 JSON 원본 해시 불변도 확인했다. B의 실제 충돌 검사는 여전히 미연결이며 CAMPUS_SOURCE=demo를 유지한다.

추가 참고: [Firestore 공식 트랜잭션 문서](https://firebase.google.com/docs/firestore/manage-data/transactions)를 meetup_repo.py의 저장소 인터페이스에 맞춰 적용했다. 공식 예제의 완성 코드를 복사하지 않았다.
