"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MeetupCard } from "@/components/meetup-card";
import { MeetupFormDialog } from "@/components/meetup-form-dialog";
import { RoomTimeline } from "@/components/room-timeline";
import { ErrorState, LoadingState, NotFoundState, RefreshFailedNote } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { useRoom } from "@/lib/api";
import { describeRoom, ROOM_STATUS_META } from "@/lib/room-status";

export function RoomScreen() {
  const { roomId } = useParams<{ roomId: string }>();
  const { data, error, mutate } = useRoom(roomId);

  if (!data && error?.status === 404) return <NotFoundState message="강의실을 찾을 수 없어요." />;
  if (!data && error) return <ErrorState message="강의실 정보를 불러오지 못했어요." onRetry={() => mutate()} />;
  if (!data) return <LoadingState message="강의실 정보를 불러오는 중이에요." skeletonClass="h-96 max-w-xl" />;

  const { room, at } = data;
  const meta = ROOM_STATUS_META[room.status];

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/buildings/${encodeURIComponent(room.buildingId)}?floor=${room.floor}`}
          prefetch={false}
          className="w-fit rounded-sm text-sm text-muted-foreground underline underline-offset-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {room.buildingName} {room.floor}층으로
        </Link>
        <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold">
          {room.buildingName} {room.name}
          <Badge className={meta.badgeClass}>{meta.label}</Badge>
        </h1>
        <p>{describeRoom(room)}</p>
        <p className="text-sm text-muted-foreground">
          {room.capacity}명{room.tags.length > 0 && ` · ${room.tags.join(" · ")}`}
        </p>
        {error && <RefreshFailedNote />}
      </div>

      <section aria-label="오늘 시간표" className="flex flex-col gap-3">
        <h2 className="font-bold">오늘 시간표</h2>
        {room.todaySchedule.length === 0 && <p className="text-sm text-muted-foreground">오늘 수업이 없어요.</p>}
        <RoomTimeline schedule={room.todaySchedule} meetups={room.meetups} at={at} />
      </section>

      <section aria-label="이 강의실 모임" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">이 강의실 모임</h2>
          <MeetupFormDialog fixedRoom={room} at={at} />
        </div>
        {room.meetups.length === 0 && <p className="text-sm text-muted-foreground">아직 모임이 없어요.</p>}
        {room.meetups.map((meetup) => (
          <MeetupCard key={meetup.id} meetup={meetup} at={at} showRoom={false} />
        ))}
      </section>
    </div>
  );
}
