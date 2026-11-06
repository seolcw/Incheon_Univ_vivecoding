"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { askTorch, currentAtIso, useDemoAt, USE_MOCK } from "@/lib/api";
import { getUser } from "@/lib/user";
import { formatKstTime } from "@/lib/time";
import type { ChatResponse } from "@/lib/types";

type Turn = { question: string; at: string; response?: ChatResponse; error?: string };

export function TorchChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const questionInput = useRef<HTMLTextAreaElement>(null);
  const demo = useDemoAt();
  const last = turns.at(-1);
  const mood = pending ? "thinking" : last?.response?.recommendations.length ? "happy" : "idle";
  const disabled = pending || USE_MOCK || demo.status === "loading" || demo.status === "invalid";

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [turns, pending, open]);

  useEffect(() => {
    if (open) questionInput.current?.focus({ preventScroll: true });
  }, [open]);

  function close() {
    setOpen(false);
    launcher.current?.focus({ preventScroll: true });
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
      const response = await askTorch({ userId: user.userId, message, location: null, at });
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
        className="pointer-events-auto order-2 flex h-[72px] w-14 shrink-0 cursor-pointer items-center justify-center rounded-2xl transition hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 motion-reduce:transform-none">
        <Image src={`/mascot/${mood}.png`} alt="횃불이" width={56} height={72} unoptimized className={`h-[72px] w-14 object-contain drop-shadow-md ${pending ? "motion-safe:animate-pulse" : ""}`} />
      </button>
      {open && <section id="torch-chat-panel" aria-labelledby="torch-chat-title"
        onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}
        className="pointer-events-auto order-1 flex h-[min(460px,calc(100dvh-2rem))] w-80 max-w-[calc(100vw-6rem)] flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-sky-100 bg-sky-50 px-3 py-2">
          <div><h2 id="torch-chat-title" className="text-sm font-semibold text-sky-950">횃불이</h2>
            <p className="text-[10px] text-sky-700">정보대 · {demo.status === "on" ? `시연 ${formatKstTime(demo.at)} 기준` : "현재 시각 기준"}</p>
          </div>
          <button type="button" onClick={close} aria-label="횃불이 대화 닫기" className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-sky-600"><X className="size-4" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50/60 p-3" role="log" aria-label="횃불이 대화" aria-live="polite" aria-relevant="additions text">
          <p className="w-fit max-w-[95%] rounded-xl rounded-tl-sm border border-sky-100 bg-white px-3 py-2 text-xs leading-relaxed text-slate-700">안녕, 횃불이야! 필요할 때 말 걸어 줘. 🔥</p>
          {turns.map((turn, index) => <div key={index} className="space-y-3">
            <p className="ml-auto max-w-[90%] rounded-xl rounded-tr-sm bg-sky-700 px-3 py-2 text-xs text-white">{turn.question}</p>
            {turn.response && <div className="space-y-2">
              <div className="rounded-xl rounded-tl-sm border border-sky-100 bg-white p-2.5 text-xs leading-relaxed text-slate-700">
                <p>{turn.response.reply}</p>
                <p className="mt-2 text-[10px] text-slate-500">{formatKstTime(turn.at)} 기준 · {turn.response.source === "llm" ? "AI 추천" : "기본 추천 · AI 연결 안 됨"}</p>
              </div>
              {turn.response.recommendations.map((room) => <Link key={room.roomId} prefetch={false} onClick={() => setOpen(false)} href={`/rooms/${encodeURIComponent(room.roomId)}?at=${encodeURIComponent(turn.at)}`}
                className="group block rounded-xl border border-sky-100 bg-white p-3 shadow-sm transition hover:border-sky-400 focus-visible:outline-2 focus-visible:outline-sky-600">
                <div className="flex items-center justify-between"><strong className="text-sm text-slate-900">{room.buildingName} {room.roomName}</strong><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">{room.freeMinutes}분 여유</span></div>
                <p className="mt-1 text-xs text-slate-500">{room.floor}층 · {formatKstTime(room.freeUntil)}까지</p>
                <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-sky-700">강의실 보고 모임 만들기 <ArrowRight className="size-3" aria-hidden /></span>
              </Link>)}
            </div>}
            {turn.error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800">앗, 연결이 잠깐 어려워. {turn.error} 입력창에서 다시 보내 줘.</p>}
          </div>)}
          {pending && <p role="status" className="text-sm text-sky-800">불꽃 켜고 시간표를 살펴보는 중이야…</p>}
          <div ref={bottom} />
        </div>
        <form onSubmit={submit} className="shrink-0 space-y-1.5 border-t border-sky-100 bg-white p-2.5">
          {(notice || USE_MOCK || demo.status === "invalid") && <p role="alert" className="text-xs text-amber-800">{notice || (USE_MOCK ? "실제 API 연결 후 이용할 수 있어." : "잘못된 시연 시각을 해제해 줘.")}</p>}
          <div className="flex items-end gap-2"><label htmlFor="torch-question" className="sr-only">횃불이에게 질문</label>
            <textarea ref={questionInput} id="torch-question" value={input} onChange={(event) => setInput(event.target.value)} maxLength={300} rows={1} placeholder="횃불이에게 말 걸기…"
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void ask(input); } }}
              className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
            <Button type="submit" disabled={disabled || !input.trim()} aria-label="질문 보내기" className="size-9 rounded-xl bg-sky-700 text-white hover:bg-sky-800"><Send className="size-3.5" /></Button>
          </div>
          <p className="text-[9px] text-slate-400">비공식 시연 · <a href="https://www.inu.ac.kr/inu/731/subview.do" target="_blank" rel="noreferrer" className="underline">캐릭터: 인천대학교</a></p>
        </form>
      </section>}
    </div>
  );
}
