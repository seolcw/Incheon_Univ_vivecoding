import { BUILDING_LEVEL_META, ROOM_STATUS_META } from "@/lib/room-status";

function LegendItem({ dotClass, fillClass, label }: { dotClass?: string; fillClass?: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5 whitespace-nowrap">
      {fillClass ? (
        <svg aria-hidden="true" viewBox="0 0 10 10" className="size-2.5 shrink-0">
          <circle cx="5" cy="5" r="5" className={fillClass} />
        </svg>
      ) : (
        <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${dotClass}`} />
      )}
      {label}
    </li>
  );
}

function Legend({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-muted-foreground">{children}</ul>
    </section>
  );
}

export function BuildingLegend() {
  return (
    <Legend title="건물 색 범례">
      {Object.entries(BUILDING_LEVEL_META).map(([level, meta]) => (
        <LegendItem key={level} fillClass={meta.fillClass} label={meta.label} />
      ))}
    </Legend>
  );
}

export function RoomStatusLegend() {
  return (
    <Legend title="강의실 상태 범례">
      {Object.entries(ROOM_STATUS_META).map(([status, meta]) => (
        <LegendItem key={status} dotClass={meta.dotClass} label={meta.label} />
      ))}
      <LegendItem dotClass="bg-stage-raised" label="강의실 정보 없음" />
    </Legend>
  );
}
