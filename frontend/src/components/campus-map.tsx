"use client";

import { ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useState, useSyncExternalStore, type ReactNode } from "react";
import { BUILDING_LEVEL_META, buildingLevel } from "@/lib/room-status";
import type { BuildingSummary } from "@/lib/types";

interface CampusMapProps {
  buildings: BuildingSummary[];
  at: string;
}

function MapSkeleton() {
  return <div aria-hidden="true" className="aspect-[10/9] w-full max-w-2xl animate-pulse rounded-xl bg-muted" />;
}

// three가 커서 첫 화면 번들에 넣지 않는다.
const CampusMapScene = dynamic(() => import("@/components/campus-map-scene").then((module) => module.CampusMapScene), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

let webgl2Support: boolean | undefined;

/** three는 WebGL2만 쓴다. 확인용 컨텍스트는 바로 돌려준다. */
function supportsWebgl2() {
  if (webgl2Support === undefined) {
    const context = document.createElement("canvas").getContext("webgl2");
    webgl2Support = context !== null;
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  }
  return webgl2Support;
}

const subscribeNever = () => () => {};

/** 씬 청크 로드나 그리기에 실패하면 SVG 지도로 내려간다. */
class SceneBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFail();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function CampusMap({ buildings, at }: CampusMapProps) {
  const webgl = useSyncExternalStore(subscribeNever, supportsWebgl2, () => null);
  const [sceneFailed, setSceneFailed] = useState(false);

  if (webgl === null) return <MapSkeleton />;
  if (!webgl || sceneFailed) return <CampusMapSvg buildings={buildings} at={at} />;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-2">
      <SceneBoundary onFail={() => setSceneFailed(true)}>
        <CampusMapScene buildings={buildings} at={at} onContextLost={() => setSceneFailed(true)} />
      </SceneBoundary>
      {buildings.map((building) => (
        <Link
          key={building.id}
          href={`/buildings/${building.id}`}
          prefetch={false}
          aria-label={buildingAriaLabel(building)}
          className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <svg aria-hidden="true" viewBox="0 0 10 10" className="size-3 shrink-0">
            <rect width="10" height="10" rx="2" className={BUILDING_LEVEL_META[buildingLevel(building, at)].fillClass} />
          </svg>
          {building.name}
          <span className="font-normal text-muted-foreground tabular-nums">
            {building.emptyCount}/{building.totalCount}
          </span>
          <ChevronRight aria-hidden="true" className="ml-auto size-4 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}

function buildingAriaLabel(building: BuildingSummary) {
  return `${building.name}, 강의실 ${building.totalCount}개 중 ${building.emptyCount}개 수업 없음`;
}

/** 아직 도면이 없는 건물. API와 무관하게 프론트에 고정한다(docs/scope-change.md). */
const PREPARING_BLOCKS = [
  { x: 56, y: 18, w: 30, h: 22 },
  { x: 30, y: 60, w: 30, h: 22 },
];

/** WebGL을 쓸 수 없을 때의 평면 지도 */
function CampusMapSvg({ buildings, at }: CampusMapProps) {
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
            aria-label={buildingAriaLabel({ map, ...building })}
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
