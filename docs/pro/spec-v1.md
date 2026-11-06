# SPEC v1 — 빈강

검토안 · 2026-11-06 10:30 KST · 제출15:00 · `docs/pro/spec-v1.md`.

## 0. 적용 범위

`contracts/api.md` v0 계약(경로·메서드·필드·타입·필수 여부·응답·HTTP 상태)·기술 결정 유지. 사람이 지시한 변경만 소유 에이전트가 반영하며 미제공 AGENTS.md의 권한을 확대하지 않는다.

MVP는 빈 강의실·모임·캠퍼스 시각화. AI 실행 명세와 `/chat` 상태표는 `docs/proposals.md` P1에만 둔다. 계약·11:15 스텁은 유지, 사람의 이관 전 추천 구현 금지. 추가 보완 합계 **30인·분** 이내;초과분은 위험·제안으로 보고한다.

가상 캠퍼스, 미기재 요일은 수업 없음. 운영 `[09:00,22:00)`. 금15:10 시연·당일17:00 전 참여 가정. 집계는 API 예시 대신 아래 시드 기준.

## 1. 제품·완료 조건

학생의 빈 강의실 탐색·모임 연결. 창의력20: 공간·사람 연결, AI15: 프롬프트·수정 기록, 완성도15: 배포·두 기기 시연.

| 기능 | 합격 조건 |
|---|---|
| 빈 강의실 | 공학관3층 네 상태 일치, 최소60분 필터 동작 |
| 모임 | 301호15:10–17:00·정원4 생성→다른 userId 참여→1/4에서2/4; 수업·모임 충돌409, 정원 마감 표시 |
| 지도 | 지도→건물→층→상세3클릭, 빈 비율·상태 범례 |

`emptyCount=empty+meetup`, “수업 없는 강의실 N개(모임 포함)”. 건물 `emptyCount/totalCount`: ≥2/3 초록/≥1/3 노랑/나머지 빨강/폐관 회색. 방: empty초록/meetup파랑/class빨강/closed회색. 생성 후301카드 파랑, 건물 emptyCount 유지·meetupCount 증가.

## 2. 기술·소유권·계약

- 프론트: Next.js·TypeScript·Tailwind·shadcn/ui의 v0 컴포넌트·인라인 SVG. App Router `src/{app,components,lib/api.ts,lib/types.ts,mocks}`. 전역 스토어 없이 URL floor·localStorage userId/nickname/demoAt; userId=`crypto.randomUUID()`. FastAPI만 경유. 루트 디자인 package.json·`design:*`·`.claude/`와 frontend package.json 분리 유지.
- 백엔드: Python3.12·FastAPI, Pydantic `alias_generator=to_camel, populate_by_name=True`, 동기 Firebase·`def` 라우트. `errors.ApiError` 전역 처리, 422→400 VALIDATION_ERROR, 계약 오류 객체. 정적 JSON 시작시 메모리; Firestore meetups만, Timestamp 저장·ISO +09:00 반환. MeetupRepo/memory·SWR10초·Vercel/Render 유지. 선택 AI: Chat Completions/json_object/단일 턴/8초/fallback.

| 소유 | 범위 |
|---|---|
| fe | frontend 전체(모임 화면 포함), 기존 루트 디자인 도구 |
| be-b | backend/core·seed·db.py·tests/test_core.py, Firebase 프로젝트·키, 발표 |
| be-a | B 외 backend·루트·배포, 라우터 등록은 A만 |
| 사람 | SPEC·contracts 수정. 에이전트 로그 `docs/log/{fe,be-a,be-b}.md`; 커밋 `[fe]`/`[be]`/`[spec]` |

고정 import: B의 `db.get_client()`(memory=None), `core.seed_loader.get_room(room_id)`/`get_building(building_id)`/`list_rooms()`, `core.availability.check_meetup_slot(room_id,start_at,end_at,open_meetups)->str|None`; A의 `meetup_repo.list_open(room_id=None)->list[dict]`(API 필드명·ISO·파생 없음).

모임 모델·검증·응답·멱등·leave는 계약 그대로. roomName/buildingId/buildingName/floor/memberCount/isFull은 파생값으로 저장하지 않는다.

## 3. 상태·겹침·테스트

