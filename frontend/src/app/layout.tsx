import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { DemoAtGate, DemoAtSync } from "@/components/demo-at";
import { NicknameDialog } from "@/components/nickname-dialog";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "빈강",
  description: "지금 비어 있는 강의실을 캠퍼스 지도에서 찾고, 그 강의실에 모임을 여는 서비스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Providers>
          <AppHeader />
          <main className="mx-auto w-full max-w-[1240px] flex-1 px-3 py-4 sm:px-6 sm:py-6">
            <DemoAtGate>{children}</DemoAtGate>
          </main>
          <footer className="mx-auto w-full max-w-[1240px] px-4 pt-4 pb-28 text-[0.8125rem] leading-relaxed text-muted-foreground sm:px-6 sm:pb-10">
            실제 시간표 기준이에요. 휴강·보강은 반영되지 않고, 시간표에 없는 시간이라고 문이 열려 있다는 뜻은 아니에요.
          </footer>
          <NicknameDialog />
          <Suspense fallback={null}>
            <DemoAtSync />
          </Suspense>
        </Providers>
        <Toaster theme="light" />
      </body>
    </html>
  );
}
