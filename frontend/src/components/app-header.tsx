"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { DemoAtBadge } from "@/components/demo-at";
import { Badge } from "@/components/ui/badge";
import { USE_MOCK } from "@/lib/api";

const MOCK_BADGE_CLASS = "bg-mock text-mock-foreground";
const LINK_CLASS = "rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function mockLabel(pathname: string) {
  if (pathname.startsWith("/buildings")) return "MOCK · 예시 강의실";
  if (pathname.startsWith("/rooms")) return "MOCK · 예시 시간표";
  if (pathname.startsWith("/meetups")) return "MOCK · 예시 모임";
  return "MOCK · 예시 캠퍼스";
}

function MockBadge() {
  const pathname = usePathname();
  return <Badge className={MOCK_BADGE_CLASS}>{mockLabel(pathname)}</Badge>;
}

export function AppHeader() {
  return (
    <header className="border-b bg-background sm:sticky sm:top-0 sm:z-40">
      <div className="mx-auto flex min-h-14 w-full max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
        <Link href="/" className={`text-lg font-bold ${LINK_CLASS}`}>
          빈강
        </Link>
        <nav aria-label="주요 메뉴" className="flex items-center gap-3 text-sm font-medium">
          <Link href="/" className={LINK_CLASS}>
            지도
          </Link>
          <Link href="/meetups" className={LINK_CLASS}>
            모임
          </Link>
        </nav>
        {USE_MOCK && (
          <Suspense fallback={<Badge className={MOCK_BADGE_CLASS}>MOCK</Badge>}>
            <MockBadge />
          </Suspense>
        )}
        <div className="ml-auto">
          <DemoAtBadge />
        </div>
      </div>
    </header>
  );
}
