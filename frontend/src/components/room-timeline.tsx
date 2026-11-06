import type { CSSProperties } from "react";
import { meetupTimeRange } from "@/lib/meetup";
import { clockToMinutes, formatKstTime } from "@/lib/time";
import type { Meetup, ScheduleItem } from "@/lib/types";

const DAY_START = clockToMinutes("09:00");
const DAY_END = clockToMinutes("22:00");
const PX_PER_MINUTE = 0.7;
const MIN_BLOCK_HEIGHT = 30;
const HOURS = Array.from({ length: 14 }, (_, index) => 9 + index);

const position = (minutes: number) => (minutes - DAY_START) * PX_PER_MINUTE;

function TimelineBlock({
  startAt,
  endAt,
  label,
  className,
  order,
}: {
  startAt: string;
  endAt: string;
  label: string;
  className: string;
  order: number;
}) {
  const start = clockToMinutes(formatKstTime(startAt));
  const end = clockToMinutes(formatKstTime(endAt));
  return (
    <li
      className={`timeline-block absolute right-0 left-14 overflow-hidden rounded-xl px-3 py-1.5 text-sm ${className}`}
      style={
        {
          top: position(start),
          height: Math.max((end - start) * PX_PER_MINUTE, MIN_BLOCK_HEIGHT),
          "--i": order,
        } as CSSProperties
      }
    >
      <span className="font-semibold">{label}</span>{" "}
      <span className="tabular-nums">{meetupTimeRange({ startAt, endAt })}</span>
    </li>
  );
}

/** 운영 시간(09–22시) 안에 수업·모임과 현재 시각을 비례 높이로 그린다. freeUntil이 있으면 지금부터 그때까지 비는 구간도 칠한다. */
export function RoomTimeline({
  schedule,
  meetups,
  at,
  freeUntil,
}: {
  schedule: ScheduleItem[];
  meetups: Meetup[];
  at: string;
  freeUntil?: string | null;
}) {
  const now = clockToMinutes(formatKstTime(at));
  const showNow = now >= DAY_START && now <= DAY_END;
  return (
    <div className="relative" style={{ height: (DAY_END - DAY_START) * PX_PER_MINUTE + 12 }}>
      <div aria-hidden="true">
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="absolute right-0 left-0 flex items-center gap-2 text-xs text-muted-foreground tabular-nums"
            style={{ top: position(hour * 60) - 8 }}
          >
            <span className="w-10 shrink-0 text-right">{String(hour).padStart(2, "0")}:00</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        ))}
      </div>
      <ol>
        {showNow && freeUntil && (
          <TimelineBlock
            startAt={at}
            endAt={freeUntil}
            label="비어있음"
            className="bg-status-empty/12 text-[color-mix(in_oklch,var(--status-empty),black_18%)]"
            order={0}
          />
        )}
        {schedule.map((item, index) => (
          <TimelineBlock
            key={item.startAt}
            startAt={item.startAt}
            endAt={item.endAt}
            label={item.title}
            className="bg-status-class text-status-foreground"
            order={index + 1}
          />
        ))}
        {meetups.map((meetup, index) => (
          <TimelineBlock
            key={meetup.id}
            startAt={meetup.startAt}
            endAt={meetup.endAt}
            label={meetup.title}
            className="bg-status-meetup text-status-foreground"
            order={schedule.length + index + 1}
          />
        ))}
      </ol>
      {/* 현재 시각 선은 블록의 글자를 가리지 않는 얇은 선으로 맨 위에 둔다. */}
      {showNow && (
        <div
          className="pointer-events-none absolute right-0 left-11 flex items-center"
          style={{ top: position(now) - 4 }}
          role="img"
          aria-label={`현재 시각 ${formatKstTime(at)}`}
        >
          <span className="live-dot size-2 shrink-0 text-foreground" />
          <span className="h-px flex-1 bg-foreground" />
        </div>
      )}
    </div>
  );
}