at은 오프셋 없으면 KST, 있으면 KST 변환, 초·소수초 제거. 생략시 서버 현재. buildings/rooms/room 상세/meetups 목록만 지원; health·meetup 단건·변경 API에 at 추가 금지.

운영 밖 closed→`start≤t<end` 수업 class→같은 조건의 open 모임 meetup→empty. class: freeMinutes=0/freeUntil=null/classEndsAt=종료. closed: freeMinutes=0·상태 파생값 null. empty/meetup: freeUntil=다음 수업 또는22:00, freeMinutes=내림 분; meetup은 모임 currentTitle/activeMeetupId. 예정 모임은 freeUntil에 영향 없음. 주말도 운영·모임 적용.

생성 검증: 필드→방 존재→KST 같은 날짜·`09:00≤start<end≤22:00`·15–240분→충돌. 수업·같은 방의 모든 open 모임에 `startA<endB and startB<endA`; cancelled 무시, 경계 접촉 허용. B의 한국어 사유→A의409 ROOM_OCCUPIED. 과거 생성 제한 없음. 여유 시간 표시와 별개로 충돌 검사가 최종 판정.

`backend/tests/test_core.py`의 테스트명/입력/기대값. 날짜 기본11/06 +09:00, 시드와 명시 모임만 주입. slot 사유=non-empty str, None=허용.

| 테스트명 | 입력 | 기대 결과 |
|---|---|---|
| `test_class_end` | eng-302,15:50,모임없음 | empty,freeUntil22:00,370분,classEndsAt=null |
| `test_hours` | eng-304,08:59/09:00/21:59/22:00 | closed(0,null)/empty(120,11:00)/empty(1,22:00)/closed(0,null) |
| `test_weekend` | eng-301,토11/07 15:10,모임없음 | empty410분/22:00,todaySchedule=[] |
| `test_class_overlap_1m` | eng-301,14:14–14:29 생성 | 자료구조와1분 겹침→사유 |
| `test_slot_after_class` | eng-301,14:15–14:30 생성 | None |
| `test_slot_before_class` | eng-301,16:45–17:00 생성 | None |
| `test_all_open_meetups` | eng-304,open14–15·16–17;생성16:30–17:30 | 두 번째와 겹침→사유→라우트409 ROOM_OCCUPIED |
| `test_touching_open` | eng-304,open14–15·16–17;생성15–16 | None;비중첩 open 공존 허용 |
| `test_cancelled` | eng-304,cancelled15–16;at15:10·생성15:10–15:40 | empty,slot None |
| `test_demo_states` | 15:10,demo-m1만 | 301 empty110/17:00;302 class/15:50;303 meetup410/demo-m1;304 empty410/22:00 |
| `test_seed_mix` | 월11/02–금11/06,09–18 각 정각×3건물 | 150조합 모두 literal empty≥1·class≥1 |

## 4. 화면·demoAt·갱신

모바일 우선, 첫 방문 닉네임 검증·저장 전 생성/참여 차단. 모임 입력: 제목·목적·설명·시작/끝·정원, 상세의 roomId 고정. 요청 중 중복 제출 금지.

| 화면 | 로딩 | 빈 상태 | 오류 | 목업 |
|---|---|---|---|---|
| `/` | “캠퍼스 현황을 불러오는 중이에요.”+skeleton | 건물0 “캠퍼스 정보가 없어요.”;빈방0은 지도 유지+“수업 없는 강의실이 없어요.” | “캠퍼스 정보를 불러오지 못했어요.”+재시도 | “MOCK · 예시 캠퍼스” |
| `/buildings/[buildingId]` | “강의실 상태를 확인하는 중이에요.” | “조건에 맞는 강의실이 없어요.”+필터 초기화 | “강의실 정보를 불러오지 못했어요.”+재시도;404 지도 이동 | “MOCK · 예시 강의실” |
| `/rooms/[roomId]` | “강의실 정보를 불러오는 중이에요.” | 시간표0 “오늘 수업이 없어요.”;모임0 “아직 모임이 없어요.” | 404 “강의실을 찾을 수 없어요.”+지도;기타 재시도 | “MOCK · 예시 시간표” |
| `/meetups` | “모임을 불러오는 중이에요.” | “아직 모임이 없어요. 모임을 만들어 보세요.” | “모임을 불러오지 못했어요.”+재시도 | “MOCK · 예시 모임” |

