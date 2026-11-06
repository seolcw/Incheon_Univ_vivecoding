import { meetupTimeRange } from "@/lib/meetup";
import { clockToMinutes, formatKstTime } from "@/lib/time";
import type { Meetup, ScheduleItem } from "@/lib/types";

const DAY_START = clockToMinutes("09:00");
const DAY_END = clockToMinutes("22:00");
const PX_PER_MINUTE = 0.7;
const MIN_BLOCK_HEIGHT = 26;
const HOURS = Array.from({ length: 14 }, (_, index) => 9 + index);

const position = (minutes: number) => (minutes - DAY_START) * PX_PER_MINUTE;

function TimelineBlock({ startAt, endAt, label, className }: { startAt: string; endAt: string; label: string; className: string }) {
  const start = clockToMinutes(formatKstTime(startAt));
  const end = clockToMinutes(formatKstTime(endAt));
  return (
    <li
      className={`absolute right-1 left-12 overflow-hidden rounded-md px-2 py-1 text-sm ${className}`}
      style={{ top: position(start), height: Math.max((end - start) * PX_PER_MINUTE, MIN_BLOCK_HEIGHT) }}
    >
      <span className="font-medium">{label}</span>{" "}
      <span className="tabular-nums">{meetupTimeRange({ startAt, endAt })}</span>
    </li>
  );
}

/** 운영 시간(09–22시) 안에 수업·모임과 현재 시각을 비례 높이로 그린다. */
export function RoomTimeline({ schedule, meetups, at }: { schedule: ScheduleItem[]; meetups: Meetup[]; at: string }) {
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
      {/* 현재 시각 선은 블록 아래에 깔아 블록의 글자를 가리지 않게 한다. 점은 블록 왼쪽이라 항상 보인다. */}
      {showNow && (
        <div
          className="absolute right-0 left-10 flex items-center"
          style={{ top: position(now) - 4 }}
          role="img"
          aria-label={`현재 시각 ${formatKstTime(at)}`}
        >
          <span className="size-2 shrink-0 rounded-full bg-foreground" />
          <span className="h-0.5 flex-1 bg-foreground" />
        </div>
      )}
      <ol>
        {schedule.map((item) => (
          <TimelineBlock
            key={item.startAt}
            startAt={item.startAt}
            endAt={item.endAt}
            label={item.title}
            className="bg-status-class text-status-foreground"
          />
        ))}
        {meetups.map((meetup) => (
          <TimelineBlock
            key={meetup.id}
            startAt={meetup.startAt}
            endAt={meetup.endAt}
            label={meetup.title}
            className="bg-status-meetup text-status-foreground"
          />
        ))}
      </ol>
    </div>
  );
}
