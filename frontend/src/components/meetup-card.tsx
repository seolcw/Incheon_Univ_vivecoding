"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cancelMeetup, joinMeetup, leaveMeetup, USE_MOCK } from "@/lib/api";
import { categoryLabel, meetupPhase, meetupTimeRange } from "@/lib/meetup";
import { floorLabel } from "@/lib/room-status";
import type { Meetup } from "@/lib/types";
import { useWriteAction } from "@/lib/use-write-action";
import { getUser, useUserId } from "@/lib/user";

const NEED_NICKNAME_MESSAGE = "닉네임을 먼저 정해 주세요.";

export function MeetupCard({ meetup, at, showRoom = true }: { meetup: Meetup; at: string; showRoom?: boolean }) {
  const userId = useUserId();
  const { pending, run } = useWriteAction();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const isHost = userId === meetup.hostId;
  const isMember = meetup.members.some((member) => member.userId === userId);
  const isOpen = meetup.status === "open";
  const disabled = pending || USE_MOCK;

  async function handleJoin() {
    const user = getUser();
    if (!user) return toast.error(NEED_NICKNAME_MESSAGE);
    const result = await run(() => joinMeetup(meetup.id, user), "모임에 참여했어요.");
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
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {meetup.title}
          <Badge variant="secondary">{categoryLabel(meetup.category)}</Badge>
          <Badge variant="outline">{meetupPhase(meetup, at)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        {showRoom && (
          <Link
            href={`/rooms/${encodeURIComponent(meetup.roomId)}`}
            prefetch={false}
            className="rounded-sm font-medium underline underline-offset-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {meetup.buildingName} {floorLabel(meetup.floor)} {meetup.roomName}
          </Link>
        )}
        <p className="tabular-nums">{meetupTimeRange(meetup)}</p>
        <p>
          <span className="font-bold tabular-nums">
            {meetup.memberCount}/{meetup.maxMembers}
          </span>
          명 · 주최 {meetup.hostNickname}
        </p>
        {meetup.description && <p className="text-muted-foreground">{meetup.description}</p>}
      </CardContent>
      {isOpen && (
        <CardFooter className="flex flex-wrap items-center gap-2">
          {isHost && (
            <Button variant="outline" disabled={disabled} onClick={() => setConfirmingCancel(true)}>
              모임 취소
            </Button>
          )}
          {!isHost && isMember && (
            <>
              <span className="text-sm font-medium">참여 완료</span>
              <Button variant="outline" disabled={disabled} onClick={handleLeave}>
                나가기
              </Button>
            </>
          )}
          {!isMember && !isHost && (
            <Button disabled={disabled || meetup.isFull} onClick={handleJoin}>
              {meetup.isFull ? "정원 마감" : "참여하기"}
            </Button>
          )}
        </CardFooter>
      )}

      <Dialog open={confirmingCancel} onOpenChange={setConfirmingCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>모임을 취소할까요?</DialogTitle>
            <DialogDescription>{meetup.title} 모임이 목록에서 사라져요. 되돌릴 수 없어요.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setConfirmingCancel(false)}>
              돌아가기
            </Button>
            <Button variant="destructive" disabled={disabled} onClick={handleCancel}>
              모임 취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
