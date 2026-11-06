import { clockToMinutes, formatKstTime } from "@/lib/time";
import type { RoomDetail } from "@/lib/types";

const DAY_START = 9 * 60;
const DAY_END = 22 * 60;
const HOUR_MARKS = [9, 12, 15, 18, 21];

const toMinutes = (iso: string) => clockToMinutes(formatKstTime(iso));
const position = (minutes: number) =>
  ((Math.min(Math.max(minutes, DAY_START), DAY_END) - DAY_START) / (DAY_END - DAY_START)) * 100;

function span(startMinutes: number, endMinutes: number) {
  return { left: `${position(startMinutes)}%`, width: `${position(endMinutes) - position(startMinutes)}%` };
}

/** 하루를 한 줄로 편 막대. 지금부터 다음 수업까지 비는 시간이 차오른다. */
export function TimeRibbon({ room, at }: { room: RoomDetail; at: string }) {
  const now = toMinutes(at);
  const showNow = now >= DAY_START && now <= DAY_END;
  const hasFreeSpan = (room.status === "empty" || room.status === "meetup") && room.freeUntil;
  const needle = position(now);
  const needleAlign = needle < 12 ? "translate-x-0" : needle > 88 ? "-translate-x-full" : "-translate-x-1/2";

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="img"
        aria-label={`오늘 수업 ${room.todaySchedule.length}개, 모임 ${room.meetups.length}개${
          showNow ? `, 지금 ${formatKstTime(at)}` : ""
        }`}
        className="relative mt-6"
      >
        <div className="relative h-12 overflow-hidden rounded-2xl bg-white/14 sm:h-14">
          {HOUR_MARKS.slice(1).map((hour) => (
            <span
              key={hour}
              aria-hidden="true"
              className="absolute inset-y-0 w-px bg-white/14"
              style={{ left: `${position(hour * 60)}%` }}
            />
          ))}
          {hasFreeSpan && room.freeUntil && (
            <span className="ribbon-free absolute inset-y-0 bg-white/34" style={span(now, toMinutes(room.freeUntil))} />
          )}
          {room.todaySchedule.map((item) => (
            <span
              key={item.startAt}
              className="absolute inset-y-0 bg-[oklch(0.18_0.02_265/0.48)]"
              style={span(toMinutes(item.startAt), toMinutes(item.endAt))}
            />
          ))}
          {room.meetups.map((meetup) => (
            <span
              key={meetup.id}
              className="absolute inset-y-1.5 rounded-lg bg-white"
              style={span(toMinutes(meetup.startAt), toMinutes(meetup.endAt))}
            />
          ))}
        </div>
        {showNow && (
          <span aria-hidden="true" className="absolute -top-1 bottom-0 w-0.5 rounded-full bg-white" style={{ left: `${needle}%` }}>
            <span
              className={`absolute bottom-full mb-1 rounded-full bg-white px-2 py-0.5 text-xs font-bold whitespace-nowrap text-foreground tabular-nums ${needleAlign}`}
            >
              지금 {formatKstTime(at)}
            </span>
          </span>
        )}
      </div>
      <div aria-hidden="true" className="relative h-4 text-xs font-medium text-white tabular-nums">
        {HOUR_MARKS.map((hour) => (
          <span key={hour} className="absolute" style={{ left: `${position(hour * 60)}%` }}>
            {String(hour).padStart(2, "0")}
          </span>
        ))}
      </div>
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-white">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-[oklch(0.18_0.02_265/0.48)]" />
          수업
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-white" />
          모임
        </li>
        {hasFreeSpan && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-white/40" />
            다음 수업까지
          </li>
        )}
      </ul>
    </div>
  );
}
