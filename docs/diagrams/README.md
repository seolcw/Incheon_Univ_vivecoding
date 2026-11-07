# README 다이어그램

루트 [README](../../README.md)는 별도 Mermaid 실행 없이 보이는 PNG 이미지를 사용합니다. 각 이미지는 가로 2,560px이며, 큰 이미지는 클릭해서 확인할 수 있습니다.

## 이미지

- [사용 흐름](user-flow.png)
- [시스템 구성](architecture.png)
- [AI 추천 과정](ai-flow.png)

## 다시 만들기

Windows의 기본 System.Drawing과 맑은 고딕을 사용합니다. 추가 패키지는 필요하지 않습니다. 저장소 루트의 PowerShell에서 실행합니다.

```powershell
.\docs\diagrams\render-diagrams.ps1
```

글자·색상·배치는 [렌더링 스크립트](render-diagrams.ps1)에서 수정합니다. PNG와 스크립트를 함께 커밋합니다. 서비스 코드나 배포 설정에는 영향을 주지 않습니다.

## 원래 흐름도 소스

아래 Mermaid는 이미지의 바탕이 된 기존 상세 흐름입니다. PNG는 처음 보는 사람을 위해 이를 단순화한 그림이며 자동 Mermaid 렌더링 결과는 아닙니다.

### 사용 흐름

```mermaid
flowchart TD
    A["사이트 접속"] --> B["캠퍼스 지도 · 수업 없는 강의실 수"]
    B --> C["정보대 선택 → 층 선택"]
    C --> D["강의실 상세 · 오늘 시간표 확인"]
    D --> E["닉네임 설정 · 선택적으로 아바타 만들기"]
    E --> F["모임 제목 · 목적 · 시간 · 정원 입력"]
    F --> G{"수업이나 다른 모임과 시간이 겹치나요?"}
    G -->|"예"| F
    G -->|"아니요"| H["모임 생성 · 목록에 표시"]
    H --> I["다른 기기에서 모임에 참여"]
    I --> J["인원과 강의실 상태 갱신"]
    B --> K["횃불이에게 원하는 조건으로 질문"]
    K --> L["추천 카드 선택"]
    L --> D
```

### 시스템 구성

```mermaid
flowchart LR
    U["노트북 · 폰 브라우저"] --> FE["Next.js 웹 · Render bingang-web"]
    FE -->|"HTTP JSON /api · 조회 폴링"| API["FastAPI · Render bingang-api"]
    API -->|"시작 시 읽고 메모리에 보관"| SEED["campus.json · 정보대 시간표 26실"]
    API <-->|"모임 생성 · 조회 · 참여"| DB[("Firebase Firestore · meetups")]
    API <-->|"질문 · 최근 대화 / 의도 · 대화 답변"| AI["OpenAI API"]
    API --- MEM["서버 메모리 · 최근 대화와 검색 조건"]
```

### AI 추천 과정

```mermaid
flowchart TD
    Q["질문 + 최근 대화 + 선택적 위치"] --> S["서버에서 위치 좌표와 대화 입력 분리"]
    S --> I["AI 의도 해석 · 실패하면 규칙 기반 해석"]
    I --> T{"질문의 종류"}
    T -->|"강의실 검색"| F["서버가 시간표와 현재·예정 모임으로 후보 계산"]
    F --> R["이용 시간·층 검증 → 최대 3개 추천 카드"]
    S --> D["좌표는 서버 거리 계산에만 사용"]
    D --> R
    T -->|"일상 대화"| C["횃불이 말투로 짧은 AI 답변"]
```
