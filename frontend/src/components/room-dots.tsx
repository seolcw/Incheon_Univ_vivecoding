import { ROOM_STATUS_META } from "@/lib/room-status";
import type { RoomStatus } from "@/lib/types";

const STATUS_ORDER = { empty: 0, meetup: 1, class: 2, closed: 3 };

/** 층의 방을 상태별 점으로 줄세운다. 데이터가 오기 전에는 칸 수만큼 빈 점을 둔다. */
export function RoomDots({ rooms, total, className }: { rooms?: RoomStatus[]; total: number; className?: string }) {
  const sorted = rooms && [...rooms].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  return (
    <span aria-hidden="true" className={`flex flex-wrap gap-[3px] ${className ?? ""}`}>
      {sorted
        ? sorted.map((room) => (
            <span
              key={room.id}
              className={`size-2 rounded-full transition-colors duration-500 ${ROOM_STATUS_META[room.status].dotClass}`}
            />
          ))
        : Array.from({ length: total }, (_, index) => (
            <span key={index} className="size-2 rounded-full bg-border" />
          ))}
    </span>
  );
}
