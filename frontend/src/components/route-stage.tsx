"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

let lastDepth: number | null = null;

function depthOf(pathname: string) {
  if (pathname.startsWith("/rooms")) return 2;
  if (pathname === "/") return 0;
  return 1;
}

/** 깊이 들어갈수록 아래에서, 돌아올수록 위에서 화면이 들어온다. 첫 로드는 움직이지 않는다. */
export function RouteStage({ children }: { children: ReactNode }) {
  const stage = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const depth = depthOf(window.location.pathname);
    if (lastDepth !== null && stage.current) {
      stage.current.dataset.enter = depth >= lastDepth ? "forward" : "back";
    }
    lastDepth = depth;
  }, []);
  return (
    <div ref={stage} className="route-stage">
      {children}
    </div>
  );
}
