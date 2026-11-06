"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { handleRoomLinkClick } from "@/lib/room-flight";
import { describeRoom, roomFacts, ROOM_STATUS_META } from "@/lib/room-status";
import type { RoomStatus } from "@/lib/types";

export function RoomCard({ room, index = 0 }: { room: RoomStatus; index?: number }) {
  const meta = ROOM_STATUS_META[room.status];
  return (
    <Link
      href={`/rooms/${encodeURIComponent(room.id)}`}
      prefetch={false}
      data-status={room.status}
      style={{ "--i": Math.min(index, 8) } as CSSProperties}
      onClick={(event) => handleRoomLinkClick(event, event.currentTarget, room)}
      className="room-card rise flex min-w-0 flex-col gap-3 rounded-[22px] bg-card p-4 ring-1 ring-border outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-[1.75rem] leading-none font-extrabold tracking-[-0.04em]">{room.name}</span>
        <span
          data-card-chip
          className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-semibold transition-colors duration-200"
        >
          <span data-card-dot aria-hidden="true" className={`size-1.5 rounded-full ${meta.dotClass}`} />
          {meta.label}
        </span>
      </span>
      <span data-card-muted className="text-sm text-muted-foreground transition-colors duration-200">
        {describeRoom(room)}
      </span>
      {roomFacts(room) && (
        <span data-card-muted className="text-[0.8125rem] text-muted-foreground transition-colors duration-200">
          {roomFacts(room)}
        </span>
      )}
    </Link>
  );
}
