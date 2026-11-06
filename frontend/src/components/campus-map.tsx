import Link from "next/link";
import { BUILDING_LEVEL_META, buildingLevel } from "@/lib/room-status";
import type { BuildingSummary } from "@/lib/types";

/** 아직 도면이 없는 건물. API와 무관하게 프론트에 고정한다(docs/scope-change.md). */
const PREPARING_BLOCKS = [
  { x: 56, y: 18, w: 30, h: 22 },
  { x: 30, y: 60, w: 30, h: 22 },
];

export function CampusMap({ buildings, at }: { buildings: BuildingSummary[]; at: string }) {
  return (
    <svg viewBox="0 0 100 90" role="group" aria-label="캠퍼스 지도" className="w-full max-w-2xl rounded-xl">
      <rect width="100" height="90" className="fill-plan-ground" />
      <path d="M0 48 H100 M46 0 V90" className="fill-none stroke-plan-corridor" strokeWidth="3" aria-hidden="true" />

      {PREPARING_BLOCKS.map((block) => (
        <g key={`${block.x}-${block.y}`}>
          <rect x={block.x} y={block.y} width={block.w} height={block.h} rx="1.5" className="fill-plan-structure" />
          <text
            x={block.x + block.w / 2}
            y={block.y + block.h / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="3.4"
            className="fill-plan-text"
          >
            준비 중
          </text>
        </g>
      ))}

      {buildings.map(({ map, ...building }) => {
        const meta = BUILDING_LEVEL_META[buildingLevel({ map, ...building }, at)];
        const centerX = map.x + map.w / 2;
        const centerY = map.y + map.h / 2;
        return (
          <Link
            key={building.id}
            href={`/buildings/${building.id}`}
            prefetch={false}
            aria-label={`${building.name}, 강의실 ${building.totalCount}개 중 ${building.emptyCount}개 수업 없음`}
            className="group outline-none"
          >
            <rect
              x={map.x}
              y={map.y}
              width={map.w}
              height={map.h}
              rx="1.5"
              className={`${meta.fillClass} stroke-foreground stroke-0 group-hover:stroke-[0.5] group-focus-visible:stroke-[0.8]`}
            />
            <text
              x={centerX}
              y={centerY - 2.6}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="4.2"
              fontWeight="700"
              className={meta.textClass}
            >
              {building.name}
            </text>
            <text
              x={centerX}
              y={centerY + 3}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="3.2"
              className={meta.textClass}
            >
              {building.emptyCount}/{building.totalCount}
            </text>
          </Link>
        );
      })}
    </svg>
  );
}
