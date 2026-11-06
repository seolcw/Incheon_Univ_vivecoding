"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { AvatarFace } from "@/components/avatar-face";
import { seatColor, seatInitial, SeatRow, type SeatMember } from "@/components/seat-row";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cancelMeetup, joinMeetup, leaveMeetup, USE_MOCK } from "@/lib/api";
import { decodeAvatar } from "@/lib/avatar";
import { categoryLabel, meetupPhase, meetupTimeRange } from "@/lib/meetup";
import { flyToSeat } from "@/lib/motion";
import { floorLabel } from "@/lib/room-status";
import type { Meetup } from "@/lib/types";
import { useWriteAction } from "@/lib/use-write-action";
import { getUser, useAvatar, useUserId } from "@/lib/user";

const NEED_NICKNAME_MESSAGE = "닉네임을 먼저 정해 주세요.";

function PhaseChip({ phase }: { phase: string }) {
  if (phase === "진행 중") {
    return (
      <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-status-meetup px-2.5 text-xs font-semibold text-status-foreground">
        <span aria-hidden="true" className="live-dot" />
        {phase}
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ring-1 ring-border">{phase}</span>
  );
}

export function MeetupCard({
  meetup,
  at,
  showRoom = true,
  index = 0,
}: {
  meetup: Meetup;
  at: string;
  showRoom?: boolean;
  index?: number;
}) {
  const userId = useUserId();
  const { pending, run } = useWriteAction();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const seats = useRef<HTMLDivElement>(null);
  const joinButton = useRef<HTMLButtonElement>(null);
  const flyingFace = useRef<HTMLSpanElement>(null);
  const myFace = decodeAvatar(useAvatar());

  const isHost = userId === meetup.hostId;
  const isMember = meetup.members.some((member) => member.userId === userId);
  const isOpen = meetup.status === "open";
  const disabled = pending || USE_MOCK;
  const phase = meetupPhase(meetup, at);
  const elapsed = Math.min(
    Math.max((Date.parse(at) - Date.parse(meetup.startAt)) / (Date.parse(meetup.endAt) - Date.parse(meetup.startAt)), 0),
    1,
  );

  // 다른 사람이 들어오고 나가는 순간을 조회 결과에서 잡아 알린다.
  const handlePresence = useCallback(
    (joined: SeatMember[], left: SeatMember[]) => {
      joined
        .filter((member) => member.userId !== userId)
        .forEach((member) => toast(`${member.nickname}님이 ${meetup.title}에 들어왔어요`));
      left
        .filter((member) => member.userId !== userId)
        .forEach((member) => toast(`${member.nickname}님이 ${meetup.title}에서 나갔어요`));
    },
    [meetup.title, userId],
  );

  async function handleJoin() {
    const user = getUser();
    if (!user) return toast.error(NEED_NICKNAME_MESSAGE);
    const land = flyToSeat(
      joinButton.current,
      seats.current?.querySelector('[data-open="true"]') ?? null,
      flyingFace.current?.firstElementChild ?? seatInitial(user.nickname),
      seatColor(user.userId),
    );
    const result = await run(() => joinMeetup(meetup.id, user), "모임에 참여했어요.");
    land();
    if (!result.ok) toast.error(result.message);
  }

  async function handleLeave() {
    const user = getUser();
    if (!user) return toast.error(NEED_NICKNAME_MESSAGE);
    const result = await run(() => leaveMeetup(meetup.id, { userId: user.userId }), "모임에서 나왔어요.");
    if (!result.ok) toast.error(result.message);
  }

  async function handleCancel() {
    const user = getUser();
    if (!user) return toast.error(NEED_NICKNAME_MESSAGE);
    const result = await run(() => cancelMeetup(meetup.id, { userId: user.userId }), "모임을 취소했어요.");
    setConfirmingCancel(false);
    if (!result.ok) toast.error(result.message);
  }

  return (
    <article
      className="rise flex min-w-0 flex-col gap-4 rounded-[24px] bg-card p-5 ring-1 ring-border"
      style={{ "--i": Math.min(index, 8) } as CSSProperties}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <PhaseChip phase={phase} />
          <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-xs font-semibold">
            {categoryLabel(meetup.category)}
          </span>
        </div>
        <h3 className="text-xl leading-snug font-bold tracking-[-0.028em] [overflow-wrap:anywhere]">{meetup.title}</h3>
        {showRoom && (
          <Link
            href={`/rooms/${encodeURIComponent(meetup.roomId)}`}
            prefetch={false}
            className="w-fit rounded-sm text-sm font-semibold underline decoration-foreground/30 outline-none transition-colors duration-200 hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {meetup.buildingName} {floorLabel(meetup.floor)} {meetup.roomName}
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="font-semibold tabular-nums">{meetupTimeRange(meetup)}</p>
        <span aria-hidden="true" className="block h-1 overflow-hidden rounded-full bg-muted">
          <span
            className="block h-full origin-left rounded-full bg-status-meetup transition-transform duration-700 ease-fluid"
            style={{ transform: `scaleX(${elapsed})` }}
          />
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div ref={seats} className="min-w-0">
          <SeatRow
            members={meetup.members}
            maxMembers={meetup.maxMembers}
            waiting={isOpen && !meetup.isFull}
            onPresence={handlePresence}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-bold text-foreground tabular-nums">
            {meetup.memberCount}/{meetup.maxMembers}
          </span>
          명 · 주최 {meetup.hostNickname}
        </p>
      </div>

      {meetup.description && <p className="text-sm text-muted-foreground">{meetup.description}</p>}

      {/* 참여할 때 날아가는 이름표의 원본 */}
      {myFace && (
        <span ref={flyingFace} hidden>
          <AvatarFace parts={myFace} />
        </span>
      )}

      {isOpen && (
        <div className="flex flex-wrap items-center gap-2">
          {isHost && (
            <Button variant="outline" disabled={disabled} onClick={() => setConfirmingCancel(true)}>
              모임 취소
            </Button>
          )}
          {!isHost && isMember && (
            <>
              <span className="flex items-center gap-1 text-sm font-semibold text-status-meetup">
                <Check aria-hidden="true" className="size-4" />
                참여 완료
              </span>
              <Button variant="outline" className="ml-auto" disabled={disabled} onClick={handleLeave}>
                나가기
              </Button>
            </>
          )}
          {!isMember && !isHost && (
            <Button
              ref={joinButton}
              size="lg"
              className="w-full bg-status-meetup text-status-foreground hover:bg-status-meetup/90 sm:w-auto"
              disabled={disabled || meetup.isFull}
              onClick={handleJoin}
            >
              {meetup.isFull ? "정원 마감" : "참여하기"}
            </Button>
          )}
        </div>
      )}

      <Dialog open={confirmingCancel} onOpenChange={setConfirmingCancel}>
        <DialogContent tray className="bg-status-class text-status-foreground">
          <DialogHeader>
            <DialogTitle>모임을 취소할까요?</DialogTitle>
            <DialogDescription className="text-white">
              {meetup.title} 모임이 목록에서 사라져요. 되돌릴 수 없어요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              className="text-white hover:bg-white/15 hover:text-white"
              disabled={pending}
              onClick={() => setConfirmingCancel(false)}
            >
              돌아가기
            </Button>
            <Button className="bg-white text-status-class hover:bg-white/90" disabled={disabled} onClick={handleCancel}>
              모임 취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
