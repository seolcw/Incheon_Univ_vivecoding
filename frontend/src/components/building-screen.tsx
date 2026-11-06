"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FloorPlanView } from "@/components/floor-plan-view";
import { RoomCard } from "@/components/room-card";
import { ErrorState, LoadingState, NotFoundState, RefreshFailedNote } from "@/components/states";
import { RoomStatusLegend } from "@/components/status-legend";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBuildings, useRooms } from "@/lib/api";
import { getFloorPlan } from "@/lib/floor-plans";
import { floorLabel } from "@/lib/room-status";

const LOADING_MESSAGE = "강의실 상태를 확인하는 중이에요.";
const ERROR_MESSAGE = "강의실 정보를 불러오지 못했어요.";
const NOT_FOUND_MESSAGE = "건물을 찾을 수 없어요.";
const FILTER_OPTIONS = [
  { value: 0, label: "전체" },
  { value: 30, label: "30분" },
  { value: 60, label: "60분" },
  { value: 120, label: "120분" },
];

export function BuildingScreen() {
  const { buildingId } = useParams<{ buildingId: string }>();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [minFreeMinutes, setMinFreeMinutes] = useState(0);

  const buildings = useBuildings();
  const building = buildings.data?.buildings.find((item) => item.id === buildingId);

  const floorParam = Number(searchParams.get("floor"));
  const floor = building?.floors.includes(floorParam) ? floorParam : building?.floors[0];

  // 도면은 필터와 상관없이 층 전체를 칠하고, 카드는 필터 결과만 보여 준다. 필터가 없으면 키가 같아 요청은 하나다.
  const floorQuery = building && floor !== undefined ? { buildingId, floor } : null;
  const allRooms = useRooms(floorQuery);
  const filteredRooms = useRooms(floorQuery && minFreeMinutes > 0 ? { ...floorQuery, minFreeMinutes } : floorQuery);

  if (!buildings.data && buildings.error) {
    return <ErrorState message={ERROR_MESSAGE} onRetry={() => buildings.mutate()} />;
  }
  if (!buildings.data) return <LoadingState message={LOADING_MESSAGE} skeletonClass="h-96 max-w-3xl" />;
  if (!building || floor === undefined || allRooms.error?.status === 404) {
    return <NotFoundState message={NOT_FOUND_MESSAGE} />;
  }

  function selectFloor(nextFloor: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("floor", String(nextFloor));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const plan = getFloorPlan(buildingId, floor);
  const summary = building.floorSummary.find((item) => item.floor === floor);
  const cardRooms = filteredRooms.data?.rooms;
  const isFiltering = minFreeMinutes > 0;
  const refreshFailed = allRooms.error || filteredRooms.error || buildings.error;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">{building.name}</h1>
        {summary && (
          <p className="text-sm text-muted-foreground">
            {floorLabel(floor)} 수업 없는 강의실 {summary.emptyCount}/{summary.totalCount}개(모임 포함)
          </p>
        )}
      </div>

      <Tabs value={floor} onValueChange={(value) => selectFloor(Number(value))}>
        <TabsList aria-label="층 선택">
          {building.floors.map((item) => (
            <TabsTrigger key={item} value={item} className="px-3">
              {floorLabel(item)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div role="group" aria-label="최소 여유 시간" className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">최소 여유 시간</span>
        {FILTER_OPTIONS.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={minFreeMinutes === option.value ? "default" : "outline"}
            aria-pressed={minFreeMinutes === option.value}
            onClick={() => setMinFreeMinutes(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {refreshFailed && (allRooms.data || filteredRooms.data) && <RefreshFailedNote />}

      {!allRooms.data && allRooms.error && (
        <ErrorState message={ERROR_MESSAGE} onRetry={() => allRooms.mutate()} />
      )}
      {!allRooms.data && !allRooms.error && <LoadingState message={LOADING_MESSAGE} skeletonClass="h-96 max-w-3xl" />}

      {allRooms.data && (
        <>
          {plan ? (
            <>
              <FloorPlanView
                plan={plan}
                rooms={allRooms.data.rooms}
                matchingRoomIds={isFiltering && cardRooms ? new Set(cardRooms.map((room) => room.id)) : undefined}
              />
              <RoomStatusLegend />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">이 건물의 도면은 준비 중이에요. 강의실 목록으로 확인해 주세요.</p>
          )}

          <section aria-label={`${floorLabel(floor)} 강의실 목록`} className="flex flex-col gap-3">
            <h2 className="font-bold">강의실 목록</h2>
            {!cardRooms && !filteredRooms.error && <LoadingState message={LOADING_MESSAGE} />}
            {!cardRooms && filteredRooms.error && (
              <ErrorState message={ERROR_MESSAGE} onRetry={() => filteredRooms.mutate()} />
            )}
            {cardRooms?.length === 0 && (
              <div className="flex flex-col items-start gap-3">
                <p>조건에 맞는 강의실이 없어요.</p>
                <Button variant="outline" onClick={() => setMinFreeMinutes(0)}>
                  필터 초기화
                </Button>
              </div>
            )}
            {cardRooms && cardRooms.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cardRooms.map((room) => (
                  <RoomCard key={room.id} room={room} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
