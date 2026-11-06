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
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
            <DemoAtGate>{children}</DemoAtGate>
          </main>
          <footer className="mx-auto w-full max-w-5xl px-4 pb-6 text-sm text-muted-foreground">
            시간표와 데모 모임은 가상 시연 데이터예요.
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
