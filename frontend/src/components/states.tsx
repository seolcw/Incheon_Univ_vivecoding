"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const SLOW_LOADING_MS = 8000;

/** 첫 로딩. Render 콜드스타트로 오래 걸리면 문구를 바꾼다(SPEC v1 §4). */
export function LoadingState({ message, skeletonClass }: { message: string; skeletonClass?: string }) {
  const [isSlow, setIsSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsSlow(true), SLOW_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div role="status" className="flex flex-col gap-3">
      <p>{isSlow ? "서버를 깨우는 중이에요. 잠시만 기다려 주세요." : message}</p>
      {skeletonClass && <div aria-hidden="true" className={`animate-pulse rounded-lg bg-muted ${skeletonClass}`} />}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3">
      <p>{message}</p>
      <Button variant="outline" onClick={onRetry}>
        재시도
      </Button>
    </div>
  );
}

export function NotFoundState({ message }: { message: string }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3">
      <p>{message}</p>
      <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
        지도로 돌아가기
      </Button>
    </div>
  );
}

/** 재조회 실패: 마지막 데이터를 그대로 두고 알린다. */
export function RefreshFailedNote() {
  return (
    <p role="status" className="text-sm text-muted-foreground">
      갱신에 실패했어요.
    </p>
  );
}
