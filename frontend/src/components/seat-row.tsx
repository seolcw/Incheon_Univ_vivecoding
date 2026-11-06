"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { burstFrom } from "@/lib/motion";
import type { MeetupMember } from "@/lib/types";

const SEAT_COLORS = [
  "var(--seat-1)",
  "var(--seat-2)",
  "var(--seat-3)",
  "var(--seat-4)",
  "var(--seat-5)",
  "var(--seat-6)",
];
const SEAT_SIZES = { sm: 28, md: 38, lg: 48 };
const ARRIVAL_MS = 1100;
const VISIBLE_SEATS = 8;

export function seatColor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return SEAT_COLORS[hash % SEAT_COLORS.length];
}

export function seatInitial(nickname: string) {
  return Array.from(nickname.trim())[0] ?? "";
}

export type SeatMember = Pick<MeetupMember, "userId" | "nickname">;

/**
 * 모임의 자리. 찬 자리는 이름표, 빈자리는 점선이다.
 * 조회 결과에 새 사람이 보이면 그 자리에 테두리가 차오르며 앉고, 나가면 점선으로 돌아간다.
 */
export function SeatRow({
  members,
  maxMembers,
  size = "md",
  tone = "paper",
  waiting = true,
  welcomeFirst = false,
  popOpenSeats = false,
  onPresence,
}: {
  members: SeatMember[];
  maxMembers: number;
  size?: keyof typeof SEAT_SIZES;
  tone?: "paper" | "hero";
  waiting?: boolean;
  /** 처음 그릴 때 첫 자리도 도착 연출을 한다. */
  welcomeFirst?: boolean;
  popOpenSeats?: boolean;
  onPresence?: (joined: SeatMember[], left: SeatMember[]) => void;
}) {
  const row = useRef<HTMLDivElement>(null);
  const known = useRef<Map<string, SeatMember> | null>(null);

  useEffect(() => {
    const current = new Map(members.map((member) => [member.userId, member]));
    const before = known.current;
    known.current = current;
    const element = row.current;
    if (!element) return;

    const arriving = before ? members.filter((member) => !before.has(member.userId)) : welcomeFirst ? members.slice(0, 1) : [];
    const seats = arriving.flatMap((member) => {
      const seat = Array.from(element.querySelectorAll<HTMLElement>("[data-user]")).find(
        (item) => item.dataset.user === member.userId,
      );
      return seat ? [seat] : [];
    });
    seats.forEach((seat) => {
      seat.dataset.arriving = "true";
      burstFrom(seat, { count: 12, spread: 58 });
    });
    const timer = seats.length
      ? setTimeout(() => seats.forEach((seat) => delete seat.dataset.arriving), ARRIVAL_MS)
      : undefined;

    if (before && onPresence) {
      const left = [...before.values()].filter((member) => !current.has(member.userId));
      const joined = members.filter((member) => !before.has(member.userId));
      if (joined.length > 0 || left.length > 0) onPresence(joined, left);
    }
    return () => clearTimeout(timer);
    // members의 내용이 바뀔 때만 비교한다. 콜백이 바뀌어도 known이 같으면 아무 일도 없다.
  }, [members, onPresence, welcomeFirst]);

  const seatCount = Math.min(maxMembers, VISIBLE_SEATS);
  const shown = members.slice(0, seatCount);
  const openSeats = Math.max(seatCount - shown.length, 0);
  const more = maxMembers - seatCount;
  const pixels = SEAT_SIZES[size];
  const box: CSSProperties = { width: pixels, height: pixels, fontSize: pixels * 0.42 };
  const names = members.map((member) => member.nickname).join(", ");

  return (
    <div
      ref={row}
      role="img"
      aria-label={`정원 ${maxMembers}명 중 ${members.length}명 참여${names ? `: ${names}` : ""}`}
      data-tone={tone}
      data-full={members.length >= maxMembers}
      className="seat-row flex flex-wrap items-center gap-1.5"
    >
      {shown.map((member, index) => (
        <span
          key={member.userId}
          data-user={member.userId}
          className="seat"
          title={member.nickname}
          style={{
            ...box,
            "--i": index,
            backgroundColor: seatColor(member.userId),
            color: "var(--seat-foreground)",
          } as CSSProperties}
        >
          {seatInitial(member.nickname)}
          <svg aria-hidden="true" viewBox="0 0 40 40" className="seat-ring">
            <circle cx="20" cy="20" r="19" pathLength="1" />
          </svg>
        </span>
      ))}
      {Array.from({ length: openSeats }, (_, index) => (
        <span
          key={`open-${shown.length + index}`}
          data-open="true"
          data-next={waiting && index === 0}
          data-pop={popOpenSeats}
          className={`seat ${tone === "hero" ? "text-white" : "text-foreground"}`}
          style={{ ...box, "--i": shown.length + index } as CSSProperties}
        />
      ))}
      {more > 0 && (
        <span
          className={`pl-1 text-xs font-semibold tabular-nums ${tone === "hero" ? "text-white" : "text-muted-foreground"}`}
        >
          +{more}
        </span>
      )}
    </div>
  );
}
