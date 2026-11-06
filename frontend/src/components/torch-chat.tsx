"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, MapPin, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { askTorch, currentAtIso, useDemoAt, USE_MOCK } from "@/lib/api";
import { DEMO_BUILDING_ID } from "@/lib/demo-building";
import { getUser } from "@/lib/user";
import { formatKstTime } from "@/lib/time";
import type { ChatRequest, ChatResponse } from "@/lib/types";

type Turn = { question: string; at: string; response?: ChatResponse; error?: string };
type Coords = NonNullable<ChatRequest["location"]>;
type LocationResult = { coords: Coords; failure?: undefined } | { coords: null; failure: string };

const LOCATION_QUESTION = /현재\s*위치|내\s*위치|근처|주변|가까운/;
const LOCATION_TIMEOUT_MS = 5000;
const LOCATION_FAILURES = {
  unsupported: "이 브라우저는 위치를 지원하지 않아서 위치 없이 답할게.",
  denied: "위치 권한이 없어서 위치 없이 답할게.",
  timeout: "위치 확인이 늦어져서 위치 없이 답할게.",
  failed: "위치를 찾지 못해서 위치 없이 답할게.",
};

// 마스코트(오른쪽 아래 고정)의 크기와 여백(px). 아래 className과 같은 값이다.
const LAUNCHER = { inset: 16, width: 56, height: 72, gap: 8 };
const TOP_OF_PAGE_PX = 8;

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** 권한 창이 떠 있으면 브라우저의 timeout이 돌지 않을 수 있어 직접 시간을 잰다. 좌표는 어디에도 저장하지 않는다. */
function readLocation(): Promise<LocationResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ coords: null, failure: LOCATION_FAILURES.unsupported });
    const timer = setTimeout(() => resolve({ coords: null, failure: LOCATION_FAILURES.timeout }), LOCATION_TIMEOUT_MS);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        clearTimeout(timer);
        resolve({ coords: { lat: coords.latitude, lng: coords.longitude } });
      },
      (error) => {
        clearTimeout(timer);
        const reason =
          error.code === error.PERMISSION_DENIED ? "denied" : error.code === error.TIMEOUT ? "timeout" : "failed";
        resolve({ coords: null, failure: LOCATION_FAILURES[reason] });
      },
      { timeout: LOCATION_TIMEOUT_MS, maximumAge: 60_000 },
    );
  });
}

