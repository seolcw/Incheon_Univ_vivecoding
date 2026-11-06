// 3D 캠퍼스 지도의 건물 블록. 좌표는 프론트 전용이고 API에 없다(docs/scope-change.md).
//
// 위치·층수·평면: 인천대 공식 캠퍼스맵(inu.ac.kr/inu/739)의 건물 좌표, 층 목록, 지도를 보고 직접 옮겼다.
// 형태: 공식 조감도와 건물 사진, 스트리트뷰를 보고 단순한 도형으로 만들었다. 사진은 쓰지 않는다.
// 색: 공식 건물 사진의 재료 색을 눈으로 고른 값이다. 건물 고유의 데이터라 디자인 토큰에 두지 않는다.
//
// 평면 좌표: x는 남서→북동(하모니로 방향), z는 북서→남동. 1단위는 약 6.7m다.
// 높이는 지도에서 층이 읽히도록 실제의 약 1.8배로 키웠다.

const FLOOR_HEIGHT = 1.05;

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
  /** frame은 유리 커튼월을 가로지르는 밝은 띠와 틀이다. */
  tone?: "wall" | "glass" | "accent" | "frame" | "net";
  /** 벽을 두르는 창 띠 줄 수 */
  floors?: number;
  /** 층 높이에서 창 띠가 차지하는 비율. 유리가 많은 벽일수록 크다. */
  glazing?: number;
}

export interface CampusColors {
  wall: string;
  glass: string;
  roof: string;
  /** 벽돌 하부, 옥상 구조물 같은 보조 재료 */
  accent: string;
  /** 유리 커튼월의 밝은 띠와 틀. 없으면 벽 색을 쓴다. */
  frame?: string;
}

