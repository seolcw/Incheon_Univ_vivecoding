"use client";

import { useState, type FormEvent } from "react";
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
import { NICKNAME_MAX_LENGTH, saveNickname, useNickname } from "@/lib/user";

/** 첫 방문에 뜬다. 저장 전에는 닫을 수 없어 모임 생성·참여로 넘어가지 못한다. */
export function NicknameDialog() {
  const nickname = useNickname();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > NICKNAME_MAX_LENGTH) {
      setError(`닉네임은 1–${NICKNAME_MAX_LENGTH}자로 입력해 주세요.`);
      return;
    }
    saveNickname(trimmed);
  }

  return (
    <Dialog open={nickname === null}>
      <DialogContent showCloseButton={false}>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>닉네임을 정해 주세요</DialogTitle>
            <DialogDescription>모임을 만들거나 참여할 때 이 이름으로 보여요. 로그인은 필요 없어요.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <label htmlFor="nickname" className="text-sm font-medium">
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
              <p id="nickname-error" role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit">시작하기</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