export function TorchChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [locating, setLocating] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  // 대화창이 열려 있는 동안만 메모리에 둔다. 닫으면 지우고, 그 사이 도착한 응답도 버린다.
  const coords = useRef<Coords | null>(null);
  const chatSession = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const questionInput = useRef<HTMLTextAreaElement>(null);
  const demo = useDemoAt();
  const last = turns.at(-1);
  const mood = pending ? "thinking" : last?.response?.recommendations.length ? "happy" : "idle";
  const disabled = pending || locating || USE_MOCK || demo.status === "loading" || demo.status === "invalid";

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [turns, pending, open]);

  useEffect(() => {
    if (open) questionInput.current?.focus({ preventScroll: true });
  }, [open]);

  // 페이지 맨 위에서 건물 줄의 끝을 가리면 마스코트가 줄 위로 비켜 선다. 스크롤하면 제자리로 돌아온다.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const button = launcher.current;
      if (!button) return;
      const row = document.querySelector(`main a[href="/buildings/${DEMO_BUILDING_ID}"]`)?.getBoundingClientRect();
      const home = {
        bottom: window.innerHeight - LAUNCHER.inset,
        top: window.innerHeight - LAUNCHER.inset - LAUNCHER.height,
        left: window.innerWidth - LAUNCHER.inset - LAUNCHER.width,
      };
      const covers =
        row && window.scrollY < TOP_OF_PAGE_PX && row.right > home.left && row.top < home.bottom && row.bottom > home.top;
      button.style.translate = covers ? `0 -${Math.ceil(home.bottom - row.top + LAUNCHER.gap)}px` : "";
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    const main = document.querySelector("main");
    const observer = new MutationObserver(schedule);
    const resizes = new ResizeObserver(schedule);
    if (main) {
      observer.observe(main, { childList: true, subtree: true });
      resizes.observe(main);
      // 화면 전환 움직임이 끝나야 줄의 최종 위치가 정해진다.
      main.addEventListener("animationend", schedule);
    }
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizes.disconnect();
      main?.removeEventListener("animationend", schedule);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  function forgetLocation() {
    coords.current = null;
    setHasLocation(false);
  }

  function collapse() {
    setOpen(false);
    setNotice("");
    chatSession.current += 1;
    forgetLocation();
  }

  function close() {
    collapse();
    launcher.current?.focus({ preventScroll: true });
  }

  /** 실패하면 안내를 띄우고 null을 돌려준다. 질문은 그대로 보낸다. */
  async function locate() {
    const session = chatSession.current;
    setLocating(true);
    const result = await readLocation();
    setLocating(false);
    if (result.failure) {
      setNotice(result.failure);
      return null;
    }
    if (session === chatSession.current) {
      coords.current = result.coords;
      setHasLocation(true);
    }
    return result.coords;
  }

  async function toggleLocation() {
    if (coords.current) {
      forgetLocation();
      setNotice("");
      return;
    }
    if (busy.current || disabled) return;
    busy.current = true;
    setNotice("");
    if (await locate()) setNotice("위치를 확인했어. 이 대화창을 닫으면 잊어버릴게.");
    busy.current = false;
  }

  async function ask(question: string) {
    const message = question.trim();
    if (busy.current || disabled || !message) return;
    const user = getUser();
    if (!user) { setNotice("닉네임을 먼저 정해 줘!"); return; }
    busy.current = true;
    setPending(true);
    setNotice("");
    setInput("");
    const at = currentAtIso(demo);
    setTurns((previous) => [...previous.slice(-9), { question: message, at }]);
    try {
      const location = coords.current ?? (LOCATION_QUESTION.test(message) ? await locate() : null);
      const response = await askTorch({ userId: user.userId, message, location, at });
      setTurns((previous) => [...previous.slice(0, -1), { question: message, at, response }]);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "서버 연결을 확인하고 다시 불러줘.";
      setTurns((previous) => [...previous.slice(0, -1), { question: message, at, error: reason }]);
      setInput(message);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  function submit(event: FormEvent) { event.preventDefault(); void ask(input); }

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-40 flex items-end gap-2">
      <button ref={launcher} type="button" onClick={() => open ? close() : setOpen(true)} aria-label={open ? "횃불이 대화 접기" : "횃불이와 대화하기"}
        aria-expanded={open} aria-controls="torch-chat-panel" title="횃불이"
        className={`pointer-events-auto order-2 flex h-[72px] w-14 shrink-0 cursor-pointer items-center justify-center rounded-2xl transition duration-300 ease-fluid hover:-translate-y-1 motion-reduce:hover:translate-y-0 ${FOCUS_RING}`}>
        <Image src={`/mascot/${mood}.png`} alt="횃불이" width={56} height={72} unoptimized className={`h-[72px] w-14 object-contain drop-shadow-md ${pending ? "motion-safe:animate-pulse" : ""}`} />
      </button>
      {open && <section id="torch-chat-panel" aria-labelledby="torch-chat-title"
        onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}
        className="pointer-events-auto order-1 flex h-[min(460px,calc(100dvh-2rem))] w-80 max-w-[calc(100vw-6rem)] flex-col overflow-hidden rounded-2xl bg-card text-card-foreground shadow-[0_28px_70px_-24px_oklch(0.2_0.008_265/0.5)]">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
          <div><h2 id="torch-chat-title" className="text-sm font-bold">횃불이</h2>
            <p className="text-[11px] text-muted-foreground tabular-nums">정보대 · {demo.status === "on" ? `시연 ${formatKstTime(demo.at)} 기준` : "현재 시각 기준"}</p>
          </div>
          <button type="button" onClick={close} aria-label="횃불이 대화 닫기" className={`flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${FOCUS_RING}`}><X className="size-4" aria-hidden /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-muted/60 p-3" role="log" aria-label="횃불이 대화" aria-live="polite" aria-relevant="additions text">
          <p className="w-fit max-w-[95%] rounded-xl rounded-tl-sm bg-card px-3 py-2 text-[13px] leading-relaxed">안녕, 횃불이야! 필요할 때 말 걸어 줘. 🔥</p>
          {turns.map((turn, index) => <div key={index} className="space-y-3">
            <p className="ml-auto w-fit max-w-[90%] rounded-xl rounded-tr-sm bg-primary px-3 py-2 text-[13px] leading-relaxed text-primary-foreground">{turn.question}</p>
            {turn.response && <div className="space-y-2">
              <div className="rounded-xl rounded-tl-sm bg-card p-2.5 text-[13px] leading-relaxed">
                <p>{turn.response.reply}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">{turn.response.recommendations.length > 0 ? `${formatKstTime(turn.at)} 기준 · ` : ""}{turn.response.source === "llm" ? (turn.response.recommendations.length > 0 ? "AI 추천" : "AI 대화") : "기본 응답 · AI 연결 안 됨"}</p>
              </div>
              {turn.response.recommendations.map((room) => <Link key={room.roomId} prefetch={false} onClick={collapse} href={`/rooms/${encodeURIComponent(room.roomId)}?at=${encodeURIComponent(turn.at)}`}
                className={`group block rounded-xl border border-border bg-card p-3 transition-colors hover:border-foreground/40 ${FOCUS_RING}`}>
                <div className="flex items-center justify-between gap-2"><strong className="min-w-0 text-sm">{room.buildingName} {room.roomName}</strong><span className="shrink-0 rounded-full bg-status-empty px-2 py-0.5 text-xs font-semibold text-status-foreground tabular-nums">{room.freeMinutes}분 여유</span></div>
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">{room.floor}층 · {formatKstTime(room.freeUntil)}까지{room.walkMinutes != null && ` · 도보 ${room.walkMinutes}분`}</p>
                <span className="mt-2 flex items-center gap-1 text-xs font-semibold">강의실 보고 모임 만들기 <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0" aria-hidden /></span>
              </Link>)}
            </div>}
            {turn.error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-[13px] leading-relaxed text-destructive">앗, 연결이 잠깐 어려워. {turn.error} 입력창에서 다시 보내 줘.</p>}
          </div>)}
          {pending && <p role="status" className="text-[13px] text-muted-foreground">{locating ? "위치를 확인하고 있어…" : "잠깐만, 생각을 정리하고 있어…"}</p>}
          <div ref={bottom} />
        </div>
        <form onSubmit={submit} className="shrink-0 space-y-1.5 border-t border-border bg-card p-2.5">
          {(notice || USE_MOCK || demo.status === "invalid") && <p role="alert" className="text-xs text-mock-foreground">{notice || (USE_MOCK ? "실제 API 연결 후 이용할 수 있어." : "잘못된 시연 시각을 해제해 줘.")}</p>}
          <div className="flex items-end gap-2"><label htmlFor="torch-question" className="sr-only">횃불이에게 질문</label>
            <textarea ref={questionInput} id="torch-question" value={input} onChange={(event) => setInput(event.target.value)} maxLength={300} rows={1} placeholder="횃불이에게 말 걸기…"
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void ask(input); } }}
              className="min-w-0 flex-1 resize-none rounded-xl border border-input bg-card px-3 py-2 text-base transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring md:text-sm" />
            <Button type="submit" disabled={disabled || !input.trim()} aria-label="질문 보내기" className="size-10 shrink-0 rounded-xl"><Send className="size-3.5" aria-hidden /></Button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => void toggleLocation()} disabled={!hasLocation && disabled} aria-pressed={hasLocation}
              className={`inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${hasLocation ? "bg-status-meetup text-status-foreground" : "bg-muted text-foreground hover:bg-border"} ${FOCUS_RING}`}>
              <MapPin className="size-3.5" aria-hidden />
              {locating ? "위치 확인 중…" : hasLocation ? "위치 사용 중" : "내 위치 사용"}
            </button>
            <p className="text-right text-[11px] leading-tight text-muted-foreground">비공식 시연 · <a href="https://www.inu.ac.kr/inu/731/subview.do" target="_blank" rel="noreferrer" className="underline">캐릭터: 인천대학교</a></p>
          </div>
        </form>
      </section>}
    </div>
  );
}
