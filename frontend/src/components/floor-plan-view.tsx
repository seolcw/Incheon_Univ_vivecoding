import Link from "next/link";
import { PLAN_VIEWBOX, type FloorPlan, type PlanCell } from "@/lib/floor-plans";
import { describeRoom, planCaption, ROOM_STATUS_META } from "@/lib/room-status";
import type { RoomStatus } from "@/lib/types";

const NUMBER_FONT = 18;
const CAPTION_FONT = 14;
/** 호수와 둘째 줄을 함께 넣을 수 있는 최소 칸 높이 */
const TWO_LINE_MIN_HEIGHT = 58;

const STRUCTURE_STYLE: Record<string, { fill: string; text?: string }> = {
  corridor: { fill: "fill-plan-corridor" },
  stairs: { fill: "fill-plan-structure", text: "계단" },
  toilet: { fill: "fill-plan-structure", text: "WC" },
  elevator: { fill: "fill-plan-structure", text: "EV" },
  unnumbered: { fill: "fill-plan-unavailable" },
};

function CellText({ cell, caption, className }: { cell: PlanCell; caption?: string; className: string }) {
  const centerX = cell.x + cell.w / 2;
  const centerY = cell.y + cell.h / 2;
  const showCaption = caption !== undefined && cell.h >= TWO_LINE_MIN_HEIGHT;
  return (
    <text textAnchor="middle" dominantBaseline="central" className={className}>
      <tspan x={centerX} y={showCaption ? centerY - 10 : centerY} fontSize={NUMBER_FONT} fontWeight="700">
        {cell.label}
      </tspan>
      {showCaption && (
        <tspan x={centerX} y={centerY + 11} fontSize={CAPTION_FONT}>
          {caption}
        </tspan>
      )}
    </text>
  );
}

function StructureCell({ cell }: { cell: PlanCell }) {
  if (cell.kind === "outline") {
    return (
      <g>
        <rect
          x={cell.x}
          y={cell.y}
          width={cell.w}
          height={cell.h}
          className="fill-none stroke-plan-structure"
          strokeWidth="1.5"
          strokeDasharray="6 5"
        />
        <text
          x={cell.x + cell.w / 2}
          y={cell.y + cell.h / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={CAPTION_FONT}
          className="fill-plan-text"
        >
          {cell.label}
        </text>
      </g>
    );
  }
  const style = STRUCTURE_STYLE[cell.kind];
  return (
    <g>
      <rect
        x={cell.x}
        y={cell.y}
        width={cell.w}
        height={cell.h}
        className={`${style.fill} stroke-background`}
        strokeWidth="1.5"
      />
      {style.text && (
        <text
          x={cell.x + cell.w / 2}
          y={cell.y + cell.h / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={CAPTION_FONT - 2}
          className="fill-plan-text"
        >
          {style.text}
        </text>
      )}
    </g>
  );
}

/** 호수는 있지만 API에 없는 방: 회색, 클릭 불가 */
function UnavailableRoomCell({ cell }: { cell: PlanCell }) {
  return (
    <g aria-label={`${cell.label}호, 강의실 정보 없음`} role="img">
      <rect
        x={cell.x}
        y={cell.y}
        width={cell.w}
        height={cell.h}
        className="fill-plan-unavailable stroke-background"
        strokeWidth="1.5"
      />
      <CellText cell={cell} className="fill-plan-text" />
    </g>
  );
}

function RoomCell({ cell, room, dimmed }: { cell: PlanCell; room: RoomStatus; dimmed: boolean }) {
  const meta = ROOM_STATUS_META[room.status];
  return (
    <Link
      href={`/rooms/${encodeURIComponent(room.id)}`}
      prefetch={false}
      aria-label={`${room.name}, ${room.status === "class" ? "" : `${meta.label}, `}${describeRoom(room)}`}
      className={`group outline-none ${dimmed ? "opacity-25" : ""}`}
    >
      <rect
        x={cell.x}
        y={cell.y}
        width={cell.w}
        height={cell.h}
        className={`${meta.fillClass} stroke-background group-hover:stroke-foreground group-focus-visible:stroke-foreground`}
        strokeWidth="1.5"
      />
      <CellText cell={cell} caption={planCaption(room)} className="fill-status-foreground" />
    </Link>
  );
}

/**
 * 도면형 층 화면. 폰에서는 칸이 눌릴 만큼 크게 유지하고 이 영역 안에서만 가로로 스크롤한다.
 * matchingRoomIds가 있으면 필터에 맞지 않는 방을 흐리게 표시한다.
 */
export function FloorPlanView({
  plan,
  rooms,
  matchingRoomIds,
}: {
  plan: FloorPlan;
  rooms: RoomStatus[];
  matchingRoomIds?: Set<string>;
}) {
  const roomsById = new Map(rooms.map((room) => [room.id, room]));
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={`${plan.floor}층 도면`}
      className="overflow-x-auto rounded-xl bg-plan-ground p-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <svg
        viewBox={`0 0 ${PLAN_VIEWBOX.w} ${PLAN_VIEWBOX.h}`}
        role="group"
        aria-label={`${plan.floor}층 강의실 배치`}
        className="mx-auto w-full max-w-3xl min-w-[620px]"
      >
        {plan.cells.map((cell) => {
          const key = cell.roomId ?? `${cell.kind}-${cell.x}-${cell.y}`;
          if (cell.kind !== "room") return <StructureCell key={key} cell={cell} />;
          const room = cell.roomId ? roomsById.get(cell.roomId) : undefined;
          if (!room) return <UnavailableRoomCell key={key} cell={cell} />;
          return (
            <RoomCell key={key} cell={cell} room={room} dimmed={matchingRoomIds ? !matchingRoomIds.has(room.id) : false} />
          );
        })}
        {plan.labels.map((label) => (
          <text
            key={label.text}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={NUMBER_FONT}
            fontWeight="700"
            className="fill-plan-text"
          >
            {label.text}
          </text>
        ))}
      </svg>
    </div>
  );
}
