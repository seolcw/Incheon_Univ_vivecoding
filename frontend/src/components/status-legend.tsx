import { BUILDING_LEVEL_META, ROOM_STATUS_META } from "@/lib/room-status";

function LegendItem({ fillClass, label }: { fillClass: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <svg aria-hidden="true" viewBox="0 0 10 10" className="size-3 shrink-0">
        <rect width="10" height="10" rx="2" className={fillClass} />
      </svg>
      {label}
    </li>
  );
}

function Legend({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">{children}</ul>
    </section>
  );
}

export function BuildingLegend() {
  return (
    <Legend title="건물 색 범례">
      {Object.entries(BUILDING_LEVEL_META).map(([level, meta]) => (
        <LegendItem key={level} fillClass={meta.fillClass} label={meta.label} />
      ))}
      <LegendItem fillClass="fill-plan-structure" label="준비 중" />
    </Legend>
  );
}

export function RoomStatusLegend() {
  return (
    <Legend title="강의실 상태 범례">
      {Object.entries(ROOM_STATUS_META).map(([status, meta]) => (
        <LegendItem key={status} fillClass={meta.fillClass} label={meta.label} />
      ))}
      <LegendItem fillClass="fill-plan-structure" label="강의실 정보 없음" />
    </Legend>
  );
}
