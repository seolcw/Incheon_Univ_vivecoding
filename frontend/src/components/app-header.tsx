"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { DemoAtBadge } from "@/components/demo-at";
import { Badge } from "@/components/ui/badge";
import { USE_MOCK } from "@/lib/api";

const MOCK_BADGE_CLASS = "bg-mock text-mock-foreground";
const FOCUS_CLASS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const NAV_ITEMS = [
  { href: "/", label: "지도" },
  { href: "/meetups", label: "모임" },
];

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

/** 방 평면 기호: 호버하면 문이 닫혔다가 다시 열린다. */
function BrandMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[22px] shrink-0" fill="none">
      <path
        d="M9 3H5.5A2.5 2.5 0 0 0 3 5.5v13A2.5 2.5 0 0 0 5.5 21h13a2.5 2.5 0 0 0 2.5-2.5v-13A2.5 2.5 0 0 0 18.5 3H18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M9 3v9"
        stroke="var(--status-empty)"
        strokeWidth="2.6"
        strokeLinecap="round"
        className="origin-[9px_3px] transition-transform duration-500 ease-pop group-hover/brand:-rotate-90"
      />
      <path
        d="M9 12a9 9 0 0 0 9-9"
        stroke="var(--status-empty)"
        strokeWidth="1.3"
        strokeDasharray="2 2.4"
        className="transition-opacity duration-200 group-hover/brand:opacity-0"
      />
    </svg>
  );
}

function NavSlots({ activeSlot }: { activeSlot: number }) {
  return (
    <nav aria-label="주요 메뉴" className="relative grid grid-cols-2 rounded-full bg-muted p-1 text-sm font-semibold">
      <span aria-hidden="true" className="pointer-events-none absolute inset-1 grid grid-cols-2">
        <span
          className="slide-chip rounded-full bg-card shadow-[0_1px_3px_oklch(0.2_0.008_265/0.14)]"
          style={{ "--slot": activeSlot } as React.CSSProperties}
        />
      </span>
      {NAV_ITEMS.map((item, index) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={activeSlot === index ? "page" : undefined}
          className={`relative rounded-full px-4 py-1.5 text-center transition-colors duration-200 ${FOCUS_CLASS} ${
            activeSlot === index ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function Nav() {
  const pathname = usePathname();
  return <NavSlots activeSlot={pathname.startsWith("/meetups") ? 1 : 0} />;
}

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="mx-auto flex min-h-14 w-full max-w-[1240px] flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 sm:min-h-16 sm:px-6">
        <Link
          href="/"
          className={`group/brand flex items-center gap-1.5 rounded-md text-lg font-extrabold tracking-[-0.04em] ${FOCUS_CLASS}`}
        >
          <BrandMark />
          빈강
        </Link>
        <Suspense fallback={<NavSlots activeSlot={0} />}>
          <Nav />
        </Suspense>
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
