"use client";

import type { CSSProperties } from "react";
import { MeetupCard } from "@/components/meetup-card";
import { MeetupFormDialog } from "@/components/meetup-form-dialog";
import { MockWriteNotice } from "@/components/mock-write-notice";
import { RollingNumber } from "@/components/rolling-number";
import { seatColor, seatInitial, SeatRow } from "@/components/seat-row";
import { ErrorState, LoadingState, RefreshFailedNote } from "@/components/states";
import { currentAtIso, useDemoAt, useMeetups } from "@/lib/api";
import type { Meetup } from "@/lib/types";

const FACE_LIMIT = 10;

function isLive(meetup: Meetup, at: string) {
  const now = Date.parse(at);
  return now >= Date.parse(meetup.startAt) && now < Date.parse(meetup.endAt);
}

export default function MeetupsPage() {
  const { data, error, mutate } = useMeetups();
  const demoAt = useDemoAt();

  if (!data && error) return <ErrorState message="모임을 불러오지 못했어요." onRetry={() => mutate()} />;
  if (!data) return <LoadingState message="모임을 불러오는 중이에요." skeletonClass="h-64" />;

  // 데이터가 있을 때만 계산한다. 프리렌더 중에 현재 시각을 읽지 않기 위해서다.
  const at = currentAtIso(demoAt);
  const meetups = data.meetups;
  const present = meetups.filter((meetup) => isLive(meetup, at)).flatMap((meetup) => meetup.members);

  return (
    <div className="flex flex-col gap-6">
      <section
        data-status="meetup"
        data-tone="hero"
        className="hero-surface relative isolate flex flex-col gap-6 overflow-hidden rounded-[28px] p-5 sm:p-8 md:rounded-[36px] lg:p-10"
      >
        <span aria-hidden="true" className="hero-light" />
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div className="min-w-0">
            <h1 className="flex items-baseline gap-3 text-[clamp(4rem,14vw,7.5rem)] leading-none font-extrabold tracking-[-0.04em]">
              모임
              <RollingNumber value={meetups.length} />
            </h1>
            <p className="mt-3 text-lg font-semibold tracking-[-0.02em]">
              {meetups.length === 0
                ? "빈 강의실에 첫 모임을 열어 보세요."
                : present.length > 0
                  ? `지금 ${present.length}명이 강의실에 모여 있어요.`
                  : "시작을 기다리는 모임이 있어요."}
            </p>
          </div>
          <MeetupFormDialog at={at} tone="hero" />
        </div>
        {present.length > 0 && (
          <ul aria-hidden="true" className="flex items-center pl-2">
            {present.slice(0, FACE_LIMIT).map((member, index) => (
              <li
                key={`${member.userId}-${index}`}
                className="seat rise -ml-2 ring-2 ring-status-meetup"
                style={
                  {
                    width: 44,
                    height: 44,
                    fontSize: 18,
                    "--i": index + 2,
                    backgroundColor: seatColor(member.userId),
                    color: "var(--seat-foreground)",
                  } as CSSProperties
                }
              >
                {seatInitial(member.nickname)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <MockWriteNotice />
      {error && <RefreshFailedNote />}

      {meetups.length === 0 && (
        <div className="rise flex flex-col items-start gap-4 rounded-[24px] bg-muted p-6 sm:p-8" style={{ "--i": 2 } as CSSProperties}>
          <SeatRow members={[]} maxMembers={4} size="lg" waiting={false} />
          <p className="text-lg font-semibold tracking-[-0.02em]">아직 모임이 없어요. 모임을 만들어 보세요.</p>
        </div>
      )}

      {meetups.length > 0 && (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {meetups.map((meetup, index) => (
            <MeetupCard key={meetup.id} meetup={meetup} at={at} index={index + 2} />
          ))}
        </div>
      )}
    </div>
  );
}
