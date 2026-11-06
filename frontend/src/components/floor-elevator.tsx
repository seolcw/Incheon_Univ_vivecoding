"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { RoomDots } from "@/components/room-dots";
import { floorLabel } from "@/lib/room-status";
import type { FloorSummary, RoomStatus } from "@/lib/types";

/**
 * 층 선택. 층 사이를 오가는 칸이 엘리베이터처럼 미끄러진다.
 * 폰에서는 가로, 넓은 화면에서는 위층이 위로 오는 세로 배치다.
 */
export function FloorElevator({
  floors,
  floor,
  summaries,
  rooms,
  onSelect,
}: {
  floors: number[];
  floor: number;
  summaries: FloorSummary[];
  rooms?: RoomStatus[];
  onSelect: (floor: number) => void;
}) {
  const index = floors.indexOf(floor);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const delta = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[event.key];
    if (!delta) return;
    event.preventDefault();
    const next = floors[index + delta];
    if (next === undefined) return;
    onSelect(next);
    event.currentTarget.querySelector<HTMLInputElement>(`input[value="${next}"]`)?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="층 선택"
      onKeyDown={handleKeyDown}
      className="relative flex rounded-[20px] bg-muted p-1 xl:flex-col-reverse"
      style={{ "--lift": index, "--floors": floors.length } as CSSProperties}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-1">
        <span className="lift-cab absolute top-0 left-0 h-full w-[calc(100%/var(--floors))] rounded-2xl bg-foreground shadow-[0_6px_14px_-6px_oklch(0.2_0.008_265/0.55)] xl:top-auto xl:bottom-0 xl:h-[calc(100%/var(--floors))] xl:w-full" />
      </span>
      {floors.map((item) => {
        const summary = summaries.find((entry) => entry.floor === item);
        const active = item === floor;
        return (
          <label
            key={item}
            className={`relative flex min-h-12 flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl px-1 py-1 transition-colors duration-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring xl:flex-row xl:justify-start xl:gap-3 xl:px-3.5 ${
              active ? "text-background" : "text-foreground hover:text-foreground/70"
            }`}
          >
            <input
              type="radio"
              name="floor"
              value={item}
              checked={active}
              tabIndex={active ? 0 : -1}
              aria-label={
                summary
                  ? `${floorLabel(item)}, 수업 없는 강의실 ${summary.emptyCount}/${summary.totalCount}개`
                  : floorLabel(item)
              }
              onChange={() => onSelect(item)}
              className="sr-only"
            />
            <span className="font-bold tracking-[-0.02em] whitespace-nowrap">{floorLabel(item)}</span>
            <RoomDots
              rooms={rooms?.filter((room) => room.floor === item)}
              total={summary?.totalCount ?? 0}
              className="hidden xl:flex"
            />
            {summary && (
              <span
                className={`text-xs tabular-nums transition-colors duration-300 xl:ml-auto ${
                  active ? "text-background/80" : "text-muted-foreground"
                }`}
              >
                {summary.emptyCount}/{summary.totalCount}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
