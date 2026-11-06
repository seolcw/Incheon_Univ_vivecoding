// 정보대 1개 건물 가상 시드(docs/scope-change.md). 호수는 scope-change 표 그대로다.
// eng-301~304의 정보와 시간표는 SPEC v1 §5 값이고, 나머지 방의 정원·태그·시간표는 화면 확인용으로 규칙에 따라 지어낸 값이다.

export interface SeedClass {
  /** ISO 요일: 월=1…일=7 */
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  title: string;
}

export interface SeedRoom {
  id: string;
  buildingId: string;
  floor: number;
  name: string;
  capacity: number;
  tags: string[];
  schedule: SeedClass[];
}

export const seedBuildings = [
  {
    id: "eng",
    name: "정보대",
    lat: 37.5508,
    lng: 127.0743,
    floors: [1, 2, 3, 4, 5],
    map: { x: 8, y: 14, w: 30, h: 22 },
  },
];

function numbers(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, index) => String(from + index));
}

const ROOM_NUMBERS: Record<number, string[]> = {
  1: numbers(101, 112),
  2: [...numbers(201, 206), ...numbers(209, 229)],
  3: [...numbers(301, 306), ...numbers(309, 330)],
  4: [...numbers(401, 410), ...numbers(413, 436)],
  5: [
    ...numbers(501, 506),
    "506-1",
    "509",
    "509-1",
    "510",
    "510-1",
    ...numbers(511, 515),
    "515-1",
    "516",
    "516-1",
    "517",
    "517-1",
    ...numbers(518, 528),
  ],
};

/** SPEC v1 §5 값 그대로. 데모 장면(금 15:10)이 여기서 나온다. */
const DEMO_ROOMS: Record<string, Pick<SeedRoom, "capacity" | "tags" | "schedule">> = {
  "301": {
    capacity: 40,
    tags: ["콘센트", "프로젝터"],
    schedule: [
      { dayOfWeek: 3, startTime: "15:00", endTime: "18:15", title: "캡스톤설계" },
      { dayOfWeek: 5, startTime: "13:00", endTime: "14:15", title: "자료구조" },
      { dayOfWeek: 5, startTime: "17:00", endTime: "18:15", title: "알고리즘" },
    ],
  },
  "302": {
    capacity: 60,
    tags: ["프로젝터"],
    schedule: [
      { dayOfWeek: 4, startTime: "09:00", endTime: "12:00", title: "소프트웨어설계" },
      { dayOfWeek: 5, startTime: "14:30", endTime: "15:50", title: "운영체제" },
    ],
  },
  "303": {
    capacity: 30,
    tags: ["콘센트", "화이트보드"],
    schedule: [
      { dayOfWeek: 4, startTime: "12:00", endTime: "15:00", title: "운영체제실습" },
      { dayOfWeek: 5, startTime: "09:00", endTime: "10:15", title: "컴퓨팅사고" },
    ],
  },
  "304": {
    capacity: 32,
    tags: ["콘센트", "창가"],
    schedule: [
      { dayOfWeek: 4, startTime: "15:00", endTime: "18:15", title: "인공지능실습" },
      { dayOfWeek: 5, startTime: "11:00", endTime: "12:15", title: "데이터분석" },
    ],
  },
};

const SLOTS = [
  ["09:00", "10:15"],
  ["10:30", "11:45"],
  ["12:00", "13:15"],
  ["13:30", "14:45"],
  ["15:00", "16:15"],
  ["16:30", "17:45"],
];
const TITLES = ["네트워크", "데이터베이스", "컴퓨터구조", "웹프로그래밍", "인공지능", "이산수학", "선형대수", "컴파일러", "보안개론", "그래픽스"];
const CAPACITIES = [24, 30, 36, 40, 48, 60];
const TAG_SETS = [["콘센트"], ["프로젝터"], ["콘센트", "프로젝터"], ["화이트보드"], ["창가"], ["콘센트", "창가"]];

/** 시간대마다 방 4개 중 1개꼴로 수업이 있어 층마다 상태가 섞인다. */
function generatedSchedule(index: number): SeedClass[] {
  const schedule: SeedClass[] = [];
  for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
    SLOTS.forEach(([startTime, endTime], slot) => {
      if ((3 * index + 5 * dayOfWeek + 7 * slot) % 4 === 0) {
        schedule.push({ dayOfWeek, startTime, endTime, title: TITLES[(index + slot) % TITLES.length] });
      }
    });
  }
  return schedule;
}

export const seedRooms: SeedRoom[] = Object.entries(ROOM_NUMBERS).flatMap(([floor, roomNumbers]) =>
  roomNumbers.map((roomNumber, index) => ({
    id: `eng-${roomNumber}`,
    buildingId: "eng",
    floor: Number(floor),
    name: `${roomNumber}호`,
    capacity: DEMO_ROOMS[roomNumber]?.capacity ?? CAPACITIES[index % CAPACITIES.length],
    tags: DEMO_ROOMS[roomNumber]?.tags ?? TAG_SETS[index % TAG_SETS.length],
    schedule: DEMO_ROOMS[roomNumber]?.schedule ?? generatedSchedule(index),
  })),
);
