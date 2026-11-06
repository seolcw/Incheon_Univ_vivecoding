"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Send, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { askTorch, currentAtIso, useDemoAt, USE_MOCK } from "@/lib/api";
import { getUser } from "@/lib/user";
import { formatKstTime } from "@/lib/time";
import type { ChatResponse } from "@/lib/types";

type Turn = { question: string; at: string; response?: ChatResponse; error?: string };
const QUICK_QUESTIONS = ["7호관에서 바로 쓸 수 있는 강의실", "3층에서 2시간 공부할 곳", "1시간 반 조용히 공부할 곳"];

export function TorchChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const demo = useDemoAt();
  const last = turns.at(-1);
  const mood = pending ? "thinking" : last?.response?.recommendations.length ? "happy" : "idle";
  const disabled = pending || USE_MOCK || demo.status === "loading" || demo.status === "invalid";

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [turns, pending]);

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button type="button" />} aria-label="횃불이와 대화하기"
        className="fixed right-4 bottom-5 z-40 flex cursor-pointer items-center gap-2 rounded-full border border-sky-100 bg-white py-2 pr-4 pl-2 text-sky-950 shadow-lg transition hover:-translate-y-1 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600 motion-reduce:transform-none sm:right-6">
        <Image src="/mascot/idle.png" alt="횃불이" width={52} height={60} unoptimized className="h-14 w-12 object-contain" />
        <span className="text-left"><span className="block text-xs text-sky-700">빈 강의실이 궁금해?</span><span className="block text-sm font-bold">횃불ON <Sparkles aria-hidden className="inline size-3.5" /></span></span>
      </DialogTrigger>
      <DialogContent className="flex h-[min(720px,88dvh)] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden border border-sky-100 p-0 shadow-2xl sm:max-w-[410px]"
        style={{ top: "auto", left: "auto", right: "1rem", bottom: "1rem", transform: "none", translate: "none", maxHeight: "calc(100dvh - 2rem)" }}>
        <div className="flex shrink-0 items-center gap-3 border-b border-sky-100 bg-sky-50 px-5 py-4">
          <Image src={`/mascot/${mood}.png`} alt={pending ? "공부하며 찾아보는 횃불이" : "횃불이"} width={64} height={72} unoptimized
            className={`h-16 w-14 object-contain ${pending ? "motion-safe:animate-pulse" : ""}`} />
          <div><DialogTitle className="text-lg font-bold text-sky-950">횃불ON</DialogTitle>
            <DialogDescription className="mt-1 text-xs text-sky-800">너의 공부에 불을 켜는 캠퍼스 메이트</DialogDescription>
            <p className="mt-1 text-[11px] text-sky-700">정보대 7호관 · {demo.status === "on" ? `시연 ${formatKstTime(demo.at)} 기준` : "현재 시각 기준"}</p>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-slate-50/60 px-4 py-4" role="log" aria-label="횃불이 대화" aria-live="polite" aria-relevant="additions text">
          <div className="max-w-[95%] rounded-2xl rounded-tl-sm border border-sky-100 bg-white p-3 text-sm leading-relaxed text-slate-700">
            안녕! 나는 횃불이야. 🔥<br />잠도 좋지만, 네 공부 자리는 꼭 찾아줄게!<br />정보대에서 <strong>얼마나, 몇 층에서</strong> 공부하고 싶어?
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((question) => <button key={question} type="button" disabled={disabled} onClick={() => void ask(question)} className="rounded-full border border-sky-200 bg-white px-3 py-2 text-xs text-sky-900 transition hover:bg-sky-50 disabled:opacity-50">{question}</button>)}
          </div>
          {turns.map((turn, index) => <div key={index} className="space-y-3">
            <p className="ml-auto max-w-[90%] rounded-2xl rounded-tr-sm bg-sky-700 px-3 py-2.5 text-sm text-white">{turn.question}</p>
            {turn.response && <div className="space-y-2">
              <div className="rounded-2xl rounded-tl-sm border border-sky-100 bg-white p-3 text-sm leading-relaxed text-slate-700">
                <p>{turn.response.reply}</p>
                <p className="mt-2 text-[10px] text-slate-500">{formatKstTime(turn.at)} 기준 · {turn.response.source === "llm" ? "AI 의도 해석 · 시간표 검증" : "기본 추천 · AI 연결 없이 조건 검색"}</p>
              </div>
              {turn.response.recommendations.map((room) => <Link key={room.roomId} prefetch={false} onClick={() => setOpen(false)} href={`/rooms/${encodeURIComponent(room.roomId)}?at=${encodeURIComponent(turn.at)}`}
                className="group block rounded-xl border border-sky-100 bg-white p-3 shadow-sm transition hover:border-sky-400 focus-visible:outline-2 focus-visible:outline-sky-600">
                <div className="flex items-center justify-between"><strong className="text-sm text-slate-900">{room.buildingName} {room.roomName}</strong><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">{room.freeMinutes}분 여유</span></div>
                <p className="mt-1 text-xs text-slate-500">{room.floor}층 · {formatKstTime(room.freeUntil)}까지</p>
                <p className="mt-2 text-xs text-slate-600">{room.reason}</p>
                <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-sky-700">강의실 보고 모임 만들기 <ArrowRight className="size-3" aria-hidden /></span>
              </Link>)}
            </div>}
            {turn.error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800">앗, 연결이 잠깐 어려워. {turn.error} 입력창에서 다시 보내 줘.</p>}
          </div>)}
          {pending && <p role="status" className="text-sm text-sky-800">불꽃 켜고 시간표를 살펴보는 중이야…</p>}
          <div ref={bottom} />
        </div>
        <form onSubmit={submit} className="shrink-0 space-y-2 border-t border-sky-100 bg-white p-3">
          <p className="text-[10px] text-slate-500">질문마다 시간·층을 함께 말해 줘. 실내 거리·시설 정보는 제공하지 않아.</p>
          {(notice || USE_MOCK || demo.status === "invalid") && <p role="alert" className="text-xs text-amber-800">{notice || (USE_MOCK ? "실제 API 연결 후 이용할 수 있어." : "잘못된 시연 시각을 해제해 줘.")}</p>}
          <div className="flex items-end gap-2"><label htmlFor="torch-question" className="sr-only">횃불이에게 질문</label>
            <textarea id="torch-question" value={input} onChange={(event) => setInput(event.target.value)} maxLength={300} rows={2} placeholder="예: 3층에서 두 시간 공부할 곳 찾아줘" className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
            <Button type="submit" disabled={disabled || !input.trim()} aria-label="질문 보내기" className="size-10 rounded-xl bg-sky-700 text-white hover:bg-sky-800"><Send className="size-4" /></Button>
          </div>
          <p className="text-[10px] text-slate-400">대회 시연용 · <a href="https://www.inu.ac.kr/inu/731/subview.do" target="_blank" rel="noreferrer" className="underline">캐릭터 출처: 인천대학교</a> · 학교 공식 챗봇 아님</p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
