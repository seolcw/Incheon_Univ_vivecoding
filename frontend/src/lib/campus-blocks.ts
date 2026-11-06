// 3D 캠퍼스 지도의 건물 블록. docs/reference/campus-maps의 배치만 보고 옮긴 단순 도형이다.
// 좌표는 프론트 전용이고 API에 없다(docs/scope-change.md). 축척은 정확하지 않다.
//
// 평면 좌표: x는 서→동, z는 북→남, 둘 다 약 0–100. h는 높이다.

export interface CampusPart {
  /** 바닥 중심 */
  x: number;
  z: number;
  /** x, z 방향 길이 */
  w: number;
  d: number;
  h: number;
  /** 원통형 건물 */
  round?: boolean;
}

export interface CampusBlock {
  /** API 건물 id와 같으면 실제 데이터로 칠한다. 나머지는 회색 "준비 중"이다. */
  id: string;
  parts: CampusPart[];
  /** 층 수를 띠로 보여 줄 건물 */
  floors?: number;
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

export const CAMPUS_GROUND: CampusRect = { x: 50, z: 50, w: 100, d: 96 };

export const CAMPUS_BLOCKS: CampusBlock[] = [
  {
    // 정보기술대학(건물 번호 07). A동, 연결부, B동 도면(lib/floor-plans.ts)의 모양을 따른다.
    id: "eng",
    floors: 5,
    parts: [
      { x: 36.5, z: 65, w: 5.5, d: 14, h: 8 },
      { x: 41.5, z: 70, w: 4.5, d: 4, h: 8 },
      { x: 46.5, z: 65, w: 5.5, d: 14, h: 8 },
    ],
  },
  { id: "b01", parts: [{ x: 87, z: 56, w: 11, d: 8, h: 5 }, { x: 87, z: 55.5, w: 6, d: 6, h: 18 }] },
  { id: "b02", parts: [{ x: 92, z: 30, w: 8, d: 11, h: 7 }] },
  { id: "b03", parts: [{ x: 92, z: 43, w: 6, d: 6, h: 10 }] },
  { id: "b04", parts: [{ x: 90, z: 71, w: 8, d: 8, h: 6 }] },
  { id: "b05", parts: [{ x: 67, z: 66, w: 9, d: 13, h: 7 }, { x: 76.5, z: 66, w: 10, d: 8, h: 7 }] },
  { id: "b06", parts: [{ x: 56, z: 65, w: 9, d: 11, h: 9 }] },
  { id: "b06-1", parts: [{ x: 55.5, z: 77, w: 11, d: 8, h: 5 }] },
  {
    id: "b08",
    parts: [
      { x: 16, z: 66, w: 4, d: 12, h: 7 },
      { x: 22, z: 65.5, w: 4, d: 13, h: 7 },
      { x: 28, z: 65, w: 4, d: 14, h: 7 },
      { x: 22, z: 59, w: 16, d: 3, h: 7 },
    ],
  },
  { id: "b09", parts: [{ x: 20, z: 84, w: 11, d: 8, h: 6 }] },
  { id: "b10", parts: [{ x: 9, z: 70, w: 9, d: 6, h: 5 }] },
  { id: "b11", parts: [{ x: 31, z: 47, w: 13, d: 9, h: 5 }] },
  { id: "b12", parts: [{ x: 44, z: 44, w: 11, d: 9, h: 7 }] },
  { id: "b12-1", parts: [{ x: 55, z: 46, w: 8, d: 8, h: 4 }] },
  { id: "b13", parts: [{ x: 69, z: 46, w: 17, d: 7, h: 7 }] },
  { id: "b14", parts: [{ x: 72, z: 31, w: 10, d: 9, h: 7 }, { x: 81, z: 31, w: 6, d: 7, h: 7 }] },
  { id: "b15", parts: [{ x: 50, z: 31, w: 22, d: 6, h: 7 }] },
  { id: "b16", parts: [{ x: 32, z: 30, w: 12, d: 6, h: 5 }] },
  { id: "b17", parts: [{ x: 21.5, z: 35, w: 8, d: 9, h: 6 }] },
  {
    id: "b18",
    parts: [
      { x: 8, z: 24, w: 8, d: 5, h: 13 },
      { x: 16, z: 20, w: 5, d: 9, h: 13 },
      { x: 5, z: 33, w: 6, d: 6, h: 13 },
      { x: 19, z: 10, w: 6, d: 8, h: 9 },
    ],
  },
  { id: "b19", parts: [{ x: 26, z: 24, w: 9, d: 5, h: 5 }] },
  { id: "b20", parts: [{ x: 32, z: 13, w: 10, d: 8, h: 5 }] },
  { id: "b21", parts: [{ x: 45, z: 10, w: 14, d: 10, h: 8 }] },
  { id: "b22", parts: [{ x: 55, z: 16, w: 7, d: 5, h: 3 }] },
  { id: "b23", parts: [{ x: 87, z: 11, w: 9, d: 9, h: 6 }, { x: 94, z: 10, w: 7, d: 7, h: 8, round: true }] },
  { id: "b24", parts: [{ x: 81, z: 78, w: 4.4, d: 4.4, h: 20, round: true }] },
  { id: "b25", parts: [{ x: 72, z: 92, w: 8, d: 6, h: 3 }] },
  { id: "b27", parts: [{ x: 13, z: 92, w: 8, d: 6, h: 5 }] },
  { id: "b28", parts: [{ x: 5, z: 88, w: 7, d: 8, h: 5 }] },
  { id: "b29", parts: [{ x: 9, z: 61, w: 6, d: 6, h: 11 }] },
];

export const CAMPUS_ROADS: CampusRect[] = [
  { x: 40.5, z: 53.5, w: 81, d: 2.4 },
  { x: 44, z: 40, w: 88, d: 1.8 },
  { x: 59, z: 20.5, w: 82, d: 2 },
  { x: 24.5, z: 75.5, w: 49, d: 2 },
  { x: 74, z: 84, w: 52, d: 2.4 },
  { x: 49, z: 80, w: 1.8, d: 9 },
  { x: 61.5, z: 63.5, w: 1.4, d: 20 },
];

/** 운동장: 타원 트랙과 안쪽 잔디 */
export const CAMPUS_FIELD: CampusRect = { x: 70, z: 10.5, w: 25, d: 14 };

const TREE_COUNT = 90;

function isBlocked(x: number, z: number, margin: number) {
  const overlaps = (rect: CampusRect, extra: number) =>
    Math.abs(x - rect.x) < rect.w / 2 + extra && Math.abs(z - rect.z) < rect.d / 2 + extra;
  return (
    CAMPUS_BLOCKS.some((block) => block.parts.some((part) => overlaps(part, margin))) ||
    CAMPUS_ROADS.some((road) => overlaps(road, margin * 0.7)) ||
    overlaps(CAMPUS_FIELD, margin)
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
    const size = 0.8 + random() * 0.8;
    if (!isBlocked(x, z, size + 0.6)) trees.push({ x, z, size });
  }
  return trees;
}

export const CAMPUS_TREES = plantTrees();
