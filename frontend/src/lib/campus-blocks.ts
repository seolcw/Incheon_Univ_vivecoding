// 3D 캠퍼스 지도의 건물 블록. 좌표는 프론트 전용이고 API에 없다(docs/scope-change.md).
//
// 위치와 층수: 인천대 공식 캠퍼스맵(inu.ac.kr/inu/739)의 건물 좌표와 층 목록을 평면으로 옮겼다.
// 형태: 공식 건물 사진과 스트리트뷰를 보고 단순한 도형으로 직접 만들었다. 사진은 쓰지 않는다.
// 건물 폭과 높이는 지도에서 잘 보이도록 실제보다 키웠고, 겹치는 건물은 조금 옮겼다.
//
// 평면 좌표: x는 남서→북동(하모니로 방향), z는 북서→남동. 1단위는 약 6.7m다.

const FLOOR_HEIGHT = 1.3;

export interface CampusPart {
  /** 바닥 중심 */
  x: number;
  z: number;
  /** x, z 방향 길이 */
  w: number;
  d: number;
  h: number;
  /** 바닥에서 띄운 높이 */
  y?: number;
  shape?: "box" | "round" | "wedge" | "hourglass";
  tone?: "wall" | "glass";
  /** 벽을 두르는 띠창 줄 수 */
  floors?: number;
  /** "준비 중" 글자를 얹을 지붕 */
  decal?: boolean;
}

export interface CampusBlock {
  /** API 건물 id와 같으면 실제 데이터로 칠한다. 나머지는 회색 "준비 중"이다. */
  id: string;
  parts: CampusPart[];
}

export interface CampusRect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface CampusTree {
  x: number;
  z: number;
  size: number;
}

const floorsToHeight = (floors: number) => floors * FLOOR_HEIGHT;

/** 띠창이 층마다 도는 기본 건물 */
function bar(x: number, z: number, w: number, d: number, floors: number, extra: Partial<CampusPart> = {}): CampusPart {
  return { x, z, w, d, h: floorsToHeight(floors), floors, ...extra };
}

/** 띠창 없이 막힌 석재 블록 */
function solid(x: number, z: number, w: number, d: number, h: number, extra: Partial<CampusPart> = {}): CampusPart {
  return { x, z, w, d, h, ...extra };
}

function glass(x: number, z: number, w: number, d: number, h: number, extra: Partial<CampusPart> = {}): CampusPart {
  return { x, z, w, d, h, tone: "glass", ...extra };
}

function drum(x: number, z: number, size: number, h: number, extra: Partial<CampusPart> = {}): CampusPart {
  return { x, z, w: size, d: size, h, shape: "round", tone: "glass", ...extra };
}

/** 입면 앞의 기둥 열 */
function colonnade(x: number, zFrom: number, zTo: number, step: number, h: number): CampusPart[] {
  const columns: CampusPart[] = [];
  for (let z = zFrom; z <= zTo; z += step) columns.push(solid(x, z, 0.45, 0.45, h));
  return columns;
}

/** 위가 유리층이고 지붕판이 튀어나온 건물(14, 15번) */
function glassTop(x: number, z: number, w: number, d: number, floors: number, glassFloors: number): CampusPart[] {
  const baseHeight = floorsToHeight(floors);
  const glassHeight = floorsToHeight(glassFloors);
  return [
    bar(x, z, w, d, floors),
    glass(x, z, w - 0.5, d - 0.5, glassHeight, { y: baseHeight }),
    solid(x, z, w + 0.5, d + 0.5, 0.26, { y: baseHeight + glassHeight, decal: true }),
  ];
}

export const CAMPUS_GROUND: CampusRect = { x: 46.5, z: 30, w: 107, d: 86 };

