# fe 작업 기록

## 11:33 프론트 뼈대 (Next.js·API 래퍼·목업·공통 레이아웃)
- 바뀐 것: frontend/ 생성(Next 16 App Router·TS·Tailwind·src), shadcn(Button·Card·Badge·Dialog·Sheet·Tabs·Select·Slider·Input·Sonner)·SWR 설치, lib/types.ts, lib/api.ts, lib/user.ts, lib/time.ts, mocks/, 헤더(MOCK·시연 시각 배지와 해제), 닉네임 다이얼로그, `/`는 지도 전 임시 화면. 세부 기준은 사람 지시로 spec-v1을 따름(목업 쓰기 비활성화, at은 buildings·rooms·room 상세·meetups 목록만, SWR 키는 at 포함 상대 URL, 잘못된 at은 조회 차단+해제). 목업 시드는 v1 §5 전체.
- API 영향: 없음(계약 변경 없음). 프론트는 v1 시드 기준 집계(공학관 10/12)를 기대하므로 be-b 시드가 v1과 같아야 목업과 실API 화면이 일치.
- 확인 방법: `NEXT_PUBLIC_USE_MOCK=1`로 `/?at=2026-11-06T15:10:00%2B09:00` → MOCK 배지·"시연 시각 15:10"·닉네임 다이얼로그 확인, Esc·바깥 클릭으로 안 닫힘, 해제·`?at=abc`·실API 모드(스텁: 에러 형식·재시도·폴링 실패 시 마지막 데이터 유지) 확인, 목업 값을 v1 §3 기대값과 대조, `npm run build`·`npm run lint` 통과.
- 남은 문제: 11:32에 들어온 docs/scope-change.md(정보대 1개 건물·5개 층) 미반영, 목업 시드는 아직 v1의 3개 건물이라 합계 19개로 보임 / 헤더 `/meetups` 링크는 모임 화면과 함께 추가 / "서버를 깨우는 중" 문구는 화면 작업 때 / `crypto.randomUUID`는 HTTPS·localhost에서만 동작해 폰에서 http LAN 주소로 테스트하면 닉네임 저장 불가 / 글꼴은 시스템 글꼴(디자인 단계에서 결정) / npm audit moderate 8건 미처리.
