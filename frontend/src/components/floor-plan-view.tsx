"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PLAN_VIEWBOX, type FloorPlan, type PlanCell } from "@/lib/floor-plans";
import { prefersReducedMotion } from "@/lib/motion";
import { handleRoomLinkClick, landOnCell, takeRoomReturn } from "@/lib/room-flight";
import { describeRoom, freeFuel, planCaption, ROOM_STATUS_META } from "@/lib/room-status";
import type { RoomStatus } from "@/lib/types";

/** 호수와 둘째 줄을 함께 넣을 수 있는 최소 칸 높이 */
const TWO_LINE_MIN_HEIGHT = 58;
/** 불이 번지기 시작하는 곳: A동 엘리베이터 */
const LAMP_ORIGIN = { x: 117, y: 600 };
const LAMP_SPREAD_MS = 480;

const STRUCTURE_TEXT: Partial<Record<PlanCell["kind"], string>> = {
  stairs: "계단",
  toilet: "WC",
  elevator: "EV",
};

type Direction = "up" | "down";

function cellBox(cell: PlanCell): CSSProperties {
  return {
    left: `${(cell.x / PLAN_VIEWBOX.w) * 100}%`,
    top: `${(cell.y / PLAN_VIEWBOX.h) * 100}%`,
    width: `${(cell.w / PLAN_VIEWBOX.w) * 100}%`,
    height: `${(cell.h / PLAN_VIEWBOX.h) * 100}%`,
  };
}

function lampDelay(cell: PlanCell) {
  const distance = Math.hypot(cell.x + cell.w / 2 - LAMP_ORIGIN.x, cell.y + cell.h / 2 - LAMP_ORIGIN.y);
  return Math.round((distance / PLAN_VIEWBOX.w) * LAMP_SPREAD_MS);
}

function StructureCell({ cell }: { cell: PlanCell }) {
  const flush = cell.kind === "corridor";
  return (
    <div className="plan-cell" style={{ ...cellBox(cell), ...(flush ? { padding: 0 } : {}) }}>
      <div className="plan-plate" data-kind={cell.kind}>
        {cell.kind === "outline" ? cell.label : STRUCTURE_TEXT[cell.kind]}
      </div>
    </div>
  );
}

/** 호수는 있지만 API에 없는 방: 어둡게, 클릭 불가 */
function UnavailableRoomCell({ cell, loading }: { cell: PlanCell; loading: boolean }) {
  return (
    <div
      role="img"
      aria-label={loading ? `${cell.label}호` : `${cell.label}호, 강의실 정보 없음`}
      className="plan-cell"
      style={cellBox(cell)}
    >
      <div className="plan-plate" data-kind="unavailable">
        {cell.label}
      </div>
    </div>
  );
}

function RoomCell({
  cell,
  room,
  dimmed,
  returned,
  onInspect,
}: {
  cell: PlanCell;
  room: RoomStatus;
  dimmed: boolean;
  returned: boolean;
  onInspect: (room: RoomStatus | null) => void;
}) {
  const meta = ROOM_STATUS_META[room.status];
  const roomy = cell.h >= TWO_LINE_MIN_HEIGHT;
  const link = useRef<HTMLAnchorElement>(null);
  const roomStatus = room.status;
  useEffect(() => {
    if (returned && link.current) landOnCell(link.current, roomStatus);
  }, [returned, roomStatus]);
  return (
    <Link
      ref={link}
      href={`/rooms/${encodeURIComponent(room.id)}`}
      prefetch={false}
      aria-label={`${room.name}, ${room.status === "class" ? "" : `${meta.label}, `}${describeRoom(room)}`}
      data-status={room.status}
      data-dim={dimmed}
      className="plan-room"
      style={{ ...cellBox(cell), "--lamp": `${lampDelay(cell)}ms` } as CSSProperties}
      onClick={(event) => handleRoomLinkClick(event, event.currentTarget, room)}
      onPointerEnter={(event) => event.pointerType === "mouse" && onInspect(room)}
      onPointerLeave={() => onInspect(null)}
      onFocus={() => onInspect(room)}
      onBlur={() => onInspect(null)}
    >
      <span className="plan-face" data-occupied={room.status === "meetup" || undefined}>
        <span className="plan-number">{cell.label}</span>
        {roomy && <span className="plan-caption">{planCaption(room)}</span>}
        {roomy && room.freeMinutes > 0 && (
          <span aria-hidden="true" className="plan-fuel">
            <span style={{ "--fuel": freeFuel(room) } as CSSProperties} />
          </span>
        )}
      </span>
      {room.status === "meetup" && <span aria-hidden="true" className="plan-ping" />}
      {returned && <span aria-hidden="true" className="plan-return" />}
    </Link>
  );
}

