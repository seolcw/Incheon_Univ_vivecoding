"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { clearDemoAt, syncDemoAt, useDemoAt } from "@/lib/api";
import { formatKstTime } from "@/lib/time";

/** 앱 안에서 URL의 at이 바뀌면(뒤로 가기 등) 다시 읽는다. 첫 로드는 lib/api.ts가 처리한다. */
export function DemoAtSync() {
  const urlAt = useSearchParams().get("at");
  useEffect(() => {
    syncDemoAt(urlAt);
  }, [urlAt]);
  return null;
}

/** 저장값과 URL의 at을 함께 지운다. userId·닉네임은 그대로 둔다. */
function useClearDemoAt() {
  const router = useRouter();
  return () => {
    clearDemoAt();
    const url = new URL(window.location.href);
    url.searchParams.delete("at");
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  };
}

export function DemoAtBadge() {
  const demoAt = useDemoAt();
  const clear = useClearDemoAt();
  if (demoAt.status !== "on") return null;
  return (
    <div className="reveal flex items-center gap-0.5 rounded-full bg-foreground py-0.5 pr-0.5 pl-3 text-background">
      <span className="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap tabular-nums">
        <span aria-hidden="true" className="live-dot text-status-empty" />
        시연 시각 {formatKstTime(demoAt.at)}
      </span>
      <Button
        variant="ghost"
        size="xs"
        className="rounded-full text-background/80 hover:bg-background/15 hover:text-background"
        aria-label="시연 시각 해제"
        onClick={clear}
      >
        해제
      </Button>
    </div>
  );
}

/** 시연 시각 형식이 틀리면 화면을 막아 조회가 나가지 않게 한다. */
export function DemoAtGate({ children }: { children: ReactNode }) {
  const demoAt = useDemoAt();
  const clear = useClearDemoAt();
  if (demoAt.status !== "invalid") return children;
  return (
    <div role="alert" className="rise flex flex-col items-start gap-4 rounded-[28px] bg-muted p-6 sm:p-8">
      <p className="text-2xl font-bold tracking-[-0.028em]">시연 시각 형식을 확인해 주세요.</p>
      <Button variant="outline" aria-label="시연 시각 해제" onClick={clear}>
        해제
      </Button>
    </div>
  );
}
