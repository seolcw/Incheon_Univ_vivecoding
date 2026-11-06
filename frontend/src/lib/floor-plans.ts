// 정보대 층별 도면 데이터. docs/reference/floor-plans/floor-{1..5}.jpg를 보고 옮긴 단순 도형이다.
// 좌표는 프론트 전용이고 API에 없다(docs/scope-change.md). 사진의 원근을 펴고 세로를 줄였으며, 축척은 정확하지 않다.
//
// 공통 열(x): A동 왼쪽 10–140 / A동 복도 140–180 / A동 오른쪽 180–305 / 중정 / B동 왼쪽 635–760 / B동 복도 760–800 / B동 오른쪽 800–930
// 연결부 강의실: 180–760

export type PlanCellKind =
  | "room" // 호수가 있는 방
  | "unnumbered" // 호수가 없는 방: 회색, 클릭 불가
  | "corridor"
  | "stairs"
  | "toilet"
  | "elevator"
  | "outline"; // 강의실이 아닌 영역의 윤곽선

export interface PlanCell {
  kind: PlanCellKind;
  /** room일 때 강의실 id와 표시 호수 */
  roomId?: string;
  label?: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlanLabel {
  text: string;
  x: number;
  y: number;
}

export interface FloorPlan {
  floor: number;
  cells: PlanCell[];
  labels: PlanLabel[];
}

export const PLAN_VIEWBOX = { w: 940, h: 830 };

const room = (number: string, x: number, y: number, w: number, h: number): PlanCell => ({
  kind: "room",
  roomId: `eng-${number}`,
  label: number,
  x,
  y,
  w,
  h,
});
const unnumbered = (x: number, y: number, w: number, h: number): PlanCell => ({ kind: "unnumbered", x, y, w, h });
const corridor = (x: number, y: number, w: number, h: number): PlanCell => ({ kind: "corridor", x, y, w, h });
const stairs = (x: number, y: number, w: number, h: number): PlanCell => ({ kind: "stairs", x, y, w, h });
const toilet = (x: number, y: number, w: number, h: number): PlanCell => ({ kind: "toilet", x, y, w, h });
const elevator = (x: number, y: number, w: number, h: number): PlanCell => ({ kind: "elevator", x, y, w, h });
const outline = (x: number, y: number, w: number, h: number, label?: string): PlanCell => ({
  kind: "outline",
  label,
  x,
  y,
  w,
  h,
});

const WING_LABELS: PlanLabel[] = [
  { text: "A동", x: 157, y: 815 },
  { text: "B동", x: 782, y: 815 },
];

const FLOOR_1: FloorPlan = {
  floor: 1,
  labels: WING_LABELS,
  cells: [
    // A동 왼쪽
    stairs(10, 0, 130, 75),
    room("103", 10, 75, 130, 76),
    room("102", 10, 151, 130, 206),
    room("101", 10, 357, 130, 208),
    toilet(10, 565, 45, 132),
    unnumbered(55, 565, 25, 132),
    corridor(80, 565, 60, 66),
    corridor(80, 631, 15, 66),
    elevator(95, 631, 45, 66),
    // A동 복도와 로비
    corridor(140, 0, 165, 146),
    corridor(140, 146, 40, 532),
    corridor(140, 678, 165, 112),
    corridor(80, 697, 60, 93),
    // A동 오른쪽
    room("104", 180, 146, 125, 214),
    room("105", 180, 360, 125, 200),
    stairs(180, 560, 125, 60),
    unnumbered(180, 620, 42, 58),
    unnumbered(222, 620, 42, 58),
    unnumbered(264, 620, 41, 58),
    // 1층은 연결부에 강의실이 없다
    outline(305, 678, 330, 112, "연결부 강의실 없음"),
    // B동 왼쪽
    corridor(635, 0, 165, 146),
    room("108", 635, 146, 125, 74),
    room("107", 635, 220, 125, 206),
    room("106", 635, 426, 125, 134),
    stairs(635, 560, 125, 60),
    unnumbered(635, 620, 42, 58),
    unnumbered(677, 620, 42, 58),
    unnumbered(719, 620, 41, 58),
    // B동 복도와 로비
    corridor(760, 146, 40, 532),
    corridor(635, 678, 165, 112),
    corridor(800, 700, 80, 90),
    // B동 오른쪽
    stairs(800, 0, 130, 76),
    room("109", 800, 76, 65, 76),
    room("110", 865, 76, 65, 76),
    room("111", 800, 152, 130, 276),
    room("112", 800, 428, 130, 68),
    unnumbered(800, 496, 65, 72),
    unnumbered(865, 496, 65, 72),
    corridor(800, 568, 60, 66),
    corridor(845, 634, 15, 66),
    elevator(800, 634, 45, 66),
    unnumbered(860, 568, 25, 132),
    toilet(885, 568, 45, 132),
  ],
};

const FLOOR_2: FloorPlan = {
  floor: 2,
  labels: [...WING_LABELS, { text: "연결부", x: 470, y: 705 }],
  cells: [
    // A동 왼쪽
    stairs(10, 0, 130, 62),
    room("204", 10, 62, 130, 65),
    room("203", 10, 127, 130, 115),
    room("202", 10, 242, 130, 113),
    room("201", 10, 355, 130, 112),
    toilet(10, 467, 45, 103),
    unnumbered(55, 467, 25, 103),
    corridor(80, 467, 60, 52),
    corridor(80, 519, 15, 51),
    elevator(95, 519, 45, 51),
    room("229", 10, 570, 130, 97),
    room("228", 10, 667, 130, 101),
    // A동 복도
    corridor(140, 0, 40, 768),
    // A동 오른쪽
    unnumbered(180, 0, 125, 121),
    room("205", 180, 121, 125, 235),
    room("206", 180, 356, 125, 108),
    stairs(180, 464, 125, 46),
    unnumbered(180, 510, 42, 52),
    unnumbered(222, 510, 42, 52),
    unnumbered(264, 510, 41, 52),
    // 연결부
    corridor(180, 562, 580, 28),
    room("227", 180, 590, 58, 89),
    room("226", 238, 590, 58, 89),
    room("225", 296, 590, 58, 89),
    room("224", 354, 590, 58, 89),
    room("223", 412, 590, 58, 89),
    room("222", 470, 590, 58, 89),
    room("221", 528, 590, 58, 89),
    room("220", 586, 590, 58, 89),
    room("219", 644, 590, 58, 89),
    room("218", 702, 590, 58, 89),
    // B동 왼쪽
    unnumbered(635, 0, 125, 124),
    room("211", 635, 124, 125, 153),
    room("210", 635, 277, 125, 83),
    room("209", 635, 360, 125, 108),
    stairs(635, 468, 125, 48),
    unnumbered(635, 516, 42, 46),
    unnumbered(677, 516, 42, 46),
    unnumbered(719, 516, 41, 46),
    // B동 복도
    corridor(760, 0, 40, 782),
    // B동 오른쪽
    stairs(800, 0, 130, 63),
    room("212", 800, 63, 130, 67),
    room("213", 800, 130, 130, 118),
    room("214", 800, 248, 130, 115),
    room("215", 800, 363, 130, 112),
    corridor(800, 475, 60, 53),
    corridor(845, 528, 15, 53),
    elevator(800, 528, 45, 53),
    unnumbered(860, 475, 25, 106),
    toilet(885, 475, 45, 106),
    room("216", 800, 581, 130, 99),
    room("217", 800, 680, 130, 102),
  ],
};

const FLOOR_3: FloorPlan = {
  floor: 3,
  labels: [...WING_LABELS, { text: "연결부", x: 470, y: 740 }],
  cells: [
    // A동 위쪽
    room("304", 10, 0, 295, 105),
    unnumbered(10, 105, 55, 88),
    corridor(65, 105, 130, 88),
    corridor(195, 145, 20, 48),
    unnumbered(195, 105, 110, 40),
    unnumbered(215, 145, 70, 48),
    // A동 왼쪽
    stairs(10, 193, 130, 45),
    room("303", 10, 238, 130, 48),
    room("302", 10, 286, 130, 172),
    room("301", 10, 458, 130, 86),
    toilet(10, 544, 45, 81),
    unnumbered(55, 544, 25, 81),
    corridor(80, 544, 60, 41),
    corridor(80, 585, 15, 40),
    elevator(95, 585, 45, 40),
    room("330", 10, 625, 130, 78),
    room("329", 10, 703, 130, 80),
    // A동 복도
    corridor(140, 193, 40, 590),
    // A동 오른쪽
    room("305", 180, 193, 125, 180),
    room("306", 180, 373, 125, 170),
    stairs(180, 543, 125, 37),
    unnumbered(180, 580, 42, 41),
    unnumbered(222, 580, 42, 41),
    unnumbered(264, 580, 41, 41),
    // 연결부
    corridor(180, 621, 580, 24),
    room("328", 180, 645, 58, 69),
    room("327", 238, 645, 57, 69),
    room("326", 295, 645, 58, 69),
    room("325", 353, 645, 58, 69),
    room("324", 411, 645, 59, 69),
    room("323", 470, 645, 58, 69),
    room("322", 528, 645, 116, 69),
    room("321", 644, 645, 58, 69),
    room("320", 702, 645, 58, 69),
    // B동 위쪽
    room("313", 635, 0, 125, 146),
    unnumbered(650, 146, 65, 47),
    corridor(715, 146, 45, 47),
    room("314", 800, 0, 130, 105),
    room("315", 800, 105, 60, 88),
    unnumbered(860, 105, 45, 88),
    // B동 왼쪽
    room("312", 635, 193, 125, 90),
    room("311", 635, 283, 125, 114),
    room("310", 635, 397, 125, 62),
    room("309", 635, 459, 125, 83),
    stairs(635, 542, 125, 38),
    unnumbered(635, 580, 42, 41),
    unnumbered(677, 580, 42, 41),
    unnumbered(719, 580, 41, 41),
    // B동 복도
    corridor(760, 0, 40, 785),
    // B동 오른쪽
    stairs(800, 193, 130, 46),
    room("316", 800, 239, 130, 136),
    room("317", 800, 375, 130, 170),
    corridor(800, 545, 60, 41),
    corridor(845, 586, 15, 40),
    elevator(800, 586, 45, 40),
    unnumbered(860, 545, 25, 81),
    toilet(885, 545, 45, 81),
    room("318", 800, 626, 130, 78),
    room("319", 800, 704, 130, 81),
  ],
};

const FLOOR_4: FloorPlan = {
  floor: 4,
  labels: [...WING_LABELS, { text: "연결부", x: 470, y: 745 }],
  cells: [
    // A동 위쪽
    room("406", 10, 0, 130, 112),
    unnumbered(20, 112, 55, 89),
    room("405", 75, 112, 65, 89),
    room("407", 180, 0, 125, 155),
    corridor(180, 155, 35, 46),
    unnumbered(215, 155, 70, 46),
    // A동 왼쪽
    stairs(10, 201, 130, 48),
    room("404", 10, 249, 130, 48),
    room("403", 10, 297, 130, 89),
    room("402", 10, 386, 130, 85),
    room("401", 10, 471, 130, 86),
    toilet(10, 557, 45, 79),
    unnumbered(55, 557, 25, 79),
    corridor(80, 557, 60, 40),
    corridor(80, 597, 15, 39),
    elevator(95, 597, 45, 39),
    room("436", 10, 636, 130, 75),
    room("435", 10, 711, 130, 76),
    // A동 복도
    corridor(140, 0, 40, 787),
    // A동 오른쪽
    room("408", 180, 201, 125, 184),
    room("409", 180, 385, 125, 85),
    room("410", 180, 470, 125, 83),
    stairs(180, 553, 125, 36),
    unnumbered(180, 589, 42, 39),
    unnumbered(222, 589, 42, 39),
    unnumbered(264, 589, 41, 39),
    // 연결부
    corridor(180, 628, 580, 22),
    room("434", 180, 650, 58, 69),
    room("433", 238, 650, 58, 69),
    room("432", 296, 650, 58, 69),
    room("431", 354, 650, 58, 69),
    room("430", 412, 650, 58, 69),
    room("429", 470, 650, 58, 69),
    room("428", 528, 650, 58, 69),
    room("427", 586, 650, 58, 69),
    room("426", 644, 650, 58, 69),
    room("425", 702, 650, 58, 69),
    // B동 위쪽
    room("416", 635, 0, 125, 155),
    unnumbered(650, 155, 65, 46),
    corridor(715, 155, 45, 46),
    room("417", 800, 0, 130, 112),
    room("418", 800, 112, 60, 89),
    unnumbered(860, 112, 55, 89),
    // B동 왼쪽
    room("415", 635, 201, 125, 185),
    room("414", 635, 386, 125, 86),
    room("413", 635, 472, 125, 81),
    stairs(635, 553, 125, 37),
    unnumbered(635, 590, 42, 38),
    unnumbered(677, 590, 42, 38),
    unnumbered(719, 590, 41, 38),
    // B동 복도
    corridor(760, 0, 40, 787),
    // B동 오른쪽
    stairs(800, 201, 130, 48),
    room("419", 800, 249, 130, 49),
    room("420", 800, 298, 130, 88),
    room("421", 800, 386, 130, 86),
    room("422", 800, 472, 130, 85),
    corridor(800, 557, 60, 40),
    corridor(845, 597, 15, 39),
    elevator(800, 597, 45, 39),
    unnumbered(860, 557, 25, 79),
    toilet(885, 557, 45, 79),
    room("423", 800, 636, 130, 75),
    room("424", 800, 711, 130, 76),
  ],
};

const FLOOR_5: FloorPlan = {
  floor: 5,
  labels: [...WING_LABELS, { text: "연결부", x: 470, y: 737 }],
  cells: [
    // A동 위쪽
    room("503", 10, 0, 170, 108),
    unnumbered(180, 0, 125, 196),
    unnumbered(25, 108, 70, 88),
    corridor(95, 108, 85, 88),
    // A동 왼쪽
    stairs(10, 196, 130, 46),
    room("502", 10, 242, 130, 154),
    room("501", 10, 396, 130, 149),
    toilet(10, 545, 45, 77),
    unnumbered(55, 545, 25, 77),
    corridor(80, 545, 60, 38),
    corridor(80, 583, 15, 39),
    elevator(95, 583, 45, 39),
    room("528", 10, 622, 130, 78),
    unnumbered(10, 700, 170, 71),
    // A동 복도
    corridor(140, 196, 40, 504),
    // A동 오른쪽
    room("504", 180, 196, 125, 153),
    room("505", 180, 349, 125, 114),
    room("506", 180, 463, 125, 36),
    room("506-1", 180, 499, 125, 46),
    stairs(180, 545, 125, 36),
    unnumbered(180, 581, 42, 38),
    unnumbered(222, 581, 42, 38),
    unnumbered(264, 581, 41, 38),
    // 연결부
    corridor(180, 619, 580, 24),
    room("527", 180, 643, 58, 68),
    room("526", 238, 643, 58, 68),
    room("525", 296, 643, 58, 68),
    room("524", 354, 643, 58, 68),
    room("523", 412, 643, 58, 68),
    room("522", 470, 643, 58, 68),
    room("521", 528, 643, 58, 68),
    room("520", 586, 643, 58, 68),
    room("519", 644, 643, 58, 68),
    room("518", 702, 643, 58, 68),
    // B동 위쪽
    unnumbered(635, 0, 140, 196),
    room("512", 775, 0, 155, 108),
    corridor(775, 108, 75, 88),
    unnumbered(850, 108, 65, 88),
    // B동 왼쪽
    room("511", 635, 196, 125, 189),
    room("510-1", 635, 385, 125, 48),
    room("510", 635, 433, 125, 36),
    room("509-1", 635, 469, 125, 46),
    room("509", 635, 515, 125, 37),
    stairs(635, 552, 125, 36),
    unnumbered(635, 588, 42, 31),
    unnumbered(677, 588, 42, 31),
    unnumbered(719, 588, 41, 31),
    // B동 복도
    corridor(760, 196, 40, 520),
    // B동 오른쪽
    stairs(800, 196, 130, 48),
    room("513", 800, 244, 130, 50),
    room("514", 800, 294, 130, 90),
    room("515", 800, 384, 130, 38),
    room("515-1", 800, 422, 130, 48),
    room("516", 800, 470, 130, 40),
    room("516-1", 800, 510, 130, 46),
    corridor(800, 556, 60, 40),
    corridor(845, 596, 15, 40),
    elevator(800, 596, 45, 40),
    unnumbered(860, 556, 25, 80),
    toilet(885, 556, 45, 80),
    room("517-1", 800, 636, 130, 44),
    room("517", 800, 680, 130, 36),
    unnumbered(760, 716, 170, 72),
  ],
};

const FLOOR_PLANS: Record<string, FloorPlan[]> = {
  eng: [FLOOR_1, FLOOR_2, FLOOR_3, FLOOR_4, FLOOR_5],
};

export function getFloorPlan(buildingId: string, floor: number): FloorPlan | undefined {
  return FLOOR_PLANS[buildingId]?.find((plan) => plan.floor === floor);
}