export const CAMPUS_BLOCKS: CampusBlock[] = [
  {
    // 07 정보기술대학. 공식 사진: 양 끝 석재 블록 사이로 유리 띠창이 이어진다. 평면은 lib/floor-plans.ts의 A동·연결부·B동.
    id: "eng",
    parts: [
      bar(47.2, 47.2, 4.4, 7.6, 5),
      solid(47.2, 42.4, 4.4, 2, 7.3),
      solid(47.2, 52, 4.4, 2, 6.9),
      bar(56.3, 47.2, 4.4, 7.6, 5),
      solid(56.3, 42.4, 4.4, 2, 6.9),
      solid(56.3, 52, 4.4, 2, 7.3),
      bar(51.75, 50.6, 4.7, 4.8, 5),
    ],
  },
  {
    // 01 대학본부: 기둥 열 위 넓은 매스와 지붕의 원형 드럼
    id: "b01",
    parts: [
      bar(89, 35.8, 7, 14.5, 5, { decal: true }),
      solid(84.9, 35.8, 1.3, 13, 0.32, { y: 4.1 }),
      ...colonnade(84.5, 30, 41.6, 1.93, 4.1),
      drum(89, 35.8, 5.6, 1.5, { y: 6.5 }),
      { x: 89, z: 35.8, w: 6.6, d: 6.6, h: 0.22, y: 8, shape: "round" },
    ],
  },
  // 02 교수회관: 낮은 유리동과 세로 핀이 있는 높은 동
  { id: "b02", parts: [glass(87.3, 19.4, 4.6, 5.6, 2.8), bar(92.4, 19.6, 5.6, 9, 3, { h: 4.6, decal: true })] },
  // 03 INU CUBE: 유리 큐브와 스카이브리지
  { id: "b03", parts: [glass(88.4, 25.2, 4.2, 4.2, 3.4), glass(88.4, 27.9, 1.2, 1.4, 0.6, { y: 2.4 })] },
  // 04 정보전산원: 큰 프레임이 있는 3층 매스
  {
    id: "b04",
    parts: [bar(91, 48.6, 6, 8.4, 3, { decal: true }), solid(91, 44.2, 6.6, 0.7, 5.6), solid(91, 53, 6.6, 0.7, 5.6)],
  },
  // 05 자연과학대학: 석재 2동과 유리 계단실
  {
    id: "b05",
    parts: [
      bar(72.6, 48.8, 7, 10.5, 5, { decal: true }),
      glass(76.9, 47.4, 1.6, 3.2, 7.2),
      bar(81.1, 47.6, 6.6, 7, 5),
    ],
  },
  // 06 학산도서관: 파낸 하부 위로 상부 박스가 돌출된다.
  {
    id: "b06",
    parts: [
      solid(64, 48.7, 7, 8.4, 2.6),
      bar(64, 48.7, 9.2, 10.6, 2, { y: 2.6, h: 3, decal: true }),
      ...colonnade(59.8, 45, 52.4, 3.7, 2.6),
    ],
  },
  // 08 공과대학: 복도동에 3개 동이 빗살처럼 붙는다.
  {
    id: "b08",
    parts: [
      bar(30.5, 41.5, 19, 2.8, 5, { decal: true }),
      bar(23, 47.6, 3.6, 9.6, 5),
      solid(23, 52.8, 3.6, 1.2, 7),
      bar(30.5, 47.6, 3.6, 9.6, 5),
      solid(30.5, 52.8, 3.6, 1.2, 7),
      bar(38, 47.6, 3.6, 9.6, 5),
      solid(38, 52.8, 3.6, 1.2, 7),
    ],
  },
  // 09 공동실험실습관: 넓은 매스와 가는 계단탑
  { id: "b09", parts: [bar(26, 65.5, 11, 6, 5, { decal: true }), solid(19.9, 65.5, 1.5, 3, 8.2)] },
  // 10 게스트하우스
  { id: "b10", parts: [bar(11.6, 44.3, 8.6, 6, 4, { decal: true })] },
  // 11 복지회관: 낮은 매스와 곡면 유리
  { id: "b11", parts: [bar(35, 27.6, 10, 7, 3, { decal: true }), drum(28.5, 27.6, 6, 3.4)] },
  // 12 컨벤션센터: 긴 매스와 끝쪽 유리 계단실
  { id: "b12", parts: [bar(55, 26.5, 11, 8, 5, { decal: true }), glass(61, 26.5, 1.3, 3, 7.4)] },
  // 13 사회과학대학: 벽돌 매스와 모서리 유리탑
  { id: "b13", parts: [bar(70.5, 27.6, 12, 6.5, 5, { decal: true }), glass(64, 27.6, 2.4, 6.5, 7.6)] },
  // 14 경영대학, 15 인문대학: 위층이 유리
  { id: "b14", parts: glassTop(75.7, 17, 10, 8, 4, 1) },
  { id: "b15", parts: glassTop(52.1, 18.6, 18, 5.6, 3, 2) },
  // 16 예술체육대학: 필로티 위 긴 석재 박스와 원형 유리동
  {
    id: "b16",
    parts: [
      solid(37.4, 18.8, 6.6, 4.4, 2.5),
      bar(34.1, 18.8, 13.4, 5.4, 2, { y: 2.5, h: 2.8, decal: true }),
      drum(28.8, 21.4, 5.6, 2.5),
      ...colonnade(29, 16.8, 16.8, 1, 2.5),
    ],
  },
  // 17 학생회관
  { id: "b17", parts: [bar(25, 19.4, 7, 8, 4, { decal: true })] },
  // 18 기숙사 3동: 13층 고층과 낮은 연결부
  { id: "b18-1", parts: [bar(9.8, 14.4, 5, 7.6, 13, { decal: true })] },
  { id: "b18-2", parts: [bar(6.5, 0, 5, 5, 11), bar(16.5, 1.6, 5, 5, 11), glass(11.5, 0.8, 5.2, 3.6, 2)] },
  { id: "b18-3", parts: [bar(0.4, 16, 4.4, 8, 13), solid(0.4, 22, 4.4, 4.2, 2.4)] },
  // 19 융합자유전공대학
  { id: "b19", parts: [bar(25.4, 11.6, 8.4, 4.4, 2, { decal: true })] },
  // 20 스포츠센터, 21 체육관: 경사 지붕
  { id: "b20", parts: [solid(25, 0, 11, 8, 4.2, { shape: "wedge" })] },
  { id: "b21", parts: [solid(38, 1, 11, 10, 6.4, { shape: "wedge" })] },
  // 22 학군단: 2층과 기운 포인트 벽
  { id: "b22", parts: [bar(46.6, 3.4, 5, 5, 2, { decal: true }), solid(43.4, 3.4, 1.4, 5, 3.6, { shape: "wedge" })] },
  // 23 강당·공연장: 낮은 매스와 원형 유리동
  {
    id: "b23",
    parts: [bar(84, 0.8, 13, 7, 2, { decal: true }), solid(84, 5, 13, 1.6, 0.26, { y: 2.2 }), drum(93.4, 1.6, 7, 4.4)],
  },
  // 24 전망타워: 허리가 잘록한 모래시계형
  { id: "b24", parts: [{ x: 87, z: 58, w: 5.2, d: 5.2, h: 19, shape: "hourglass", tone: "glass" }] },
  // 25 해둥실어린이집, 26 온실, 팝업스토어
  { id: "b25", parts: [bar(79, 66, 7, 5, 1, { decal: true })] },
  { id: "b26", parts: [glass(74.2, 61, 3.4, 3, 1.5)] },
  { id: "b-popup", parts: [solid(46.1, 63, 2.2, 1.4, 1)] },
  // 27 제2공동실습관: 옥상의 큰 프레임
  {
    id: "b27",
    parts: [
      bar(12.2, 65.5, 8, 7, 4, { decal: true }),
      solid(12.2, 62.3, 8, 0.6, 6.6),
      solid(8.5, 65.5, 0.6, 7, 6.6),
    ],
  },
  // 28 도시과학대학, 29 생명공학부: 6층
  { id: "b28", parts: [bar(3.6, 65.5, 7, 8, 6, { decal: true }), glass(3.6, 70, 2.4, 1, 8.6)] },
  { id: "b29", parts: [bar(2.5, 43.2, 6, 9, 6, { decal: true })] },
];

