"use client";

import { useRef, useState, type CSSProperties, type FormEvent } from "react";
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
import { Input } from "@/components/ui/input";
import { burstFrom } from "@/lib/motion";
import { NICKNAME_MAX_LENGTH, saveAvatar, saveNickname, useNickname } from "@/lib/user";

/** 첫 방문에 뜬다. 저장 전에는 닫을 수 없어 모임 생성·참여로 넘어가지 못한다. */
export function NicknameDialog() {
  const nickname = useNickname();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const avatar = useRef<HTMLSpanElement>(null);
  const [face, setFace] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > NICKNAME_MAX_LENGTH) {
      setError(`닉네임은 1–${NICKNAME_MAX_LENGTH}자로 입력해 주세요.`);
      return;
    }
    burstFrom(avatar.current, { count: 18, spread: 90 });
    // 닉네임을 저장하면 다이얼로그가 닫히므로 얼굴을 먼저 저장한다.
    saveAvatar(face);
    saveNickname(trimmed);
  }

  const trimmed = value.trim();
  const seed = trimmed || "빈강";
  const initial = seatInitial(trimmed);
  const filled = Math.min(trimmed.length / Math.min(NICKNAME_MAX_LENGTH, 3), 1);

  return (
    <Dialog open={nickname === null}>
      <DialogContent tray showCloseButton={false}>
        <form onSubmit={handleSubmit} className="grid max-h-[85dvh] gap-4 overflow-y-auto">
          {!building && (
            <span
              ref={avatar}
              aria-hidden="true"
              data-open={trimmed || face ? undefined : "true"}
              className="seat text-foreground"
              style={
                {
                  width: 60,
                  height: 60,
                  fontSize: 26,
                  backgroundColor: trimmed || face ? seatColor(seed) : undefined,
                  color: trimmed || face ? "var(--seat-foreground)" : undefined,
                  transition: "background-color 0.3s ease-out",
                } as CSSProperties
              }
            >
              <FaceOrInitial avatar={face} initial={initial} />
              <svg viewBox="0 0 40 40" className="absolute -inset-1 -rotate-90 overflow-visible">
                <circle
                  cx="20"
                  cy="20"
                  r="19"
                  pathLength="1"
                  fill="none"
                  stroke="var(--status-meetup)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="1"
                  strokeDashoffset={1 - filled}
                  opacity={filled > 0 ? 1 : 0}
                  style={{ transition: "stroke-dashoffset 0.5s var(--ease-fluid)" }}
                />
              </svg>
            </span>
          )}
          <DialogHeader>
            <DialogTitle>닉네임을 정해 주세요</DialogTitle>
            <DialogDescription>모임을 만들거나 참여할 때 이 이름으로 보여요. 로그인은 필요 없어요.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <label htmlFor="nickname" className="text-sm font-semibold">
              닉네임
            </label>
            <Input
              id="nickname"
              value={value}
              maxLength={NICKNAME_MAX_LENGTH}
              autoComplete="nickname"
              placeholder={`1–${NICKNAME_MAX_LENGTH}자`}
              aria-invalid={error !== ""}
              aria-describedby={error ? "nickname-error" : undefined}
              onChange={(event) => {
                setValue(event.target.value);
                setError("");
              }}
            />
            {error && (
              <p id="nickname-error" role="alert" className="nudge text-sm font-medium text-destructive">
                {error}
              </p>
            )}
          </div>
          {building ? (
            <AvatarBuilder value={face} onChange={setFace} initial={initial} seed={seed} />
          ) : (
            <Button type="button" variant="outline" className="w-full" onClick={() => setBuilding(true)}>
              {face ? "얼굴 다시 꾸미기" : "얼굴 꾸미기 (선택)"}
            </Button>
          )}
          <DialogFooter>
            <Button type="submit" size="lg" className="w-full sm:w-auto">
              시작하기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
