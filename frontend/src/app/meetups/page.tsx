"use client";

import { MeetupCard } from "@/components/meetup-card";
import { MeetupFormDialog } from "@/components/meetup-form-dialog";
import { MockWriteNotice } from "@/components/mock-write-notice";
import { ErrorState, LoadingState, RefreshFailedNote } from "@/components/states";
import { currentAtIso, useDemoAt, useMeetups } from "@/lib/api";

export default function MeetupsPage() {
  const { data, error, mutate } = useMeetups();
  const demoAt = useDemoAt();

  if (!data && error) return <ErrorState message="모임을 불러오지 못했어요." onRetry={() => mutate()} />;
  if (!data) return <LoadingState message="모임을 불러오는 중이에요." skeletonClass="h-40 max-w-xl" />;

  // 데이터가 있을 때만 계산한다. 프리렌더 중에 현재 시각을 읽지 않기 위해서다.
  const at = currentAtIso(demoAt);

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">모임</h1>
        <MeetupFormDialog at={at} />
      </div>
      <MockWriteNotice />
      {error && <RefreshFailedNote />}
      {data.meetups.length === 0 && <p>아직 모임이 없어요. 모임을 만들어 보세요.</p>}
      {data.meetups.map((meetup) => (
        <MeetupCard key={meetup.id} meetup={meetup} at={at} />
      ))}
    </div>
  );
}
