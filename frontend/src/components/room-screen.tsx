"use client";

import { useParams } from "next/navigation";
import type { CSSProperties } from "react";
import { MeetupCard } from "@/components/meetup-card";
import { MeetupFormDialog } from "@/components/meetup-form-dialog";
import { RoomHero } from "@/components/room-hero";
import { RoomTimeline } from "@/components/room-timeline";
import { SeatRow } from "@/components/seat-row";
import { ErrorState, LoadingState, NotFoundState, RefreshFailedNote } from "@/components/states";
import { useRoom } from "@/lib/api";
import { peekRoomHint, toRoomHint } from "@/lib/room-flight";

export function RoomScreen() {
  const { roomId } = useParams<{ roomId: string }>();
  const { data, error, mutate } = useRoom(roomId);

  if (!data && error?.status === 404) return <NotFoundState message="강의실을 찾을 수 없어요." />;
  if (!data && error) return <ErrorState message="강의실 정보를 불러오지 못했어요." onRetry={() => mutate()} />;
  if (!data) {
    const hint = peekRoomHint(roomId);
    if (hint) return <RoomHero head={hint} />;
    return <LoadingState message="강의실 정보를 불러오는 중이에요." skeletonClass="h-96" />;
  }

  const { room, at } = data;
  const freeUntil = room.status === "empty" ? room.freeUntil : null;

  return (
    <div className="flex flex-col gap-8">
      <RoomHero
        head={toRoomHint(room)}
        room={room}
        at={at}
        action={<MeetupFormDialog fixedRoom={room} at={at} tone="hero" />}
        note={error && <RefreshFailedNote />}
      />

      <div className="grid items-start gap-x-10 gap-y-8 lg:grid-cols-2">
        <section aria-label="이 강의실 모임" className="flex min-w-0 flex-col gap-3">
          <h2 className="text-lg font-bold">이 강의실 모임</h2>
          {room.meetups.length === 0 && (
            <div className="rise flex flex-col gap-3 rounded-[22px] bg-muted p-5" style={{ "--i": 3 } as CSSProperties}>
              <SeatRow members={[]} maxMembers={4} waiting={false} />
              <p className="text-sm text-muted-foreground">아직 모임이 없어요.</p>
            </div>
          )}
          {room.meetups.map((meetup, index) => (
            <MeetupCard key={meetup.id} meetup={meetup} at={at} showRoom={false} index={index + 3} />
          ))}
        </section>

        <section aria-label="오늘 시간표" className="flex min-w-0 flex-col gap-3">
          <h2 className="text-lg font-bold">오늘 시간표</h2>
          {room.todaySchedule.length === 0 && <p className="text-sm text-muted-foreground">오늘 수업이 없어요.</p>}
          <RoomTimeline schedule={room.todaySchedule} meetups={room.meetups} at={at} freeUntil={freeUntil} />
        </section>
      </div>
    </div>
  );
}
