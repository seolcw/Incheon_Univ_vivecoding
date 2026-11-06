"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { RoomDots } from "@/components/room-dots";
import { launchStageFlight } from "@/lib/room-flight";
import { floorLabel } from "@/lib/room-status";
import type { BuildingSummary, RoomStatus } from "@/lib/types";

/** 건물을 세로로 자른 모양의 층 목록. 위층이 위에 온다. */
export function FloorStack({ building, rooms }: { building: BuildingSummary; rooms?: RoomStatus[] }) {
  const summaries = [...building.floorSummary].sort((a, b) => b.floor - a.floor);
  return (
    <nav aria-label={`${building.name} 층 바로 가기`}>
      <ul className="flex flex-col">
        {summaries.map((summary, index) => (
          <li key={summary.floor} className="rise border-t last:border-b" style={{ "--i": index + 2 } as React.CSSProperties}>
            <Link
              href={`/buildings/${encodeURIComponent(building.id)}?floor=${summary.floor}`}
              prefetch={false}
              onClick={(event) => launchStageFlight(event.currentTarget)}
              className="group flex min-h-12 items-center gap-3 rounded-sm py-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="w-10 shrink-0 font-bold tracking-[-0.02em] transition-transform duration-300 ease-settle group-hover:translate-x-1">
                {floorLabel(summary.floor)}
              </span>
              <RoomDots rooms={rooms?.filter((room) => room.floor === summary.floor)} total={summary.totalCount} />
              <span className="ml-auto flex items-center gap-1 text-[0.8125rem] text-muted-foreground tabular-nums">
                <span>
                  수업 없음 <strong className="font-semibold text-foreground">{summary.emptyCount}</strong>/{summary.totalCount}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 -translate-x-1 opacity-40 transition-[transform,opacity] duration-300 ease-settle group-hover:translate-x-0 group-hover:opacity-100"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
