import { formatKstTime } from "@/lib/time";
import type { Meetup, MeetupCategory } from "@/lib/types";

export const MEETUP_CATEGORIES: { value: MeetupCategory; label: string }[] = [
  { value: "study", label: "공부" },
  { value: "project", label: "팀플" },
  { value: "social", label: "친목" },
  { value: "etc", label: "기타" },
];

export function categoryLabel(category: MeetupCategory): string {
  return MEETUP_CATEGORIES.find((item) => item.value === category)?.label ?? "기타";
}

export function meetupTimeRange(meetup: Pick<Meetup, "startAt" | "endAt">): string {
  return `${formatKstTime(meetup.startAt)}–${formatKstTime(meetup.endAt)}`;
}

/** 진행 시점 표시 */
export function meetupPhase(meetup: Meetup, at: string): string {
  if (meetup.status === "cancelled") return "취소됨";
  const now = Date.parse(at);
  if (now >= Date.parse(meetup.endAt)) return "종료";
  return now >= Date.parse(meetup.startAt) ? "진행 중" : "예정";
}
