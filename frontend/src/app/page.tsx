"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { CampusMap } from "@/components/campus-map";
import { FloorStack } from "@/components/floor-stack";
import { RollingNumber } from "@/components/rolling-number";
import { ErrorState, LoadingState, RefreshFailedNote } from "@/components/states";
import { BuildingLegend } from "@/components/status-legend";
import { useBuildings, useRooms } from "@/lib/api";
import { DEMO_BUILDING_BLOCK, DEMO_BUILDING_ID } from "@/lib/demo-building";
import { formatKstTime, KST_OFFSET_MS } from "@/lib/time";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function dateLabel(iso: string) {
  const date = new Date(Date.parse(iso) + KST_OFFSET_MS);
  return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일 ${WEEKDAYS[date.getUTCDay()]}요일 ${formatKstTime(iso)}`;
}

export default function HomePage() {
  const { data, error, mutate } = useBuildings();
  // 층 목록의 점과 다음 화면의 도면이 같은 조회를 쓴다.
  const rooms = useRooms(data ? { buildingId: DEMO_BUILDING_ID } : null);

  if (!data && error) return <ErrorState message="캠퍼스 정보를 불러오지 못했어요." onRetry={() => mutate()} />;
  if (!data) return <LoadingState message="캠퍼스 현황을 불러오는 중이에요." skeletonClass="aspect-[10/9] max-w-2xl" />;

  // 지도와 상단 숫자는 시연 건물만 쓴다.
  const buildings = data.buildings
    .filter((building) => building.id === DEMO_BUILDING_ID)
    .map((building) => ({ ...building, map: DEMO_BUILDING_BLOCK }));
  if (buildings.length === 0) {
    return <p className="rise rounded-[28px] bg-muted p-8 text-2xl font-bold tracking-[-0.028em]">캠퍼스 정보가 없어요.</p>;
  }

  const emptyTotal = buildings.reduce((sum, building) => sum + building.emptyCount, 0);
  const building = buildings[0];

  return (
    <div className="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,672px)] lg:grid-rows-[auto_1fr]">
      <div className="flex flex-col gap-4 lg:pt-8">
        <h1 className="font-bold">
          {emptyTotal > 0 ? (
            <>
              <span className="block text-xl tracking-[-0.03em] sm:text-2xl">지금 수업 없는 강의실</span>
              <span className="mt-1 flex items-baseline gap-1 text-[clamp(5rem,20vw,7.5rem)] leading-none font-extrabold tracking-[-0.045em] text-status-empty">
                <RollingNumber value={emptyTotal} />
                <span className="text-[0.42em] font-bold tracking-[-0.03em]">개</span>
              </span>
            </>
          ) : (
            <span className="block text-4xl leading-tight tracking-[-0.035em] sm:text-5xl">수업 없는 강의실이 없어요.</span>
          )}
        </h1>
        <p className="text-muted-foreground">
          {building.name} {building.totalCount}개 중, 모임 중인 방 포함 · {dateLabel(data.at)} 기준
        </p>
        {building.meetupCount > 0 && (
          <Link
            href="/meetups"
            prefetch={false}
            className="press group flex w-fit items-center gap-2 rounded-full bg-status-meetup py-2 pr-4 pl-3 text-sm font-semibold text-status-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span aria-hidden="true" className="live-dot" />
            <Users aria-hidden="true" className="size-4" />
            지금 모임 {building.meetupCount}개
          </Link>
        )}
        {error && <RefreshFailedNote />}
      </div>

      <div className="flex min-w-0 flex-col gap-3 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <CampusMap buildings={buildings} at={data.at} />
        <BuildingLegend />
      </div>

      <div className="min-w-0 lg:col-start-1 lg:row-start-2">
        <FloorStack building={building} rooms={rooms.data?.rooms} />
      </div>
    </div>
  );
}
