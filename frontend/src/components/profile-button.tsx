"use client";

import { useState, type CSSProperties } from "react";
import { AvatarBuilder } from "@/components/avatar-builder";
import { FaceOrInitial } from "@/components/avatar-face";
import { seatColor, seatInitial } from "@/components/seat-row";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveAvatar, useAvatar, useNickname, useUserId } from "@/lib/user";

/** 헤더의 내 자리 원. 누르면 언제든 얼굴을 고친다. 고르는 즉시 저장된다. */
export function ProfileButton() {
  const nickname = useNickname();
  const userId = useUserId();
  const avatar = useAvatar();
  const [open, setOpen] = useState(false);
  if (!nickname || !userId) return null;

  const initial = seatInitial(nickname);
  return (
    <>
      <button
        type="button"
        aria-label={`${nickname}님의 프로필 얼굴 바꾸기`}
        title={nickname}
        className="seat cursor-pointer outline-none transition-transform duration-300 ease-pop hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        style={
          {
            width: 36,
            height: 36,
            fontSize: 15,
            backgroundColor: seatColor(userId),
            color: "var(--seat-foreground)",
          } as CSSProperties
        }
        onClick={() => setOpen(true)}
      >
        <FaceOrInitial avatar={avatar} initial={initial} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent tray>
          <DialogHeader>
            <DialogTitle>내 얼굴 꾸미기</DialogTitle>
            <DialogDescription>이제부터 만들거나 참여하는 모임의 자리에 보여요.</DialogDescription>
          </DialogHeader>
          <AvatarBuilder value={avatar} onChange={saveAvatar} initial={initial} seed={userId} />
          <DialogFooter>
            <Button size="lg" className="w-full sm:w-auto" onClick={() => setOpen(false)}>
              완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
