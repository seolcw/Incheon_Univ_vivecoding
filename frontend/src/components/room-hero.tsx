"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { RollingNumber } from "@/components/rolling-number";
import { SeatRow } from "@/components/seat-row";
import { TimeRibbon } from "@/components/time-ribbon";
import { markRoomReturn, settleFlight, type RoomHint } from "@/lib/room-flight";
import { describeRoom, floorLabel, roomFacts, ROOM_STATUS_META } from "@/lib/room-status";
import { formatKstTime } from "@/lib/time";
import type { RoomDetail } from "@/lib/types";

const CLOSE_CLOCK = "22:00";

/** 큰 숫자 옆에 쓰는 남은 시간과 짧은 설명 */
function heroClock(room: RoomDetail, at: string): { minutes: number | null; caption: string } {
  switch (room.status) {
    case "class": {
      if (!room.classEndsAt) return { minutes: null, caption: "수업 중이에요" };
      const minutes = Math.max(Math.floor((Date.parse(room.classEndsAt) - Date.parse(at)) / 60000), 0);
      return { minutes, caption: `${formatKstTime(room.classEndsAt)}에 수업이 끝나요` };
    }
    case "closed":
      return { minutes: null, caption: "운영 시간이 아니에요" };
    case "meetup":
    case "empty": {
      const next = room.freeUntil ? formatKstTime(room.freeUntil) : null;
      return {
        minutes: room.freeMinutes,
        caption: !next || next === CLOSE_CLOCK ? "오늘 남은 수업 없음" : `${next}에 수업 시작`,
      };
    }
  }
}

/**
 * 강의실 상태 색으로 채운 첫 화면. 도면에서 날아온 색면이 그대로 이 자리가 된다.
 * room이 아직 없으면 힌트의 호수와 상태만 먼저 보여 준다.
 */
export function RoomHero({
  head,
  room,
  at,
  action,
  note,
}: {
  head: RoomHint;
  room?: RoomDetail;
  at?: string;
  action?: ReactNode;
  note?: ReactNode;
}) {
  useEffect(() => {
    settleFlight();
  }, []);

  const meta = ROOM_STATUS_META[head.status];
  const number = head.name.replace(/호$/, "");
  const clock = room && at ? heroClock(room, at) : null;
  const activeMeetup = room?.meetups.find((meetup) => meetup.id === room.activeMeetupId);

  return (
    <section
      aria-label={`${head.buildingName} ${head.name} 현재 상태`}
      data-status={head.status}
      data-tone="hero"
      className="hero-surface relative isolate overflow-clip rounded-[28px] md:rounded-[36px]"
    >
      <span aria-hidden="true" className="hero-light" />
      <div className="flex flex-col gap-5 p-5 sm:gap-6 sm:p-8 lg:p-10">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/buildings/${encodeURIComponent(head.buildingId)}?floor=${head.floor}`}
            prefetch={false}
            onClick={(event) => markRoomReturn(head.name, event.currentTarget.closest("section"))}
            className="group flex min-h-8 items-center gap-1.5 rounded-sm text-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ArrowLeft
              aria-hidden="true"
              className="size-4 transition-transform duration-300 ease-settle group-hover:-translate-x-0.5"
            />
            {head.buildingName} {floorLabel(head.floor)}으로
          </Link>
          <span className="flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-[0.8125rem] font-bold text-foreground">
            <span aria-hidden="true" className={`size-2 rounded-full ${meta.dotClass}`} />
            {meta.label}
          </span>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <h1 className="rise font-extrabold">
            <span
              className={`block leading-[0.88] tracking-[-0.04em] ${
                number.length > 3 ? "text-[clamp(4.75rem,20vw,10rem)]" : "text-[clamp(6.5rem,28vw,13rem)]"
              }`}
            >
              {number}
              <span className="ml-1 text-[0.28em] font-bold tracking-[-0.02em]">호</span>
            </span>
            <span className="mt-3 block text-lg font-semibold tracking-[-0.02em]">
              {head.buildingName} {floorLabel(head.floor)}
            </span>
          </h1>
          {clock && room && (
            <div className="rise sm:text-right" style={{ "--i": 2 } as React.CSSProperties}>
              {clock.minutes !== null && (
                <p className="text-[clamp(3rem,9vw,5.5rem)] leading-none font-extrabold tracking-[-0.04em]">
                  <RollingNumber value={clock.minutes} />
                  <span className="ml-0.5 text-[0.42em] font-bold tracking-[-0.02em]">분</span>
                </p>
              )}
              <p className="mt-1.5 text-lg font-semibold tracking-[-0.02em]">{clock.caption}</p>
              <p className="sr-only">{describeRoom(room)}</p>
              {roomFacts(room) && <p className="mt-0.5 text-sm font-medium">{roomFacts(room)}</p>}
            </div>
          )}
        </div>

        {room && at ? (
          <div className="reveal">
            <TimeRibbon room={room} at={at} />
          </div>
        ) : (
          <div aria-hidden="true" className="mt-6 h-12 rounded-2xl bg-white/14 sm:h-14" />
        )}

        {(action || note || activeMeetup) && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
            {action}
            {activeMeetup && (
              <div className="flex min-w-0 items-center gap-3">
                <SeatRow
                  members={activeMeetup.members}
                  maxMembers={activeMeetup.maxMembers}
                  tone="hero"
                  size="sm"
                  waiting={!activeMeetup.isFull}
                />
                <p className="min-w-0 text-sm font-semibold">
                  {activeMeetup.title}
                  <span className="ml-1.5 tabular-nums">
                    {activeMeetup.memberCount}/{activeMeetup.maxMembers}명
                  </span>
                </p>
              </div>
            )}
            {note}
          </div>
        )}
      </div>
    </section>
  );
}
