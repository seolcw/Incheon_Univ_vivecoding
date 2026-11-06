"use client";

import { Button } from "@/components/ui/button";
import { useBuildings } from "@/lib/api";

// 임시 화면: 지도는 다음 단계에서 만든다. 지금은 조회 흐름과 SPEC v1 §4의 상태 문구만 확인한다.
export default function HomePage() {
  const { data, error, mutate } = useBuildings();

  if (!data && error) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p>캠퍼스 정보를 불러오지 못했어요.</p>
        <Button variant="outline" onClick={() => mutate()}>
          재시도
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <p>캠퍼스 현황을 불러오는 중이에요.</p>
        <div aria-hidden="true" className="h-48 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (data.buildings.length === 0) return <p>캠퍼스 정보가 없어요.</p>;

  const emptyTotal = data.buildings.reduce((sum, building) => sum + building.emptyCount, 0);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-bold">
        {emptyTotal > 0 ? `수업 없는 강의실 ${emptyTotal}개(모임 포함)` : "수업 없는 강의실이 없어요."}
      </h1>
      {error && (
        <p role="status" className="text-sm text-muted-foreground">
          갱신에 실패했어요.
        </p>
      )}
      <p className="text-sm text-muted-foreground">캠퍼스 지도를 준비하고 있어요.</p>
    </div>
  );
}