/** 차도. 공식 지도 좌표 기준의 근사 위치다. */
export const CAMPUS_ROADS: CampusRect[] = [
  { x: 18, z: 40.5, w: 2.2, d: 65 },
  { x: 59, z: 7.6, w: 82, d: 2.2 },
  { x: 32, z: 59.7, w: 40, d: 1.8 },
  { x: 97.4, z: 22, w: 1.6, d: 29 },
];

/** 건물 사이의 보행로 */
export const CAMPUS_PATHS: CampusRect[] = [
  { x: 51, z: 37.6, w: 66, d: 1.8 },
  { x: 41.5, z: 32, w: 1.2, d: 10 },
  { x: 61.6, z: 54.8, w: 1.2, d: 33 },
];

/** 본관 앞 회전교차로 */
export const CAMPUS_ROUNDABOUT = { x: 96.6, z: 38.6, outer: 7.4, inner: 3.8 };

/** 운동장: 타원 트랙과 안쪽 잔디 */
export const CAMPUS_FIELD: CampusRect = { x: 60, z: -3.4, w: 24, d: 13.5 };

/** 본관 앞 중앙정원의 낮은 생울타리 */
export const CAMPUS_HEDGES: CampusPart[] = [
  { x: 68.5, z: 34.6, w: 7, d: 1.6, h: 0.5 },
  { x: 77.5, z: 34.6, w: 7, d: 1.6, h: 0.5 },
  { x: 68.5, z: 40.4, w: 7, d: 1.6, h: 0.5 },
  { x: 77.5, z: 40.4, w: 7, d: 1.6, h: 0.5 },
];

