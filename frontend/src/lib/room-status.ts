// 강의실 상태와 건물 빈 비율의 표시 규칙(SPEC v1 §1). 실제 색 값은 globals.css 토큰에 있다.

import { formatKstTime } from "@/lib/time";
import type { BuildingSummary, RoomStatus, RoomStatusValue } from "@/lib/types";

export const ROOM_STATUS_META: Record<RoomStatusValue, { label: string; badgeClass: string; fillClass: string }> = {
  empty: {
    label: "비어있음",
    badgeClass: "bg-status-empty text-status-foreground",
    fillClass: "fill-status-empty",
  },
  meetup: {
    label: "모임 중",
    badgeClass: "bg-status-meetup text-status-foreground",
    fillClass: "fill-status-meetup",
  },
  class: {
    label: "수업 중",
    badgeClass: "bg-status-class text-status-foreground",
    fillClass: "fill-status-class",
  },
  closed: {
    label: "운영 종료",
    badgeClass: "bg-status-closed text-status-foreground",
    fillClass: "fill-status-closed",
  },
};

const CLOSE_CLOCK = "22:00";
const GENERIC_CLASS_TITLE = "수업";

/** 카드와 상세에 쓰는 한 줄 설명 */
export function describeRoom(room: RoomStatus): string {
  switch (room.status) {
    case "class":
      // 상태는 배지가 보여 준다. 실제 시간표에는 과목명이 없어 제목이 "수업"으로 오면 종료 시각만 쓴다.
      return [
        room.currentTitle !== GENERIC_CLASS_TITLE && room.currentTitle,
        room.classEndsAt && `${formatKstTime(room.classEndsAt)} 종료`,
      ]
        .filter(Boolean)
        .join(", ");
    case "closed":
      return "운영 시간이 아니에요";
    case "meetup": {
      const title = room.currentTitle ?? "모임";
      if (!room.freeUntil || formatKstTime(room.freeUntil) === CLOSE_CLOCK) return `${title}, 남은 수업 없음`;
      return `${title}, ${formatKstTime(room.freeUntil)}부터 수업`;
    }
    case "empty":
      if (!room.freeUntil || formatKstTime(room.freeUntil) === CLOSE_CLOCK) return "남은 수업 없음";
      return `${room.freeMinutes}분 비어있음 (${formatKstTime(room.freeUntil)}까지)`;
  }
}

/** 정원과 태그. 시드에 값이 없으면(정원 0, 태그 없음) 빈 문자열이다. */
export function roomFacts(room: RoomStatus): string {
  return [room.capacity > 0 ? `${room.capacity}명` : null, ...room.tags].filter(Boolean).join(" · ");
}

/** 도면 칸의 둘째 줄: 좁은 칸에 들어가는 짧은 글자 */
export function planCaption(room: RoomStatus): string {
  switch (room.status) {
    case "class":
      return room.classEndsAt ? `~${formatKstTime(room.classEndsAt)}` : "수업";
    case "closed":
      return "종료";
    case "meetup":
      return "모임";
    case "empty":
      return `${room.freeMinutes}분`;
  }
}

export type BuildingLevel = "high" | "mid" | "low" | "closed";

export const BUILDING_LEVEL_META: Record<BuildingLevel, { label: string; fillClass: string; textClass: string }> = {
  high: { label: "빈 비율 2/3 이상", fillClass: "fill-building-high", textClass: "fill-building-foreground" },
  mid: { label: "1/3 이상", fillClass: "fill-building-mid", textClass: "fill-building-mid-foreground" },
  low: { label: "1/3 미만", fillClass: "fill-building-low", textClass: "fill-building-foreground" },
  closed: { label: "운영 종료", fillClass: "fill-building-closed", textClass: "fill-building-foreground" },
};

export function buildingLevel(building: BuildingSummary, at: string): BuildingLevel {
  const clock = formatKstTime(at);
  if (clock < "09:00" || clock >= CLOSE_CLOCK) return "closed";
  const { emptyCount, totalCount } = building;
  if (emptyCount * 3 >= totalCount * 2) return "high";
  if (emptyCount * 3 >= totalCount) return "mid";
  return "low";
}