export interface CampusBlock {
  /** API 건물 id와 같으면 빈 비율을 보여 준다. 나머지는 "준비 중"이다. */
  id: string;
  name: string;
  colors: CampusColors;
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

const ROOF_TOP_FLOORS_5 = floorsToHeight(5);

function bar(x: number, z: number, w: number, d: number, floors: number, extra: Partial<CampusPart> = {}): CampusPart {
  return { x, z, w, d, h: floorsToHeight(floors), floors, ...extra };
}

function solid(x: number, z: number, w: number, d: number, h: number, extra: Partial<CampusPart> = {}): CampusPart {
  return { x, z, w, d, h, ...extra };
}

function glass(x: number, z: number, w: number, d: number, h: number, extra: Partial<CampusPart> = {}): CampusPart {
  return { x, z, w, d, h, tone: "glass", ...extra };
}

function drum(x: number, z: number, size: number, h: number, extra: Partial<CampusPart> = {}): CampusPart {
  return { x, z, w: size, d: size, h, shape: "round", tone: "glass", ...extra };
}

function roofBox(x: number, z: number, w: number, d: number, y: number): CampusPart {
  return solid(x, z, w, d, 0.7, { y, tone: "accent" });
}

/** z 방향으로 늘어선 기둥 열 */
function columnsAlongZ(x: number, zFrom: number, zTo: number, step: number, h: number): CampusPart[] {
  const columns: CampusPart[] = [];
  for (let z = zFrom; z <= zTo; z += step) columns.push(solid(x, z, 0.4, 0.4, h));
  return columns;
}

/** x 방향으로 늘어선 기둥 열 */
function columnsAlongX(z: number, xFrom: number, xTo: number, step: number, h: number): CampusPart[] {
  const columns: CampusPart[] = [];
  for (let x = xFrom; x <= xTo; x += step) columns.push(solid(x, z, 0.4, 0.4, h));
  return columns;
}

/** 위층이 유리이고 지붕판이 튀어나온 건물(14, 15번) */
function glassTop(x: number, z: number, w: number, d: number, floors: number, glassFloors: number): CampusPart[] {
  const baseHeight = floorsToHeight(floors);
  const glassHeight = floorsToHeight(glassFloors);
  return [
    bar(x, z, w, d, floors),
    glass(x, z, w - 0.4, d - 0.4, glassHeight, { y: baseHeight }),
    solid(x, z, w + 0.4, d + 0.4, 0.22, { y: baseHeight + glassHeight }),
  ];
}

/** 공대 한 동(8호관 A·B·C): 북서쪽 긴 동과, 남동쪽 끝에서 조금 넓어지는 석재 + 회색 유리 머리동 */
function engineeringWing(x: number): CampusPart[] {
  return [
    bar(x, 45, 2.9, 9.6, 5),
    solid(x - 0.5, 52.1, 1.9, 4.6, 6.1),
    bar(x + 1.4, 52.1, 2, 4.6, 5, { tone: "frame", glazing: 0.72 }),
    glass(x - 0.5, 54.42, 0.5, 0.06, 5.4),
    roofBox(x, 43, 1.8, 2.4, ROOF_TOP_FLOORS_5),
    roofBox(x + 1.4, 52.1, 1.2, 2, ROOF_TOP_FLOORS_5),
  ];
}

/** 공대 동 사이: 남동쪽의 3층 유리 연결동과 북서쪽의 가는 통로 */
function engineeringLinks(x: number): CampusPart[] {
  return [
    bar(x + 4.275, 51.1, 3.75, 2.6, 3, { tone: "frame", glazing: 0.72 }),
    glass(x + 3.8, 42.8, 4.7, 0.5, 0.9, { y: 2.1 }),
  ];
}

/** 정보대 남쪽 끝의 석재 탑: 지붕 위로 올라온 큰 프레임이 뚫려 있다. */
function stoneTower(x: number, z: number, w: number, d: number): CampusPart[] {
  return [
    solid(x, z, w, d, ROOF_TOP_FLOORS_5),
    solid(x - w / 2 + 0.3, z, 0.6, d, 1.1, { y: ROOF_TOP_FLOORS_5 }),
    solid(x + w / 2 - 0.3, z, 0.6, d, 1.1, { y: ROOF_TOP_FLOORS_5 }),
    solid(x, z, w, d, 0.3, { y: ROOF_TOP_FLOORS_5 + 1.1 }),
  ];
}

export const CAMPUS_GROUND: CampusRect = { x: 46.5, z: 28, w: 107, d: 90 };

export const CAMPUS_BLOCKS: CampusBlock[] = [
  {
    // 07 정보기술대학: 북서쪽이 트인 U자. 남동쪽 면은 갈색 석재 탑 사이의 유리 커튼월이다(스트리트 사진 기준).
    // 평면은 lib/floor-plans.ts의 A동·연결부·B동.
    id: "eng",
    name: "정보대",
    colors: { wall: "#a58b77", glass: "#4f6675", roof: "#e6e3dc", accent: "#a25a45", frame: "#d4d7d8" },
    parts: [
      bar(45, 47.2, 2.9, 8.4, 5),
      bar(51.1, 47.2, 2.8, 8.4, 5),
      bar(48.05, 52.55, 3.26, 2.7, 5, { tone: "frame", glazing: 0.74 }),
      ...stoneTower(45, 52.65, 2.9, 2.5),
      ...stoneTower(51.1, 52.65, 2.8, 2.5),
      glass(51.1, 53.93, 2.2, 0.06, 1, { y: 0.25 }),
      solid(51.1, 53.93, 2.6, 0.08, 0.25, { tone: "accent" }),
      roofBox(45, 47.2, 1.7, 2.2, ROOF_TOP_FLOORS_5),
      roofBox(51.1, 47.2, 1.7, 2.2, ROOF_TOP_FLOORS_5),
    ],
  },
  {
    // 01 대학본부: 기둥 열 위 유리 매스와 지붕의 원형 드럼
    id: "b01",
    name: "대학본부",
    colors: { wall: "#dcdfe1", glass: "#6f90a8", roof: "#eceded", accent: "#c9cdd0" },
    parts: [
      bar(87.8, 36.5, 6, 12.7, 5, { glazing: 0.7 }),
      solid(84.2, 36.5, 1.2, 11, 0.3, { y: 4 }),
      ...columnsAlongZ(83.9, 31.5, 41.5, 1.66, 4),
      drum(87.8, 36.5, 4.6, 1.5, { y: ROOF_TOP_FLOORS_5 }),
      { x: 87.8, z: 36.5, w: 5.4, d: 5.4, h: 0.2, y: ROOF_TOP_FLOORS_5 + 1.5, shape: "round" },
    ],
  },
  {
    // 02 교수회관: 낮은 유리동과 세로 핀이 있는 높은 동
    id: "b02",
    name: "교수회관",
    colors: { wall: "#d9d8d2", glass: "#57767e", roof: "#e8e7e2", accent: "#c8c7c0" },
    parts: [glass(86.8, 19.5, 4, 5, 2.9), bar(91.6, 20.4, 5, 7.5, 3, { h: 3.6, glazing: 0.5 })],
  },
  {
    // 03 INU CUBE: 유리 큐브와 스카이브리지
    id: "b03",
    name: "INU CUBE",
    colors: { wall: "#dfe3e3", glass: "#86aeb4", roof: "#e6e9e9", accent: "#c9cfd0" },
    parts: [
      glass(88.4, 25.6, 3.6, 3.6, 2.8),
      { x: 88.4, z: 25.6, w: 3.9, d: 3.9, h: 0.14, y: 2.8 },
      glass(88.2, 28.8, 1, 2.6, 0.5, { y: 1.8 }),
    ],
  },
  {
    // 04 정보전산원: 큰 프레임이 있는 3층 매스와 작은 유리동
    id: "b04",
    name: "정보전산원",
    colors: { wall: "#d6d8d9", glass: "#4f747c", roof: "#e4e5e6", accent: "#c0c3c5" },
    parts: [
      bar(91.2, 47.9, 5, 8, 3, { glazing: 0.5 }),
      solid(91.2, 43.7, 5.6, 0.5, 4.4),
      solid(91.2, 52.1, 5.6, 0.5, 4.4),
      glass(95.3, 52.5, 2.6, 2.6, 1.6),
    ],
  },
  {
    // 05 자연과학대학: 정보대처럼 북서쪽이 트인 U자. 남쪽 면에 유리 띠창이 있고 동쪽으로 유리동이 이어진다.
    id: "b05",
    name: "자연과학대학",
    colors: { wall: "#b39a82", glass: "#63849a", roof: "#e5e2db", accent: "#ece9e2", frame: "#d4d7d8" },
    parts: [
      bar(69.2, 47, 3.2, 10, 5),
      bar(76.6, 46.6, 3.2, 9.2, 5),
      bar(72.9, 52, 10.6, 3, 5, { tone: "frame", glazing: 0.72 }),
      solid(67, 52.2, 2, 3.4, 5.9),
      solid(79, 52.2, 2.2, 3.4, 5.9),
      bar(81.9, 50.4, 3.6, 4, 5, { glazing: 0.72 }),
      glass(72.9, 43.6, 4.2, 1.4, 3, { y: 0.8 }),
      roofBox(69.2, 45, 1.8, 2.4, ROOF_TOP_FLOORS_5),
      roofBox(76.6, 45, 1.8, 2.4, ROOF_TOP_FLOORS_5),
    ],
  },
  {
    // 06 학산도서관(4층)과 앞쪽 이룸관: 파낸 유리 하부 위로 금속 박스가 돌출되고 벽돌 하부가 있다.
    id: "b06",
    name: "학산도서관",
    colors: { wall: "#c4c8cc", glass: "#5f839b", roof: "#e9e8e4", accent: "#a14b39" },
    parts: [
      glass(60.9, 48.2, 8, 8, 2.1),
      bar(60.9, 48.2, 10.2, 9.6, 2, { y: 2.1, h: 2.6, glazing: 0.5 }),
      glass(60.9, 47.6, 3, 3, 0.12, { y: 4.7 }),
      ...columnsAlongZ(56.2, 44.5, 52, 2.5, 2.1),
      solid(60.9, 52.7, 9.6, 1, 1.6, { tone: "accent" }),
      bar(60.9, 55, 9, 3.6, 3, { glazing: 0.6 }),
      solid(60.9, 56.9, 9.2, 0.3, 1, { tone: "accent" }),
    ],
  },
  {
    // 08 공과대학(8호관 A·B·C): 북서→남동으로 긴 동 3개가 나란하고, 남동쪽은 낮은 유리동으로, 북서쪽은 가는 통로로 잇는다.
    // 동 사이는 건물이 아니라 마당이다.
    id: "b08",
    name: "공과대학",
    colors: { wall: "#a8917d", glass: "#5f7a85", roof: "#e3e1db", accent: "#9ea2a6", frame: "#c6cacc" },
    parts: [
      ...engineeringWing(22.5),
      ...engineeringWing(30.1),
      ...engineeringWing(37.7),
      ...engineeringLinks(22.5),
      ...engineeringLinks(30.1),
    ],
  },
  {
    // 09 공동실험실습관: 회색 패널의 긴 동, 옆 동, 가는 계단탑
    id: "b09",
    name: "공동실험실습관",
    colors: { wall: "#b9bdc1", glass: "#566870", roof: "#e2e3e3", accent: "#a5a9ad" },
    parts: [bar(23.5, 65, 4, 11, 5), bar(28.4, 62.2, 6, 3.4, 5), solid(20.9, 64, 1, 2.4, 6.6)],
  },
  {
    // 10 게스트하우스: 모서리 탑을 둔 L자
    id: "b10",
    name: "게스트하우스",
    colors: { wall: "#c8b69a", glass: "#46807f", roof: "#e4e1d9", accent: "#d1a765" },
    parts: [bar(13.4, 45.6, 3, 9, 4), bar(10, 50.6, 6.8, 2.6, 4), solid(13.4, 50.8, 3, 3, 4.8, { tone: "accent" })],
  },
  {
    // 11 복지회관: 긴 매스, 곡면 유리동, 벽돌 끝벽
    id: "b11",
    name: "복지회관",
    colors: { wall: "#d6dadb", glass: "#609aa6", roof: "#e8e8e5", accent: "#c0795e" },
    parts: [
      bar(33.8, 28.8, 13, 4.8, 4, { glazing: 0.5 }),
      drum(26.9, 30.3, 5, 2.8),
      solid(40.8, 28.8, 1.4, 5.4, 4.6, { tone: "accent" }),
    ],
  },
  {
    // 12 컨벤션센터: 긴 매스, 양 끝 유리 계단실, 천창이 있는 낮은 홀
    id: "b12",
    name: "컨벤션센터",
    colors: { wall: "#a9a49b", glass: "#5f808c", roof: "#e4e3df", accent: "#d3d0c9" },
    parts: [
      bar(52.5, 28.6, 13, 5, 5, { glazing: 0.5 }),
      glass(45.4, 28.6, 1.4, 3, 5.8),
      glass(59.4, 28.6, 1.2, 3, 5.8),
      solid(63, 28.4, 5, 6, 3.1, { tone: "accent" }),
      glass(63, 28.4, 2.4, 2.4, 0.5, { y: 3.1 }),
    ],
  },
  {
    // 13 사회과학대학: 벽돌 매스와 모서리 유리탑
    id: "b13",
    name: "사회과학대학",
    colors: { wall: "#a75f46", glass: "#65848d", roof: "#e6e2da", accent: "#d8c7a6" },
    parts: [
      bar(71, 28, 10.4, 4.6, 5),
      glass(66.6, 28, 2, 4.8, 6),
      roofBox(71, 27.8, 3, 2.4, ROOF_TOP_FLOORS_5),
    ],
  },
  {
    // 14 경영대학: 위층이 유리인 3개 동이 나란하다.
    id: "b14",
    name: "경영대학",
    colors: { wall: "#c39c7b", glass: "#648c96", roof: "#e6e3dc", accent: "#d9ad8a" },
    parts: [
      ...glassTop(63.1, 20.1, 4.8, 4.8, 4, 1),
      ...glassTop(68.6, 19.4, 5, 5.2, 4, 1),
      ...glassTop(75.5, 18.5, 5.6, 5.6, 4, 1),
    ],
  },
  {
    // 15 인문대학: 가운데 유리 아트리움과 양쪽 동, 벽돌 하부와 유리 상부
    id: "b15",
    name: "인문대학",
    colors: { wall: "#ad6a50", glass: "#658d97", roof: "#e7e4dd", accent: "#c9825a" },
    parts: [...glassTop(46.1, 19.8, 8, 4.2, 3, 2), ...glassTop(55, 19.8, 5.4, 4.2, 3, 2), glass(50.9, 19.8, 2.4, 5, 6.4)],
  },
  {
    // 16 예술체육대학: 필로티 위 긴 석재 박스와 앞쪽 원형 유리동
    id: "b16",
    name: "예술체육대학",
    colors: { wall: "#c2b194", glass: "#6a8c9b", roof: "#e6e3da", accent: "#b3a285" },
    parts: [
      bar(34, 20, 13, 3.6, 2, { y: 2.1, h: 2.1, glazing: 0.5 }),
      solid(37.5, 20, 6, 2.8, 2.1, { tone: "accent" }),
      drum(33, 22.8, 4.2, 2.1),
      glass(34, 20, 2.5, 1.2, 0.25, { y: 4.2 }),
      ...columnsAlongX(21.6, 28.2, 31.6, 1.7, 2.1),
    ],
  },
  {
    // 17 학생회관: 벽돌과 유리의 두 동
    id: "b17",
    name: "학생회관",
    colors: { wall: "#a8513c", glass: "#6f8f9c", roof: "#e6e3dd", accent: "#d9d6cf" },
    parts: [bar(22, 20, 3.4, 10, 4), solid(22, 15.4, 3.6, 1, 4.6, { tone: "accent" }), bar(25.8, 22.5, 3.4, 5, 3)],
  },
  {
    // 18-1 제1기숙사: 고층 3개 동이 마당을 둘러싼다.
    id: "b18-1",
    name: "제1기숙사",
    colors: { wall: "#b4604a", glass: "#6b838f", roof: "#e6e3dd", accent: "#d6cdbd" },
    parts: [
      bar(8.4, 13.5, 3.8, 9.6, 13),
      bar(14.6, 11.7, 3.4, 7, 13),
      bar(12.1, 19, 8.2, 3.4, 13),
      solid(11.5, 15.8, 3, 3, 1.6, { tone: "accent" }),
    ],
  },
  {
    // 18-2 제2기숙사: 고층 2개 동과 낮은 유리 연결부, 벽돌 하부
    id: "b18-2",
    name: "제2기숙사",
    colors: { wall: "#c8895f", glass: "#658390", roof: "#e6e2da", accent: "#a8503a" },
    parts: [
      bar(13.4, -0.4, 5.6, 4.6, 11),
      solid(13.4, -0.4, 5.8, 4.8, 1.7, { tone: "accent" }),
      bar(6.3, 3.6, 5, 5, 11),
      solid(6.3, 3.6, 5.2, 5.2, 1.7, { tone: "accent" }),
      glass(9.9, 1.8, 3, 3, 2.2),
    ],
  },
  {
    // 18-3 제3기숙사: 고층 슬래브와 낮은 벽돌동
    id: "b18-3",
    name: "제3기숙사",
    colors: { wall: "#dad3c1", glass: "#748590", roof: "#e6e3dc", accent: "#a8503a" },
    parts: [bar(0.4, 14.5, 4.4, 10, 13), solid(0.4, 20.6, 4.4, 2.4, 2, { tone: "accent" })],
  },
  {
    // 19 융합자유전공대학: 낮은 회색 패널 건물
    id: "b19",
    name: "융합자유전공대학",
    colors: { wall: "#9ea4a7", glass: "#647680", roof: "#dfe1e1", accent: "#8b9195" },
    parts: [bar(24, 11.8, 9, 3, 2, { glazing: 0.5 }), solid(20.5, 11.8, 2.2, 3.4, 3, { tone: "accent" })],
  },
  {
    // 20 스포츠센터: 짙은 벽과 금속 경사 지붕. 뒤쪽은 그물을 친 골프연습장이다.
    id: "b20",
    name: "스포츠센터",
    colors: { wall: "#3f4144", glass: "#5f7078", roof: "#bcc0c3", accent: "#bcc0c3" },
    parts: [
      solid(23.6, 0, 8.5, 9.5, 2.6),
      solid(23.6, 0, 8.7, 9.7, 1.3, { y: 2.6, shape: "wedge", tone: "accent" }),
      solid(23.6, -10.7, 11, 10, 3.2, { tone: "net" }),
    ],
  },
  {
    // 21 체육관: 유리 하부와 금속 경사 지붕, 낮은 부속동
    id: "b21",
    name: "체육관",
    colors: { wall: "#a7aaa6", glass: "#73939f", roof: "#b0bcc5", accent: "#9eb0bd" },
    parts: [
      glass(36, 2, 9.6, 7, 2.6),
      solid(36, 2, 10, 7.4, 2.6, { y: 2.6, shape: "wedge", tone: "accent" }),
      bar(30.2, 2.4, 2, 6, 1, { h: 1.6 }),
    ],
  },
  {
    // 22 학군단: 2층과 붉은 경사 벽
    id: "b22",
    name: "학군단",
    colors: { wall: "#c3a98b", glass: "#558089", roof: "#e5e1d8", accent: "#8f3f2d" },
    parts: [bar(46, 3.2, 4, 3, 2), solid(43.5, 3.2, 1.2, 3.2, 2.8, { shape: "wedge", tone: "accent" })],
  },
  {
    // 23 강당·공연장: 흰 매스, 무대 탑, 원형 유리 로비
    id: "b23",
    name: "강당·공연장",
    colors: { wall: "#e3e3de", glass: "#74a9ae", roof: "#efefeb", accent: "#d0d0ca" },
    parts: [
      bar(83, 0.5, 10, 6.5, 2, { h: 3 }),
      solid(83, 0.5, 5, 3.5, 1.4, { y: 3 }),
      solid(83, 4.5, 10, 1.6, 0.24, { y: 2 }),
      glass(88.8, 0.5, 1.6, 2, 1.4),
      drum(93, 0.5, 7, 3.8),
      { x: 93, z: 0.5, w: 7.6, d: 7.6, h: 0.25, y: 3.8, shape: "round" },
    ],
  },
  {
    // 24 전망타워: 허리가 잘록한 짙은 유리탑
    id: "b24",
    name: "전망타워",
    colors: { wall: "#3e4a52", glass: "#3e4a52", roof: "#59646b", accent: "#59646b" },
    parts: [{ x: 86, z: 56.2, w: 5, d: 5, h: 15, shape: "hourglass", tone: "glass" }],
  },
  {
    // 25 해둥실어린이집: 벽돌 단층과 흰 처마
    id: "b25",
    name: "해둥실어린이집",
    colors: { wall: "#c4a382", glass: "#5f7f88", roof: "#dcd6c8", accent: "#eceae4" },
    parts: [bar(77.5, 65.3, 5, 4, 1, { h: 1.3, glazing: 0.5 }), solid(77.5, 67.4, 5, 0.3, 0.35, { y: 0.9, tone: "accent" })],
  },
  {
    id: "b26",
    name: "온실",
    colors: { wall: "#bdd2cf", glass: "#bdd2cf", roof: "#d3e1df", accent: "#bdd2cf" },
    parts: [glass(74.2, 61, 3.2, 2.6, 1.4)],
  },
  {
    id: "b-popup",
    name: "팝업스토어",
    colors: { wall: "#b79a3e", glass: "#2f3336", roof: "#c7ab4f", accent: "#2f3336" },
    parts: [solid(46.1, 62.6, 2, 1.2, 1)],
  },
  {
    // 27 제2공동실습관: 필로티로 띄운 긴 동과 북쪽 끝의 큰 프레임
    id: "b27",
    name: "제2공동실습관",
    colors: { wall: "#cdb99e", glass: "#638793", roof: "#e5e1d7", accent: "#bda88c" },
    parts: [
      bar(13.4, 65.3, 4.2, 10.7, 4, { y: 1, h: 4.2 }),
      solid(13.4, 66, 2.4, 6, 1, { tone: "accent" }),
      ...columnsAlongZ(11.6, 61, 70, 3, 1),
      ...columnsAlongZ(15.2, 61, 70, 3, 1),
      solid(11.5, 60.3, 0.5, 0.6, 6.2),
      solid(15.3, 60.3, 0.5, 0.6, 6.2),
      solid(13.4, 60.3, 4.3, 0.6, 0.5, { y: 5.7 }),
    ],
  },
  {
    // 28 도시과학대학: 6층 긴 동과 27번으로 가는 연결부
    id: "b28",
    name: "도시과학대학",
    colors: { wall: "#cfc3ae", glass: "#478791", roof: "#e6e2d8", accent: "#8f9498" },
    parts: [bar(5.7, 65.3, 3.8, 11, 6), solid(9.5, 68, 3.8, 1.2, 2, { tone: "accent" })],
  },
  {
    // 29 생명공학부: 흰 6층 동과 청록 유리 줄
    id: "b29",
    name: "생명공학부",
    colors: { wall: "#e4e4e0", glass: "#478a91", roof: "#eeeeea", accent: "#d0d0cb" },
    parts: [bar(1.2, 43.2, 6, 6, 6, { glazing: 0.4 }), glass(1.2, 46.3, 1.4, 0.3, 6.6)],
  },
];

/** 차도. 공식 지도를 보고 옮긴 근사 위치다. */
export const CAMPUS_ROADS: CampusRect[] = [
  { x: 17.3, z: 28, w: 2.2, d: 90 },
  { x: 58.7, z: 8.6, w: 82.8, d: 2.2 },
  { x: 50, z: 58.2, w: 65.4, d: 1.8 },
  { x: 83, z: 65.6, w: 1.8, d: 15 },
  { x: 95.8, z: 20.8, w: 1.6, d: 24.4 },
];

/** 건물 사이의 보행로 */
export const CAMPUS_PATHS: CampusRect[] = [
  { x: 52, z: 37, w: 62, d: 1.6 },
  { x: 42.3, z: 48.5, w: 1, d: 19 },
];

/** 흙 운동장 등 낮은 바닥 면 */
export const CAMPUS_COURTS: CampusRect[] = [{ x: 37.3, z: -9.7, w: 13, d: 13 }];

/** 용지천 회전교차로 */
export const CAMPUS_ROUNDABOUT = { x: 95.8, z: 36.5, outer: 7.4, inner: 3.8 };

/** 운동장: 타원 트랙과 안쪽 잔디 */
export const CAMPUS_FIELD: CampusRect = { x: 56, z: -3.5, w: 24, d: 14.5 };

/** 본관 앞 중앙정원의 낮은 생울타리 */
export const CAMPUS_HEDGES: CampusPart[] = [
  { x: 68.5, z: 33.4, w: 7, d: 1.4, h: 0.45 },
  { x: 77.5, z: 33.4, w: 7, d: 1.4, h: 0.45 },
  { x: 68.5, z: 40.2, w: 7, d: 1.4, h: 0.45 },
  { x: 77.5, z: 40.2, w: 7, d: 1.4, h: 0.45 },
];

const TREE_COUNT = 130;

function isBlocked(x: number, z: number, margin: number) {
  const overlaps = (rect: CampusRect, extra: number) =>
    Math.abs(x - rect.x) < rect.w / 2 + extra && Math.abs(z - rect.z) < rect.d / 2 + extra;
  const roundabout = Math.hypot(x - CAMPUS_ROUNDABOUT.x, z - CAMPUS_ROUNDABOUT.z);
  return (
    CAMPUS_BLOCKS.some((block) => block.parts.some((part) => overlaps(part, margin))) ||
    CAMPUS_ROADS.some((road) => overlaps(road, margin * 0.7)) ||
    CAMPUS_PATHS.some((path) => overlaps(path, margin * 0.5)) ||
    CAMPUS_COURTS.some((court) => overlaps(court, margin * 0.5)) ||
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
    const size = 0.6 + random() * 0.6;
    if (!isBlocked(x, z, size + 0.4)) trees.push({ x, z, size });
  }
  return trees;
}

export const CAMPUS_TREES = plantTrees();