const TREE_COUNT = 120;

function isBlocked(x: number, z: number, margin: number) {
  const overlaps = (rect: CampusRect, extra: number) =>
    Math.abs(x - rect.x) < rect.w / 2 + extra && Math.abs(z - rect.z) < rect.d / 2 + extra;
  const roundabout = Math.hypot(x - CAMPUS_ROUNDABOUT.x, z - CAMPUS_ROUNDABOUT.z);
  return (
    CAMPUS_BLOCKS.some((block) => block.parts.some((part) => overlaps(part, margin))) ||
    CAMPUS_ROADS.some((road) => overlaps(road, margin * 0.7)) ||
    CAMPUS_PATHS.some((path) => overlaps(path, margin * 0.5)) ||
    CAMPUS_HEDGES.some((hedge) => overlaps(hedge, margin * 0.5)) ||
    overlaps(CAMPUS_FIELD, margin) ||
    roundabout < CAMPUS_ROUNDABOUT.outer / 2 + margin
  );
}

/** 빈 땅에 흩어 심는다. 시드를 고정해 새로고침해도 배치가 같다. */
function plantTrees(): CampusTree[] {
  let seed = 20261106;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const trees: CampusTree[] = [];
  for (let attempt = 0; attempt < TREE_COUNT * 30 && trees.length < TREE_COUNT; attempt += 1) {
    const x = CAMPUS_GROUND.x - CAMPUS_GROUND.w / 2 + 2 + random() * (CAMPUS_GROUND.w - 4);
    const z = CAMPUS_GROUND.z - CAMPUS_GROUND.d / 2 + 2 + random() * (CAMPUS_GROUND.d - 4);
    const size = 0.7 + random() * 0.7;
    if (!isBlocked(x, z, size + 0.5)) trees.push({ x, z, size });
  }
  return trees;
}

export const CAMPUS_TREES = plantTrees();
