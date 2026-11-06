"use client";

import { DoorClosed, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const SLOW_LOADING_MS = 8000;
const WINDOW_COUNT = 9;

/** 건물 창에 차례로 불이 들어오는 작은 표시 */
function WindowsLoader() {
  return (
    <span aria-hidden="true" className="windows-loader grid size-7 shrink-0 grid-cols-3 gap-[3px]">
      {Array.from({ length: WINDOW_COUNT }, (_, index) => (
        <span
          key={index}
          className="rounded-[2px] bg-status-empty"
          style={{ "--i": (index * 4) % WINDOW_COUNT } as React.CSSProperties}
        />
      ))}
    </span>
  );
}

/** 첫 로딩. Render 콜드스타트로 오래 걸리면 문구를 바꾼다(SPEC v1 §4). */
export function LoadingState({ message, skeletonClass }: { message: string; skeletonClass?: string }) {
  const [isSlow, setIsSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsSlow(true), SLOW_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div role="status" className="reveal flex flex-col gap-4">
      <p className="flex items-center gap-3 font-medium">
        <WindowsLoader />
        {isSlow ? "서버를 깨우는 중이에요. 잠시만 기다려 주세요." : message}
      </p>
      {skeletonClass && <div aria-hidden="true" className={`skeleton w-full rounded-[28px] ${skeletonClass}`} />}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const [spins, setSpins] = useState(0);
  return (
    <div
      role="alert"
      data-status="class"
      className="hero-surface rise flex flex-col items-start gap-5 rounded-[28px] p-6 sm:p-8"
    >
      <p className="max-w-[32ch] text-2xl leading-snug font-bold tracking-[-0.028em] sm:text-3xl">{message}</p>
      <Button
        className="bg-white text-status-class hover:bg-white/90"
        onClick={() => {
          setSpins((count) => count + 1);
          onRetry();
        }}
      >
        <RotateCw
          aria-hidden="true"
          className="transition-transform duration-500 ease-fluid"
          style={{ transform: `rotate(${spins * 360}deg)` }}
        />
        재시도
      </Button>
    </div>
  );
}

export function NotFoundState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      data-status="closed"
      className="hero-surface rise flex flex-col items-start gap-5 rounded-[28px] p-6 sm:p-8"
    >
      <DoorClosed aria-hidden="true" className="size-9" strokeWidth={1.5} />
      <p className="max-w-[32ch] text-2xl leading-snug font-bold tracking-[-0.028em] sm:text-3xl">{message}</p>
      <Button
        className="bg-white text-foreground hover:bg-white/90"
        nativeButton={false}
        render={<Link href="/" />}
      >
        지도로 돌아가기
      </Button>
    </div>
  );
}

/** 재조회 실패: 마지막 데이터를 그대로 두고 알린다. */
export function RefreshFailedNote() {
  return (
    <p
      role="status"
      className="reveal inline-flex w-fit items-center gap-2 rounded-full bg-muted px-3 py-1 text-[0.8125rem] font-medium text-muted-foreground"
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-status-class" />
      갱신에 실패했어요.
    </p>
  );
}