chat 네 상태는 P1, MVP 메뉴에서 숨김. `NEXT_PUBLIC_USE_MOCK=1`만 조회 예시·MOCK 배지. 쓰기는 비활성화+“실제 API 연결 후 이용할 수 있어요.”; 모의 저장소 추가·오류시 자동 전환 없음.

긴 첫 로딩: “서버를 깨우는 중이에요. 잠시만 기다려 주세요.”. 재조회 실패는 마지막 데이터+“갱신에 실패했어요.”. POST 오류는 서버 message, FULL은 “정원 마감”, CLOSED는 “종료되거나 취소된 모임이에요.”. 충돌은 입력 유지·방/모임 재조회.

`demoAt`: 초기화 전 key=null, 이후 URL at→저장값→서버현재 순. 유효값만 KST 분 단위로 저장. 오류시 요청 차단·“시연 시각 형식을 확인해 주세요.”·해제 버튼. URLSearchParams로 +를 `%2B` 처리. 이동·새로고침·자정에도 유지. 해제: 저장값·URL at 삭제→React 상태/key 변경·재조회(userId/nickname 유지). at 링크 재진입시 재설정. 두 기기는 같은 링크, 생성 입력은 demoAt 날짜;join/leave/cancel에는 미전달.

SWR key=at·필터 포함 상대 API URL. 10초 폴링·mount/focus 재조회. 생성201·참여/leave/cancel200 직후와409에 `useSWRConfig().mutate`로 buildings·rooms·meetups 목록/단건의 모든 쿼리를 재검증. 미마운트는 다음 mount. 저장 후 재조회 실패: “저장됐지만 화면 갱신에 실패했어요.”;POST 재전송 금지. mutate는 해당 기기만, 타 기기는 활성 화면의 다음10초 폴링+통신 후 반영. [SWR](https://swr.vercel.app/docs/mutation).

## 5. 데모 시드

`backend/seed/campus.json` 전체 값. 없는 요일은 휴강, 모든 방에 주간 수업≥1개.

```json
{
"buildings":[
{"id":"eng","name":"공학관","lat":37.5508,"lng":127.0743,"floors":[1,2,3],"map":{"x":8,"y":14,"w":30,"h":22}},
{"id":"hum","name":"인문관","lat":37.5512,"lng":127.0733,"floors":[1,2,3],"map":{"x":56,"y":18,"w":30,"h":22}},
{"id":"sci","name":"자연관","lat":37.5503,"lng":127.074,"floors":[1,2,3],"map":{"x":30,"y":60,"w":30,"h":22}}
],
"rooms":[
{"id":"eng-101","buildingId":"eng","floor":1,"name":"101호","capacity":40,"tags":["콘센트","프로젝터"],"schedule":[{"dayOfWeek":1,"startTime":"09:00","endTime":"12:00","title":"아두이노실습"},{"dayOfWeek":5,"startTime":"09:00","endTime":"12:00","title":"아두이노실습"}]},
{"id":"eng-102","buildingId":"eng","floor":1,"name":"102호","capacity":60,"tags":["프로젝터"],"schedule":[{"dayOfWeek":1,"startTime":"12:00","endTime":"15:00","title":"자료구조실습"},{"dayOfWeek":5,"startTime":"12:00","endTime":"15:00","title":"자료구조실습"}]},
{"id":"eng-103","buildingId":"eng","floor":1,"name":"103호","capacity":30,"tags":["콘센트","화이트보드"],"schedule":[{"dayOfWeek":1,"startTime":"15:00","endTime":"18:15","title":"프로그래밍실습"},{"dayOfWeek":5,"startTime":"15:00","endTime":"18:15","title":"프로그래밍실습"}]},
{"id":"eng-104","buildingId":"eng","floor":1,"name":"104호","capacity":24,"tags":["창가"],"schedule":[{"dayOfWeek":2,"startTime":"09:00","endTime":"12:00","title":"컴퓨터구조"}]},
{"id":"eng-201","buildingId":"eng","floor":2,"name":"201호","capacity":48,"tags":["화이트보드"],"schedule":[{"dayOfWeek":2,"startTime":"12:00","endTime":"15:00","title":"네트워크실습"}]},
{"id":"eng-202","buildingId":"eng","floor":2,"name":"202호","capacity":36,"tags":["콘센트"],"schedule":[{"dayOfWeek":2,"startTime":"15:00","endTime":"18:15","title":"데이터베이스"}]},
{"id":"eng-203","buildingId":"eng","floor":2,"name":"203호","capacity":32,"tags":["프로젝터","화이트보드"],"schedule":[{"dayOfWeek":3,"startTime":"09:00","endTime":"12:00","title":"전자회로실습"}]},
{"id":"eng-204","buildingId":"eng","floor":2,"name":"204호","capacity":40,"tags":["창가","콘센트"],"schedule":[{"dayOfWeek":3,"startTime":"12:00","endTime":"15:00","title":"웹프로그래밍"}]},
{"id":"eng-301","buildingId":"eng","floor":3,"name":"301호","capacity":40,"tags":["콘센트","프로젝터"],"schedule":[{"dayOfWeek":3,"startTime":"15:00","endTime":"18:15","title":"캡스톤설계"},{"dayOfWeek":5,"startTime":"13:00","endTime":"14:15","title":"자료구조"},{"dayOfWeek":5,"startTime":"17:00","endTime":"18:15","title":"알고리즘"}]},
{"id":"eng-302","buildingId":"eng","floor":3,"name":"302호","capacity":60,"tags":["프로젝터"],"schedule":[{"dayOfWeek":4,"startTime":"09:00","endTime":"12:00","title":"소프트웨어설계"},{"dayOfWeek":5,"startTime":"14:30","endTime":"15:50","title":"운영체제"}]},
{"id":"eng-303","buildingId":"eng","floor":3,"name":"303호","capacity":30,"tags":["콘센트","화이트보드"],"schedule":[{"dayOfWeek":4,"startTime":"12:00","endTime":"15:00","title":"운영체제실습"},{"dayOfWeek":5,"startTime":"09:00","endTime":"10:15","title":"컴퓨팅사고"}]},
{"id":"eng-304","buildingId":"eng","floor":3,"name":"304호","capacity":32,"tags":["콘센트","창가"],"schedule":[{"dayOfWeek":4,"startTime":"15:00","endTime":"18:15","title":"인공지능실습"},{"dayOfWeek":5,"startTime":"11:00","endTime":"12:15","title":"데이터분석"}]},
{"id":"hum-101","buildingId":"hum","floor":1,"name":"101호","capacity":40,"tags":["콘센트","프로젝터"],"schedule":[{"dayOfWeek":1,"startTime":"09:00","endTime":"12:00","title":"철학세미나"},{"dayOfWeek":5,"startTime":"09:00","endTime":"12:00","title":"철학세미나"}]},
{"id":"hum-102","buildingId":"hum","floor":1,"name":"102호","capacity":60,"tags":["프로젝터"],"schedule":[{"dayOfWeek":1,"startTime":"12:00","endTime":"15:00","title":"한국문학"},{"dayOfWeek":5,"startTime":"12:00","endTime":"15:00","title":"한국문학"}]},
{"id":"hum-103","buildingId":"hum","floor":1,"name":"103호","capacity":30,"tags":["콘센트","화이트보드"],"schedule":[{"dayOfWeek":1,"startTime":"15:00","endTime":"18:15","title":"영문학"},{"dayOfWeek":5,"startTime":"15:00","endTime":"18:15","title":"영문학"}]},
{"id":"hum-104","buildingId":"hum","floor":1,"name":"104호","capacity":24,"tags":["창가"],"schedule":[{"dayOfWeek":2,"startTime":"09:00","endTime":"12:00","title":"세계사"},{"dayOfWeek":5,"startTime":"14:00","endTime":"16:00","title":"세계사"}]},
{"id":"hum-201","buildingId":"hum","floor":2,"name":"201호","capacity":48,"tags":["화이트보드"],"schedule":[{"dayOfWeek":2,"startTime":"12:00","endTime":"15:00","title":"글쓰기실습"},{"dayOfWeek":5,"startTime":"14:00","endTime":"16:00","title":"글쓰기실습"}]},
{"id":"hum-202","buildingId":"hum","floor":2,"name":"202호","capacity":36,"tags":["콘센트"],"schedule":[{"dayOfWeek":2,"startTime":"15:00","endTime":"18:15","title":"사회조사"},{"dayOfWeek":5,"startTime":"14:00","endTime":"16:00","title":"사회조사"}]},
{"id":"hum-203","buildingId":"hum","floor":2,"name":"203호","capacity":32,"tags":["프로젝터","화이트보드"],"schedule":[{"dayOfWeek":3,"startTime":"09:00","endTime":"12:00","title":"심리학실습"},{"dayOfWeek":5,"startTime":"14:00","endTime":"16:00","title":"심리학실습"}]},
{"id":"hum-204","buildingId":"hum","floor":2,"name":"204호","capacity":40,"tags":["창가","콘센트"],"schedule":[{"dayOfWeek":3,"startTime":"12:00","endTime":"15:00","title":"언어학"},{"dayOfWeek":5,"startTime":"14:00","endTime":"16:00","title":"언어학"}]},
{"id":"hum-301","buildingId":"hum","floor":3,"name":"301호","capacity":40,"tags":["콘센트","프로젝터"],"schedule":[{"dayOfWeek":3,"startTime":"15:00","endTime":"18:15","title":"문화연구"}]},
{"id":"hum-302","buildingId":"hum","floor":3,"name":"302호","capacity":60,"tags":["프로젝터"],"schedule":[{"dayOfWeek":4,"startTime":"09:00","endTime":"12:00","title":"통번역실습"}]},
{"id":"hum-303","buildingId":"hum","floor":3,"name":"303호","capacity":30,"tags":["콘센트","화이트보드"],"schedule":[{"dayOfWeek":4,"startTime":"12:00","endTime":"15:00","title":"커뮤니케이션"}]},
{"id":"hum-304","buildingId":"hum","floor":3,"name":"304호","capacity":32,"tags":["콘센트","창가"],"schedule":[{"dayOfWeek":4,"startTime":"15:00","endTime":"18:15","title":"미디어제작"}]},
{"id":"sci-101","buildingId":"sci","floor":1,"name":"101호","capacity":40,"tags":["콘센트","프로젝터"],"schedule":[{"dayOfWeek":1,"startTime":"09:00","endTime":"12:00","title":"유기화학실험"},{"dayOfWeek":5,"startTime":"09:00","endTime":"12:00","title":"유기화학실험"}]},
{"id":"sci-102","buildingId":"sci","floor":1,"name":"102호","capacity":60,"tags":["프로젝터"],"schedule":[{"dayOfWeek":1,"startTime":"12:00","endTime":"15:00","title":"물리학실험"},{"dayOfWeek":5,"startTime":"12:00","endTime":"15:00","title":"물리학실험"}]},
{"id":"sci-103","buildingId":"sci","floor":1,"name":"103호","capacity":30,"tags":["콘센트","화이트보드"],"schedule":[{"dayOfWeek":1,"startTime":"15:00","endTime":"18:15","title":"생명과학실험"},{"dayOfWeek":5,"startTime":"15:00","endTime":"18:15","title":"생명과학실험"}]},
{"id":"sci-104","buildingId":"sci","floor":1,"name":"104호","capacity":24,"tags":["창가"],"schedule":[{"dayOfWeek":2,"startTime":"09:00","endTime":"12:00","title":"분석화학실험"},{"dayOfWeek":5,"startTime":"14:00","endTime":"16:00","title":"분석화학실험"}]},
{"id":"sci-201","buildingId":"sci","floor":2,"name":"201호","capacity":48,"tags":["화이트보드"],"schedule":[{"dayOfWeek":2,"startTime":"12:00","endTime":"15:00","title":"통계실습"},{"dayOfWeek":5,"startTime":"14:00","endTime":"16:00","title":"통계실습"}]},
{"id":"sci-202","buildingId":"sci","floor":2,"name":"202호","capacity":36,"tags":["콘센트"],"schedule":[{"dayOfWeek":2,"startTime":"15:00","endTime":"18:15","title":"지구과학실험"},{"dayOfWeek":5,"startTime":"14:00","endTime":"16:00","title":"지구과학실험"}]},
{"id":"sci-203","buildingId":"sci","floor":2,"name":"203호","capacity":32,"tags":["프로젝터","화이트보드"],"schedule":[{"dayOfWeek":3,"startTime":"09:00","endTime":"12:00","title":"환경과학실험"},{"dayOfWeek":5,"startTime":"14:00","endTime":"16:00","title":"환경과학실험"}]},
{"id":"sci-204","buildingId":"sci","floor":2,"name":"204호","capacity":40,"tags":["창가","콘센트"],"schedule":[{"dayOfWeek":3,"startTime":"12:00","endTime":"15:00","title":"생화학실험"},{"dayOfWeek":5,"startTime":"14:00","endTime":"16:00","title":"생화학실험"}]},
{"id":"sci-301","buildingId":"sci","floor":3,"name":"301호","capacity":40,"tags":["콘센트","프로젝터"],"schedule":[{"dayOfWeek":3,"startTime":"15:00","endTime":"18:15","title":"미생물실험"},{"dayOfWeek":5,"startTime":"14:00","endTime":"16:00","title":"미생물실험"}]},
{"id":"sci-302","buildingId":"sci","floor":3,"name":"302호","capacity":60,"tags":["프로젝터"],"schedule":[{"dayOfWeek":4,"startTime":"09:00","endTime":"12:00","title":"계산과학실습"},{"dayOfWeek":5,"startTime":"14:00","endTime":"16:00","title":"계산과학실습"}]},
{"id":"sci-303","buildingId":"sci","floor":3,"name":"303호","capacity":30,"tags":["콘센트","화이트보드"],"schedule":[{"dayOfWeek":4,"startTime":"12:00","endTime":"15:00","title":"고급물리실험"}]},
{"id":"sci-304","buildingId":"sci","floor":3,"name":"304호","capacity":32,"tags":["콘센트","창가"],"schedule":[{"dayOfWeek":4,"startTime":"15:00","endTime":"18:15","title":"연구세미나"},{"dayOfWeek":5,"startTime":"14:00","endTime":"16:00","title":"연구세미나"}]}
]
}
```

A의 `scripts/seed_demo.py`에서 별도 생성: id=demo-m1, roomId=eng-303, title=카공 모여라, category=study, description=조용히 각자 공부해요. 콘센트 자리 있음, startAt=2026-11-06T15:00:00+09:00, endAt=2026-11-06T17:00:00+09:00, maxMembers=4, hostId=u-demo-host, hostNickname=민지, members=[{userId:u-demo-host,nickname:민지,joinedAt:2026-11-06T14:58:00+09:00}], status=open, createdAt=2026-11-06T14:58:00+09:00. Firestore 시각은 Timestamp.

15:10 집계(emptyCount/total,meetupCount): 공학관10/12,1; 인문관6/12,0; 자연관3/12,0. 공학관 층별 emptyCount=3/4/3, meetupCount=0/0/1. 화면·발표에 가상 시연 데이터임을 밝힌다.

## 6. 두 기기 시연

공통 링크 `/?at=2026-11-06T15%3A10%3A00%2B09%3A00`. 양쪽 “시연 시각15:10”, MOCK 없음 확인.

1. 노트북: 링크→닉네임 민지→공학관→3층→301 빈110분/302 운영체제15:50/303 모임/304 남은 수업 없음→60분 필터(301·303·304)→301 상세.
2. 노트북: 모임 만들기→카공 모여라·공부·설명·11/06 15:10–17:00·정원4→생성→1/4·301 모임 상태. 생성된 id를 사용한다.
3. 폰: 같은 링크→닉네임 준호→모임 목록→**301호** 카드(303 demo-m1 아님)→참여→2/4·참여 완료.
4. 노트북: 모임 목록에서 폴링/focus 후2/4→층 화면301 파랑. 예정 모임 참여가 가능하므로15:10 전 리허설 가능. 실제17:00부터는 참여 불가하며 at으로 우회하지 않는다.

5분: 문제40초/지도50초/생성·참여60초/검증40초/AI 로그50초/마무리60초. 승인·완성된 AI만 검증 구간 대체.17시 이후·장애는 녹화.

## 7. 배포·병합·장애

### 12:00 첫 배포

1. A가11:45 main 통합. Render Web Service: main/Python, Root=`backend`, Build=`pip install -r requirements.txt`, Start=`uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1`, health=`/api/health`. `backend/.python-version`=3.12·빌드 로그 확인;PORT는 플랫폼 값. [명령](https://render.com/docs/deploy-fastapi)·[Python](https://render.com/docs/python-version).
2. 변수6개→배포→health200의 status/storage/time/version 확인. OpenAI 키 없이 기동 가능.
3. Vercel: 같은 main, Root=`frontend`, Next.js. `NEXT_PUBLIC_API_URL=https://<서비스명>.onrender.com`(끝/·/api 없음), `NEXT_PUBLIC_USE_MOCK=0`→배포. 공개 변수 변경시 재배포. [Vercel](https://vercel.com/docs/environment-variables).
4. A가 실제 Production Origin을 CORS에 반영(프리뷰도 정확한 Origin 추가). GET·POST·Content-Type 허용, curl·브라우저 확인. 스텁 통과는 CRUD 완성이 아니다.

| Render 변수6개 | 값 |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | 전체 JSON; B가11:15 실제 읽기 확인 후 A 전달 |
| `STORAGE` | firestore, 장애시 memory |
| `CORS_ORIGINS` | `http://localhost:3000,https://<프로젝트>.vercel.app`;경로·끝/ 없음 |
| `OPENAI_API_KEY` | 선택 AI용;미설정/공백=키 없음 |
| `OPENAI_MODEL` | 기존 기본 gpt-4o-mini |
| `TZ` | Asia/Seoul |

주소 치환; PowerShell은 `curl.exe`:

```bash
curl -i -X OPTIONS "https://<서비스명>.onrender.com/api/meetups" -H "Origin: https://<프로젝트>.vercel.app" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type"
```

200, allow-origin=요청 Origin, allow-methods에 POST, allow-headers에 content-type 확인. [CORS](https://fastapi.tiangolo.com/tutorial/cors/).

| main 병합 | 필수 산출물 |
|---|---|
| 11:45 | 프론트 뼈대·닉네임·API 래퍼/mock, 전 API 스텁·health/CORS/오류, 시드·로더·memory repo·배포. B 스텁11:15까지 |
| 12:45 | 상태·충돌·핵심 테스트, 모임CRUD·참여, 지도·층·상세 실API;모임 UI 연결 계속 |
| 13:45 | 13:30 검증 및 demoAt/polling/mutate 결함 수정, 화면 상태·초기화·두 기기 리허설 |
| 14:30 | 시연 차단 버그만;최종 후보·출처·프롬프트 로그·발표자료 |

**13:15 A가 핵심 흐름·demoAt·10초폴링·생성/참여 mutate를 main에 조기 통합·배포**,13:30 두 기기 검증. 미통과시 AI 금지·MVP 수정. 기능 추가14:15, 코드 수정14:40 중단;이후 초기화·예열·녹화·제출만.

Firestore 인증 실패: B의 JSON·실제 읽기 확인→지연 전에 A가 STORAGE=memory 재배포. `db.get_client()`는 Firebase 파싱 전 memory면 None. 앱 시작시 **요청의 repo 인스턴스**에 demo-m1 seed→health.storage=memory·303모임·생성/폰 참여 확인. 서버1·worker1. 별도 프로세스 seed는 실행 중 memory를 초기화하지 못한다.

14:50 Firestore: backend에서 `python -m scripts.seed_demo`, 대회 전용 meetups의 demo-m1 upsert·나머지 삭제. memory: 한 번 재시작·시드 복원. Firestore 시작시 전체 삭제 금지, 이후 시연 중 재배포/재시작 금지. 무료 Render는 무요청15분 후 중지·재시작 약1분 가능;14:50·발표5분 전 health200, 대기 화면 폴링 유지. [Render](https://render.com/docs/free).

## 8. 제출·범위 밖

15:00까지 A는 배포URL·GitHub main·README 참고 코드 URL/사용 파일/수정 내용, B는 발표PDF·`docs/prompts/`(도구·프롬프트·채택/수정 결과, 키 제외), 프론트는 조작·백업 영상 준비.

인증·독점 예약·승인/관리자·실제 시간표 크롤링·알림·모임 채팅/댓글/신고·실제 도면·통계/페이지네이션·다국어·다크모드 전용 작업·Cloud Storage는 제외. 선택 항목은 proposals에만 둔다. 동시 생성 원자성·17시 이후 실제 참여·30인·분 초과 보완은 남은 위험이며 계약을 임의 변경하지 않는다.
