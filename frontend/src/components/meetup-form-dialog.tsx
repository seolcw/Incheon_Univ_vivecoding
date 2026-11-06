"use client";

import { useState, type FormEvent } from "react";
import { MockWriteNotice } from "@/components/mock-write-notice";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createMeetup, USE_MOCK, useRooms } from "@/lib/api";
import { MEETUP_CATEGORIES } from "@/lib/meetup";
import { clockToMinutes, formatKstTime, kstDate, minutesToClock } from "@/lib/time";
import type { MeetupCategory, RoomStatus } from "@/lib/types";
import { useWriteAction } from "@/lib/use-write-action";
import { getUser } from "@/lib/user";

const OPEN_CLOCK = "09:00";
const CLOSE_CLOCK = "22:00";
const MIN_LENGTH = 15;
const MAX_LENGTH = 240;
const DEFAULT_LENGTH = 120;

const FIELD_LABEL_CLASS = "text-sm font-medium";

/** 시작은 지금(수업 중이면 끝난 뒤), 끝은 2시간 뒤. 비어 있는 시간이 더 짧으면 거기까지 */
function defaultSlot(room: RoomStatus | undefined, at: string) {
  const clock = formatKstTime(at);
  const closed = clock < OPEN_CLOCK || clock >= CLOSE_CLOCK;
  let start = closed ? OPEN_CLOCK : clock;
  if (room?.status === "class" && room.classEndsAt) start = formatKstTime(room.classEndsAt);

  const startMinutes = clockToMinutes(start);
  const freeUntil = room?.freeUntil ? clockToMinutes(formatKstTime(room.freeUntil)) : clockToMinutes(CLOSE_CLOCK);
  const end = Math.min(freeUntil, startMinutes + DEFAULT_LENGTH, clockToMinutes(CLOSE_CLOCK));
  return { start, end: minutesToClock(end) };
}

function roomOptionLabel(room: RoomStatus) {
  return `${room.floor}층 ${room.name} · ${room.freeMinutes}분`;
}

function validate(title: string, start: string, end: string, maxMembers: number) {
  const trimmed = title.trim();
  if (trimmed.length < 1 || trimmed.length > 30) return "제목은 1–30자로 입력해 주세요.";
  if (start < OPEN_CLOCK || end > CLOSE_CLOCK || start >= end) return "모임은 09:00–22:00 안에서 잡아 주세요.";
  const length = clockToMinutes(end) - clockToMinutes(start);
  if (length < MIN_LENGTH || length > MAX_LENGTH) return "모임 길이는 15분–4시간으로 정해 주세요.";
  if (!Number.isInteger(maxMembers) || maxMembers < 2 || maxMembers > 30) return "정원은 2–30명으로 정해 주세요.";
  return null;
}

function MeetupForm({ fixedRoom, at, onDone }: { fixedRoom?: RoomStatus; at: string; onDone: () => void }) {
  const { pending, run } = useWriteAction();
  // 고정된 강의실이 없으면(모임 목록) 수업 없는 방 중에서 고른다.
  const emptyRooms = useRooms(fixedRoom ? null : { status: "empty" });
  const [pickedRoomId, setPickedRoomId] = useState<string | null>(null);
  const room = fixedRoom ?? emptyRooms.data?.rooms.find((item) => item.id === pickedRoomId);

  const initial = defaultSlot(fixedRoom, at);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MeetupCategory>("study");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [maxMembers, setMaxMembers] = useState("4");
  const [error, setError] = useState("");

  function pickRoom(roomId: string | null) {
    setPickedRoomId(roomId);
    const picked = emptyRooms.data?.rooms.find((item) => item.id === roomId);
    if (picked) {
      const slot = defaultSlot(picked, at);
      setStart(slot.start);
      setEnd(slot.end);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (USE_MOCK) return;
    if (!room) return setError("강의실을 선택해 주세요.");
    const members = Number(maxMembers);
    const invalid = validate(title, start, end, members);
    if (invalid) return setError(invalid);
    const user = getUser();
    if (!user) return setError("닉네임을 먼저 정해 주세요.");

    const date = kstDate(at);
    const result = await run(
      () =>
        createMeetup({
          roomId: room.id,
          title: title.trim(),
          category,
          description: description.trim(),
          startAt: `${date}T${start}:00+09:00`,
          endAt: `${date}T${end}:00+09:00`,
          maxMembers: members,
          userId: user.userId,
          nickname: user.nickname,
        }),
      "모임을 만들었어요.",
    );
    // 실패하면(예: 수업과 겹침) 입력을 그대로 두고 사유를 보여 준다.
    if (result.ok) onDone();
    else setError(result.message);
  }

  const roomItems = (emptyRooms.data?.rooms ?? []).map((item) => ({ value: item.id, label: roomOptionLabel(item) }));

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>모임 만들기</DialogTitle>
        <DialogDescription>
          {fixedRoom
            ? `${fixedRoom.buildingName} ${fixedRoom.floor}층 ${fixedRoom.name} · ${kstDate(at)}`
            : `${kstDate(at)} 모임을 만들어요.`}
        </DialogDescription>
      </DialogHeader>

      {!fixedRoom && (
        <div className="grid gap-1.5">
          <span id="meetup-room-label" className={FIELD_LABEL_CLASS}>
            강의실
          </span>
          <Select items={roomItems} value={pickedRoomId} onValueChange={pickRoom}>
            <SelectTrigger aria-labelledby="meetup-room-label" className="w-full">
              <SelectValue placeholder={emptyRooms.data ? "수업 없는 강의실 선택" : "강의실을 불러오는 중이에요."} />
            </SelectTrigger>
            <SelectContent>
              {roomItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-1.5">
        <label htmlFor="meetup-title" className={FIELD_LABEL_CLASS}>
          제목
        </label>
        <Input
          id="meetup-title"
          value={title}
          maxLength={30}
          placeholder="예: 카공 모여라"
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <span id="meetup-category-label" className={FIELD_LABEL_CLASS}>
          목적
        </span>
        <Select
          items={MEETUP_CATEGORIES}
          value={category}
          onValueChange={(value) => value && setCategory(value as MeetupCategory)}
        >
          <SelectTrigger aria-labelledby="meetup-category-label" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEETUP_CATEGORIES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="meetup-description" className={FIELD_LABEL_CLASS}>
          설명
        </label>
        <textarea
          id="meetup-description"
          value={description}
          maxLength={200}
          rows={2}
          placeholder="선택 입력, 200자까지"
          className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <label htmlFor="meetup-start" className={FIELD_LABEL_CLASS}>
            시작
          </label>
          <Input id="meetup-start" type="time" value={start} onChange={(event) => setStart(event.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="meetup-end" className={FIELD_LABEL_CLASS}>
            끝
          </label>
          <Input id="meetup-end" type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="meetup-max" className={FIELD_LABEL_CLASS}>
          정원
        </label>
        <Input
          id="meetup-max"
          type="number"
          inputMode="numeric"
          min={2}
          max={30}
          value={maxMembers}
          onChange={(event) => setMaxMembers(event.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <MockWriteNotice />

      <DialogFooter>
        <Button type="submit" disabled={pending || USE_MOCK}>
          {pending ? "만드는 중이에요" : "모임 만들기"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** fixedRoom이 있으면 강의실 상세에서 연 것으로, 강의실을 고정한다. 폼은 열 때마다 새로 시작한다. */
export function MeetupFormDialog({ fixedRoom, at }: { fixedRoom?: RoomStatus; at: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>모임 만들기</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <MeetupForm fixedRoom={fixedRoom} at={at} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
