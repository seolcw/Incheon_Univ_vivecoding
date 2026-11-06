"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";

const POLL_INTERVAL_MS = 10_000;

/** 모든 조회: 10초 폴링 + mount·focus 재조회(SWR 기본값). */
export function Providers({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ refreshInterval: POLL_INTERVAL_MS }}>{children}</SWRConfig>;
}