function PlanLayer({
  plan,
  rooms,
  matchingRoomIds,
  phase,
  direction,
  returnedRoom,
  onInspect,
  onLeft,
}: {
  plan: FloorPlan;
  rooms?: RoomStatus[];
  matchingRoomIds?: Set<string>;
  phase: "still" | "arrive" | "leave";
  direction?: Direction;
  returnedRoom?: string | null;
  onInspect: (room: RoomStatus | null) => void;
  onLeft?: () => void;
}) {
  const roomsByName = new Map(rooms?.filter((room) => room.floor === plan.floor).map((room) => [room.name, room]));
  return (
    <div
      className="plan-layer"
      data-phase={phase}
      data-dir={direction}
      inert={phase === "leave"}
      onAnimationEnd={(event) => event.target === event.currentTarget && onLeft?.()}
    >
      <span aria-hidden="true" className="plan-ghost">
        {plan.floor}
      </span>
      {plan.cells.map((cell) => {
        const key = cell.roomName ?? `${cell.kind}-${cell.x}-${cell.y}`;
        if (cell.kind !== "room") return <StructureCell key={key} cell={cell} />;
        const room = cell.roomName ? roomsByName.get(cell.roomName) : undefined;
        if (!room) return <UnavailableRoomCell key={key} cell={cell} loading={!rooms} />;
        return (
          <RoomCell
            key={key}
            cell={cell}
            room={room}
            dimmed={matchingRoomIds ? !matchingRoomIds.has(room.id) : false}
            returned={returnedRoom === cell.roomName}
            onInspect={onInspect}
          />
        );
      })}
      {plan.labels.map((label) => (
        <span
          key={label.text}
          className="plan-label"
          style={{
            left: `${(label.x / PLAN_VIEWBOX.w) * 100}%`,
            top: `${(label.y / PLAN_VIEWBOX.h) * 100}%`,
          }}
        >
          {label.text}
        </span>
      ))}
    </div>
  );
}

/**
 * 도면형 층 화면. 층을 바꾸면 도면이 엘리베이터처럼 오르내리고, 방마다 차례로 불이 들어온다.
 * 폰에서는 칸이 눌릴 만큼 크게 유지하고 이 영역 안에서만 가로로 스크롤한다.
 * rooms가 아직 없으면 불 꺼진 도면을 먼저 보여 준다. matchingRoomIds가 있으면 맞지 않는 방을 어둡게 줄인다.
 */
export function FloorPlanView({
  plan,
  rooms,
  matchingRoomIds,
  onInspect,
}: {
  plan: FloorPlan;
  rooms?: RoomStatus[];
  matchingRoomIds?: Set<string>;
  onInspect: (room: RoomStatus | null) => void;
}) {
  const [shown, setShown] = useState(plan);
  const [leaving, setLeaving] = useState<{ plan: FloorPlan; direction: Direction } | null>(null);
  const [arrival, setArrival] = useState<Direction | null>(null);
  const [returnedRoom] = useState(() =>
    takeRoomReturn(plan.cells.flatMap((cell) => (cell.roomName ? [cell.roomName] : []))),
  );
  if (plan !== shown) {
    const direction: Direction = plan.floor > shown.floor ? "up" : "down";
    setLeaving({ plan: shown, direction });
    setArrival(direction);
    setShown(plan);
  }

  const scroller = useRef<HTMLDivElement>(null);
  const [wing, setWing] = useState(0);
  const wings = plan.labels.some((label) => label.text === "연결부") ? ["A동", "연결부", "B동"] : ["A동", "B동"];

  function jumpToWing(index: number) {
    const element = scroller.current;
    if (!element) return;
    const max = element.scrollWidth - element.clientWidth;
    element.scrollTo({
      left: (max * index) / (wings.length - 1),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  function handleScroll() {
    const element = scroller.current;
    if (!element) return;
    const max = element.scrollWidth - element.clientWidth;
    if (max > 0) setWing(Math.round((element.scrollLeft / max) * (wings.length - 1)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={scroller}
        tabIndex={0}
        role="region"
        aria-label={`${plan.floor}층 도면`}
        onScroll={handleScroll}
        className="overflow-x-auto overflow-y-hidden rounded-xl outline-none [scrollbar-color:var(--stage-line)_transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 md:overflow-x-visible"
      >
        <div
          role="group"
          aria-label={`${plan.floor}층 강의실 배치`}
          className="plan-canvas mx-auto w-full min-w-[760px] md:min-w-0 xl:max-w-[calc((100dvh-12rem)*1.1325)]"
        >
          {leaving && leaving.plan !== plan && (
            <PlanLayer
              key={`leaving-${leaving.plan.floor}`}
              plan={leaving.plan}
              rooms={rooms}
              phase="leave"
              direction={leaving.direction}
              onInspect={onInspect}
              onLeft={() => setLeaving(null)}
            />
          )}
          <PlanLayer
            key={plan.floor}
            plan={plan}
            rooms={rooms}
            matchingRoomIds={matchingRoomIds}
            phase={arrival ? "arrive" : "still"}
            direction={arrival ?? undefined}
            returnedRoom={returnedRoom}
            onInspect={onInspect}
          />
        </div>
      </div>
      <div
        role="group"
        aria-label="도면 위치로 이동"
        className="relative grid rounded-full bg-white/10 p-0.5 md:hidden"
        style={{ gridTemplateColumns: `repeat(${wings.length}, minmax(0, 1fr))` }}
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-0.5 grid" style={{ gridTemplateColumns: `repeat(${wings.length}, minmax(0, 1fr))` }}>
          <span
            className="slide-chip rounded-full bg-white/20"
            style={{ "--slot": Math.min(wing, wings.length - 1) } as CSSProperties}
          />
        </span>
        {wings.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => jumpToWing(index)}
            aria-pressed={wing === index}
            className="relative min-h-9 rounded-full text-[0.8125rem] font-semibold text-white outline-none focus-visible:outline-2 focus-visible:outline-white"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
