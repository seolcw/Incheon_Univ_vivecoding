import { Suspense } from "react";
import { RoomScreen } from "@/components/room-screen";
import { LoadingState } from "@/components/states";

export default function RoomPage() {
  return (
    <Suspense fallback={<LoadingState message="강의실 정보를 불러오는 중이에요." skeletonClass="h-96 max-w-xl" />}>
      <RoomScreen />
    </Suspense>
  );
}
