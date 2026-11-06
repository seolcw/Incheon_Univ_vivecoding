// 도면이나 카드에서 강의실을 누르면 그 칸의 색이 커져 강의실 화면의 색면이 된다.
// 도착 화면은 힌트로 호수와 상태를 먼저 그려서, 데이터를 기다리는 동안에도 끊기지 않는다.

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

let hint: RoomHint | null = null;
let returningName: string | null = null;
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
export function markRoomReturn(name: string) {
  returningName = name;
}

export function takeRoomReturn(floorRooms: string[]) {
  if (!returningName || !floorRooms.includes(returningName)) return null;
  const name = returningName;
  returningName = null;
  return name;
}

export function launchRoomFlight(origin: HTMLElement, room: RoomStatus) {
  hint = toRoomHint(room);
  if (prefersReducedMotion()) return;
  clearOverlay();

  const main = document.querySelector("main");
  const header = document.querySelector("header");
  if (!main) return;
  const mainStyle = getComputedStyle(main);
  const mainRect = main.getBoundingClientRect();
  const left = mainRect.left + parseFloat(mainStyle.paddingLeft);
  const width = mainRect.width - parseFloat(mainStyle.paddingLeft) - parseFloat(mainStyle.paddingRight);
  const top = (header?.getBoundingClientRect().height ?? 0) + parseFloat(mainStyle.paddingTop);
  const height = Math.min(window.innerHeight - top - 12, 620);
  const from = origin.getBoundingClientRect();

  const element = document.createElement("div");
  element.setAttribute("aria-hidden", "true");
  element.style.cssText = `position:fixed;left:0;top:0;width:${width}px;height:${height}px;background:var(--status-${room.status});border-radius:32px;transform-origin:0 0;z-index:30;pointer-events:none`;
  document.body.append(element);
  overlay = element;
  flight = element.animate(
    [
      {
        transform: `translate(${from.left}px, ${from.top}px) scale(${from.width / width}, ${from.height / height})`,
      },
      { transform: `translate(${left}px, ${top}px) scale(1, 1)` },
    ],
    { duration: 440, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
  );
  safety = setTimeout(clearOverlay, SAFETY_MS);
}

/** 도착 화면이 그려진 뒤 호출한다. 비행이 끝나면 덮개를 걷는다. */
export function settleRoomFlight() {
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
