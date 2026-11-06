import { Suspense } from "react";
import { BuildingScreen } from "@/components/building-screen";
import { LoadingState } from "@/components/states";

export default function BuildingPage() {
  return (
    <Suspense fallback={<LoadingState message="강의실 상태를 확인하는 중이에요." skeletonClass="h-96 max-w-3xl" />}>
      <BuildingScreen />
    </Suspense>
  );
}
