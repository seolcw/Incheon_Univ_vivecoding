"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FloorElevator } from "@/components/floor-elevator";
import { FloorPlanView } from "@/components/floor-plan-view";
import { FreeTimeSlider } from "@/components/free-time-slider";
import { RollingNumber } from "@/components/rolling-number";
import { RoomCard } from "@/components/room-card";
import { ErrorState, LoadingState, NotFoundState, RefreshFailedNote } from "@/components/states";
import { RoomStatusLegend } from "@/components/status-legend";
import { Button } from "@/components/ui/button";
import { useBuildings, useRooms } from "@/lib/api";
import { getFloorPlan } from "@/lib/floor-plans";
import { settleFlight } from "@/lib/room-flight";
import { describeRoom, floorLabel, ROOM_STATUS_META } from "@/lib/room-status";
import type { RoomStatus, RoomStatusValue } from "@/lib/types";

const LOADING_MESSAGE = "강의실 상태를 확인하는 중이에요.";
const ERROR_MESSAGE = "강의실 정보를 불러오지 못했어요.";
const NOT_FOUND_MESSAGE = "건물을 찾을 수 없어요.";
const COUNTED_STATUSES: RoomStatusValue[] = ["empty", "meetup", "class", "closed"];

function PlanReadout({
  floor,
  inspected,
  minFreeMinutes,
  floorRooms,
  matchingCount,
}: {
  floor: number;
  inspected: RoomStatus | null;
  minFreeMinutes: number;
  floorRooms: RoomStatus[];
  matchingCount: number;
}) {
  return (
    <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1">
      <p className="min-w-0 text-sm font-medium text-white">
        {inspected ? (
          <>
            <strong className="font-bold">{inspected.name}</strong> {describeRoom(inspected)}
          </>
        ) : minFreeMinutes > 0 ? (
          `${floorLabel(floor)}에서 ${minFreeMinutes}분 이상 비는 방 ${matchingCount}곳`
        ) : (
          `${floorLabel(floor)} 도면`
        )}
      </p>
      <ul className="flex shrink-0 items-center gap-3 text-[0.8125rem] font-semibold text-white tabular-nums">
        {COUNTED_STATUSES.map((status) => {
          const count = floorRooms.filter((room) => room.status === status).length;
          if (count === 0) return null;
          return (
            <li key={status} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={`size-2 rounded-full ${ROOM_STATUS_META[status].dotClass}`} />
              <span className="sr-only">{ROOM_STATUS_META[status].label}</span>
              {count}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function BuildingScreen() {
  const { buildingId } = useParams<{ buildingId: string }>();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [minFreeMinutes, setMinFreeMinutes] = useState(0);
  const [inspected, setInspected] = useState<RoomStatus | null>(null);

  useEffect(() => {
    settleFlight();
  }, []);

  const buildings = useBuildings();
  const building = buildings.data?.buildings.find((item) => item.id === buildingId);

  const floorParam = Number(searchParams.get("floor"));
  const floor = building?.floors.includes(floorParam) ? floorParam : building?.floors[0];

  // 건물 전체를 한 번에 받아 층 전환과 필터가 요청 없이 바로 반응하게 한다. 필터는 서버와 같은 freeMinutes ≥ 값이다.
  const allRooms = useRooms(building ? { buildingId } : null);

  if (!buildings.data && buildings.error) {
    return <ErrorState message={ERROR_MESSAGE} onRetry={() => buildings.mutate()} />;
  }
  if (!buildings.data) return <LoadingState message={LOADING_MESSAGE} skeletonClass="h-96" />;
  if (!building || floor === undefined || allRooms.error?.status === 404) {
    return <NotFoundState message={NOT_FOUND_MESSAGE} />;
  }

  function selectFloor(nextFloor: number) {
    setInspected(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("floor", String(nextFloor));
    // 서버를 거치지 않아 도면이 누르는 즉시 움직인다. Next는 이 호출을 useSearchParams에 반영한다.
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }

  const plan = getFloorPlan(buildingId, floor);
  const summary = building.floorSummary.find((item) => item.floor === floor);
  const floorRooms = allRooms.data?.rooms.filter((room) => room.floor === floor);
  const isFiltering = minFreeMinutes > 0;
  const cardRooms = isFiltering ? floorRooms?.filter((room) => room.freeMinutes >= minFreeMinutes) : floorRooms;
  const refreshFailed = allRooms.error || buildings.error;

  return (
    <div className="grid min-w-0 gap-x-8 gap-y-5 xl:grid-cols-[288px_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-[5.25rem] xl:self-start">
        <Link
          href="/"
          prefetch={false}
          className="group flex w-fit items-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground outline-none transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft
            aria-hidden="true"
            className="size-4 transition-transform duration-300 ease-settle group-hover:-translate-x-0.5"
          />
          지도
        </Link>
        <div>
          <h1 className="flex items-baseline gap-2.5 font-bold xl:flex-col xl:gap-0">
            <span className="text-2xl tracking-[-0.03em]">{building.name}</span>
            <span className="flex items-baseline text-[clamp(3.5rem,14vw,6rem)] leading-none font-extrabold tracking-[-0.04em] xl:-ml-1">
              {floor > 0 ? <RollingNumber value={floor} /> : floorLabel(floor).replace("층", "")}
              <span className="text-[0.46em] font-bold tracking-[-0.03em]">층</span>
            </span>
          </h1>
          {summary && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              {floorLabel(floor)} 수업 없는 강의실{" "}
              <strong className="font-semibold text-foreground tabular-nums">
                {summary.emptyCount}/{summary.totalCount}
              </strong>
              개(모임 포함)
            </p>
          )}
        </div>
        <FloorElevator
          floors={building.floors}
          floor={floor}
          summaries={building.floorSummary}
          rooms={allRooms.data?.rooms}
          onSelect={selectFloor}
        />
        <FreeTimeSlider value={minFreeMinutes} onChange={setMinFreeMinutes} />
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        {refreshFailed && allRooms.data && <RefreshFailedNote />}

        {!allRooms.data && allRooms.error ? (
          <ErrorState message={ERROR_MESSAGE} onRetry={() => allRooms.mutate()} />
        ) : plan ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 rounded-[28px] bg-stage p-3 text-white sm:p-4 md:rounded-[32px] md:p-5">
              {allRooms.data && floorRooms ? (
                <PlanReadout
                  floor={floor}
                  inspected={inspected}
                  minFreeMinutes={minFreeMinutes}
                  floorRooms={floorRooms}
                  matchingCount={cardRooms?.length ?? 0}
                />
              ) : (
                <div className="px-1 text-sm">
                  <LoadingState message={LOADING_MESSAGE} />
                </div>
              )}
              <FloorPlanView
                plan={plan}
                rooms={floorRooms}
                matchingRoomIds={isFiltering && cardRooms ? new Set(cardRooms.map((room) => room.id)) : undefined}
                onInspect={setInspected}
              />
            </div>
            <RoomStatusLegend />
          </div>
        ) : (
          <p className="rounded-[28px] bg-muted p-6 text-sm text-muted-foreground">
            이 건물의 도면은 준비 중이에요. 강의실 목록으로 확인해 주세요.
          </p>
        )}

        {floorRooms && (
          <section aria-label={`${floorLabel(floor)} 강의실 목록`} className="flex flex-col gap-3 pt-3">
            <h2 className="text-lg font-bold">강의실 목록</h2>
            {cardRooms?.length === 0 && (
              <div className="rise flex flex-col items-start gap-3 rounded-[22px] bg-muted p-5">
                <p className="font-medium">조건에 맞는 강의실이 없어요.</p>
                <Button variant="outline" onClick={() => setMinFreeMinutes(0)}>
                  필터 초기화
                </Button>
              </div>
            )}
            {cardRooms && cardRooms.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {cardRooms.map((room, index) => (
                  <RoomCard key={room.id} room={room} index={index} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
