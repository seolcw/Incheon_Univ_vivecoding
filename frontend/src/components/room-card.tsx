import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { describeRoom, roomFacts, ROOM_STATUS_META } from "@/lib/room-status";
import type { RoomStatus } from "@/lib/types";

export function RoomCard({ room }: { room: RoomStatus }) {
  const meta = ROOM_STATUS_META[room.status];
  return (
    <Link
      href={`/rooms/${encodeURIComponent(room.id)}`}
      prefetch={false}
      className="flex flex-col gap-1.5 rounded-xl border bg-card p-3 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-bold">{room.name}</span>
        <Badge className={meta.badgeClass}>{meta.label}</Badge>
      </span>
      <span className="text-sm">{describeRoom(room)}</span>
      {roomFacts(room) && <span className="text-sm text-muted-foreground">{roomFacts(room)}</span>}
    </Link>
  );
}
