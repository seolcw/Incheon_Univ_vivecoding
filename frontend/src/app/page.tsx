"use client";

import { CampusMap } from "@/components/campus-map";
import { ErrorState, LoadingState, RefreshFailedNote } from "@/components/states";
import { BuildingLegend } from "@/components/status-legend";
import { useBuildings } from "@/lib/api";

export default function HomePage() {
  const { data, error, mutate } = useBuildings();

  if (!data && error) return <ErrorState message="캠퍼스 정보를 불러오지 못했어요." onRetry={() => mutate()} />;
  if (!data) return <LoadingState message="캠퍼스 현황을 불러오는 중이에요." skeletonClass="aspect-[10/9] max-w-2xl" />;
  if (data.buildings.length === 0) return <p>캠퍼스 정보가 없어요.</p>;

  const emptyTotal = data.buildings.reduce((sum, building) => sum + building.emptyCount, 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">
        {emptyTotal > 0 ? `수업 없는 강의실 ${emptyTotal}개(모임 포함)` : "수업 없는 강의실이 없어요."}
      </h1>
      {error && <RefreshFailedNote />}
      <CampusMap buildings={data.buildings} at={data.at} />
      <BuildingLegend />
    </div>
  );
}
