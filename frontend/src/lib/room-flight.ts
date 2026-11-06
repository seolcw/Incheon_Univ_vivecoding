// 도면이나 카드에서 강의실을 누르면 그 칸의 색이 커져 강의실 화면의 색면이 된다.
// 도착 화면은 힌트로 호수와 상태를 먼저 그려서, 데이터를 기다리는 동안에도 끊기지 않는다.

import type { MouseEvent } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import type { RoomStatus, RoomStatusValue } from "@/lib/types";

export interface RoomHint {
  id: string;
  name: string;
  status: RoomStatusValue;
  floor: number;
  buildingId: string;
  buildingName: string;
}

export function toRoomHint(room: RoomStatus): RoomHint {
  return {
    id: room.id,
    name: room.name,
    status: room.status,
    floor: room.floor,
    buildingId: room.buildingId,
    buildingName: room.buildingName,
  };
}

const SAFETY_MS = 5000;

/** 새 탭으로 여는 클릭은 그대로 두고, 같은 탭 이동일 때만 비행을 시작한다. */
export function handleRoomLinkClick(event: MouseEvent, origin: HTMLElement, room: RoomStatus) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  launchRoomFlight(origin, room);
}

let hint: RoomHint | null = null;
let returningName: string | null = null;
let returnBox: Box | null = null;
let overlay: HTMLElement | null = null;
let flight: Animation | null = null;
let safety: ReturnType<typeof setTimeout> | undefined;

function clearOverlay() {
  clearTimeout(safety);
  overlay?.remove();
  overlay = null;
  flight = null;
}

export function peekRoomHint(roomId: string) {
  return hint?.id === roomId ? hint : null;
}

/** 강의실 화면에서 도면으로 돌아왔을 때 그 칸을 표시하려고 한 번만 읽는다. */
export function markRoomReturn(name: string, hero: Element | null) {
  returningName = name;
  returnBox = hero ? hero.getBoundingClientRect() : null;
}

export function takeRoomReturn(floorRooms: string[]) {
  if (!returningName || !floorRooms.includes(returningName)) return null;
  const name = returningName;
  returningName = null;
  return name;
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 본문 칸의 위치. 이동 뒤 스크롤은 맨 위이므로 머리글 높이부터 잰다. */
function mainBox() {
  const main = document.querySelector("main");
  if (!main) return null;
  const style = getComputedStyle(main);
  const rect = main.getBoundingClientRect();
  const left = rect.left + parseFloat(style.paddingLeft);
  const width = rect.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const top = (document.querySelector("header")?.getBoundingClientRect().height ?? 0) + parseFloat(style.paddingTop);
  return { left, top, width };
}

function flyPlate(from: Box, to: Box, background: string, radius: number) {
  const element = document.createElement("div");
  element.setAttribute("aria-hidden", "true");
  element.style.cssText = `position:fixed;left:0;top:0;width:${to.width}px;height:${to.height}px;background:${background};border-radius:${radius}px;transform-origin:0 0;z-index:30;pointer-events:none`;
  document.body.append(element);
  const animation = element.animate(
    [
      {
        transform: `translate(${from.left}px, ${from.top}px) scale(${from.width / to.width}, ${from.height / to.height})`,
      },
      { transform: `translate(${to.left}px, ${to.top}px) scale(1, 1)` },
    ],
    { duration: 440, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
  );
  return { element, animation };
}

export function launchRoomFlight(origin: HTMLElement, room: RoomStatus) {
  hint = toRoomHint(room);
  if (prefersReducedMotion()) return;
  clearOverlay();
  const box = mainBox();
  if (!box) return;
  const height = Math.min(window.innerHeight - box.top - 12, 620);
  const plate = flyPlate(origin.getBoundingClientRect(), { ...box, height }, `var(--status-${room.status})`, 32);
  overlay = plate.element;
  flight = plate.animation;
  safety = setTimeout(clearOverlay, SAFETY_MS);
}

const WIDE_LAYOUT_PX = 1280;
const SIDE_COLUMN_PX = 288 + 32;

/** 지도에서 층 화면으로: 누른 곳에서 어두운 도면 무대가 펼쳐진다. 무대가 옆 칸에 있는 넓은 화면에서만 쓴다. */
export function launchStageFlight(origin: HTMLElement) {
  if (prefersReducedMotion() || window.innerWidth < WIDE_LAYOUT_PX) return;
  clearOverlay();
  const box = mainBox();
  if (!box) return;
  const target = {
    left: box.left + SIDE_COLUMN_PX,
    top: box.top,
    width: box.width - SIDE_COLUMN_PX,
    height: window.innerHeight - box.top - 12,
  };
  const plate = flyPlate(origin.getBoundingClientRect(), target, "var(--stage)", 32);
  overlay = plate.element;
  flight = plate.animation;
  safety = setTimeout(clearOverlay, SAFETY_MS);
}

/** 강의실에서 도면으로 돌아오면 색면이 다시 그 칸으로 줄어든다. 칸이 화면 밖이면 생략한다. */
export function landOnCell(cell: HTMLElement, status: RoomStatusValue) {
  const from = returnBox;
  returnBox = null;
  if (!from || prefersReducedMotion()) return;
  const to = cell.getBoundingClientRect();
  if (to.bottom < 0 || to.top > window.innerHeight || to.right < 0 || to.left > window.innerWidth) return;
  const plate = flyPlate(from, to, `var(--status-${status})`, 10);
  void plate.animation.finished
    .catch(() => undefined)
    .then(() =>
      plate.element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: "ease-out", fill: "forwards" }).finished,
    )
    .finally(() => plate.element.remove());
}

/** 도착 화면이 그려진 뒤 호출한다. 비행이 끝나면 덮개를 걷는다. */
export function settleFlight() {
  const element = overlay;
  const running = flight;
  if (!element || !running) return;
  void running.finished
    .catch(() => undefined)
    .then(() => {
      if (overlay !== element) return;
      clearTimeout(safety);
      const fade = element.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 260,
        easing: "ease-out",
        fill: "forwards",
      });
      return fade.finished.finally(() => {
        if (overlay === element) clearOverlay();
      });
    });
}
