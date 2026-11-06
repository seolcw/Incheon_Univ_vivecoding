"use client";

import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { MockWriteNotice } from "@/components/mock-write-notice";
import { SeatRow } from "@/components/seat-row";
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
import { DEMO_BUILDING_ID } from "@/lib/demo-building";
import { MEETUP_CATEGORIES, meetupTimeRange } from "@/lib/meetup";
import { burstFrom } from "@/lib/motion";
import { floorLabel } from "@/lib/room-status";
import { clockToMinutes, formatKstTime, kstDate, minutesToClock } from "@/lib/time";
import type { Meetup, MeetupCategory, RoomStatus, ScheduleItem } from "@/lib/types";
import { useWriteAction } from "@/lib/use-write-action";
import { getUser } from "@/lib/user";

const OPEN_CLOCK = "09:00";
const CLOSE_CLOCK = "22:00";
const MIN_LENGTH = 15;
const MAX_LENGTH = 240;
const DEFAULT_LENGTH = 120;

const FLOOD_MS = 3200;
const MIN_MEMBERS = 2;
const MAX_MEMBERS = 30;

const FIELD_LABEL_CLASS = "text-sm font-semibold";

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
  return `${floorLabel(room.floor)} ${room.name} · ${room.freeMinutes}분`;
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

const dayPosition = (clock: string) =>
  ((Math.min(Math.max(clockToMinutes(clock), clockToMinutes(OPEN_CLOCK)), clockToMinutes(CLOSE_CLOCK)) -
    clockToMinutes(OPEN_CLOCK)) /
    (clockToMinutes(CLOSE_CLOCK) - clockToMinutes(OPEN_CLOCK))) *
  100;

function lengthLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours > 0 ? `${hours}시간` : "", rest > 0 ? `${rest}분` : ""].filter(Boolean).join(" ");
}

/** 고른 시간이 하루 중 어디인지, 수업과 겹치는지 바로 보여 준다. 실제 판단은 서버가 한다. */
function SlotPreview({ start, end, schedule }: { start: string; end: string; schedule: ScheduleItem[] }) {
  const valid = /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end) && start < end;
  const blocks = schedule.map((item) => ({
    from: formatKstTime(item.startAt),
    to: formatKstTime(item.endAt),
  }));
  const overlaps = valid && blocks.some((block) => start < block.to && end > block.from);
  const minutes = valid ? clockToMinutes(end) - clockToMinutes(start) : 0;
  return (
    <div aria-hidden={!valid} className="flex flex-col gap-1.5">
      <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
        {blocks.map((block) => (
          <span
            key={block.from}
            className="absolute inset-y-0 bg-status-class/70"
            style={{ left: `${dayPosition(block.from)}%`, width: `${dayPosition(block.to) - dayPosition(block.from)}%` }}
          />
        ))}
        {valid && (
          <span
            className="absolute inset-y-0 rounded-full bg-status-meetup transition-[left,width] duration-300 ease-fluid"
            style={{ left: `${dayPosition(start)}%`, width: `${dayPosition(end) - dayPosition(start)}%` }}
          />
        )}
      </div>
      <p className={`text-xs font-medium ${overlaps ? "text-destructive" : "text-muted-foreground"}`}>
        {valid ? `${lengthLabel(minutes)}${overlaps ? " · 시간표의 수업과 겹쳐요" : ""}` : "시작과 끝을 확인해 주세요"}
      </p>
    </div>
  );
}

/** 만들기 버튼에서 파란 색이 번져 트레이를 채운다. 잠시 뒤 스스로 닫힌다. */
function CreatedFlood({
  meetup,
  origin,
  onClose,
}: {
  meetup: Meetup;
  origin: { x: number; y: number };
  onClose: () => void;
}) {
  const mark = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const burstTimer = setTimeout(
      () => burstFrom(mark.current, { count: 28, spread: 170, colors: ["#ffffff", "var(--seat-1)", "var(--seat-4)", "var(--seat-5)"] }),
      380,
    );
    const closeTimer = setTimeout(onClose, FLOOD_MS);
    return () => {
      clearTimeout(burstTimer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  return (
    <div role="status" data-tone="hero" className="absolute inset-0 z-20 overflow-clip text-status-foreground">
      <span
        aria-hidden="true"
        className="flood-disc"
        style={{ "--x": `${origin.x}px`, "--y": `${origin.y}px` } as CSSProperties}
      />
      <div className="relative flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <svg
          ref={mark}
          aria-hidden="true"
          viewBox="0 0 48 48"
          className="flood-check size-14"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 25l8.5 8.5L36 16" pathLength="1" />
        </svg>
        <p className="rise text-3xl font-extrabold tracking-[-0.03em]" style={{ "--i": 6 } as CSSProperties}>
          모임을 열었어요
        </p>
        <p className="rise text-base font-medium" style={{ "--i": 8 } as CSSProperties}>
          {meetup.roomName} · {meetupTimeRange(meetup)}
          <br />
          {meetup.title}
        </p>
        <div className="rise py-2" style={{ "--i": 10 } as CSSProperties}>
          <SeatRow members={meetup.members} maxMembers={meetup.maxMembers} tone="hero" waiting={false} welcomeFirst />
        </div>
        <Button autoFocus className="rise bg-white text-status-meetup hover:bg-white/90" style={{ "--i": 12 } as CSSProperties} onClick={onClose}>
          확인
        </Button>
      </div>
      <span aria-hidden="true" className="flood-countdown absolute inset-x-0 bottom-0 h-1 bg-white/70" />
    </div>
  );
}

function MeetupForm({ fixedRoom, at, onDone }: { fixedRoom?: RoomStatus; at: string; onDone: () => void }) {
  const { pending, run } = useWriteAction();
  const submit = useRef<HTMLButtonElement>(null);
  const [created, setCreated] = useState<{ meetup: Meetup; origin: { x: number; y: number } } | null>(null);
  // 고정된 강의실이 없으면(모임 목록) 시연 건물의 수업 없는 방 중에서 고른다.
  const emptyRooms = useRooms(fixedRoom ? null : { buildingId: DEMO_BUILDING_ID, status: "empty" });
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
      null,
    );
    // 실패하면(예: 수업과 겹침) 입력을 그대로 두고 사유를 보여 준다.
    if (!result.ok) return setError(result.message);
    const button = submit.current?.getBoundingClientRect();
    const tray = submit.current?.closest('[data-slot="dialog-content"]')?.getBoundingClientRect();
    setCreated({
      meetup: result.data.meetup,
      origin:
        button && tray
          ? { x: button.left + button.width / 2 - tray.left, y: button.top + button.height / 2 - tray.top }
          : { x: 0, y: 0 },
    });
  }

  function stepMembers(delta: number) {
    const current = Number(maxMembers) || MIN_MEMBERS;
    setMaxMembers(String(Math.min(Math.max(current + delta, MIN_MEMBERS), MAX_MEMBERS)));
  }

  const roomItems = (emptyRooms.data?.rooms ?? []).map((item) => ({ value: item.id, label: roomOptionLabel(item) }));
  const categoryIndex = MEETUP_CATEGORIES.findIndex((item) => item.value === category);
  const schedule = fixedRoom && "todaySchedule" in fixedRoom ? (fixedRoom.todaySchedule as ScheduleItem[]) : [];
  const me = getUser();
  const seatPreviewCount = Math.min(Math.max(Number(maxMembers) || MIN_MEMBERS, MIN_MEMBERS), MAX_MEMBERS);

  return (
    <>
    <form onSubmit={handleSubmit} className="grid max-h-[85dvh] gap-4 overflow-y-auto p-5 sm:p-6">
      <DialogHeader>
        <DialogTitle>모임 만들기</DialogTitle>
        <DialogDescription>
          {fixedRoom
            ? `${fixedRoom.buildingName} ${floorLabel(fixedRoom.floor)} ${fixedRoom.name} · ${kstDate(at)}`
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
          autoComplete="off"
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <span id="meetup-category-label" className={FIELD_LABEL_CLASS}>
          목적
        </span>
        <div
          role="radiogroup"
          aria-labelledby="meetup-category-label"
          className="relative grid grid-cols-4 rounded-full bg-muted p-1"
        >
          <span aria-hidden="true" className="pointer-events-none absolute inset-1 grid grid-cols-4">
            <span
              className="slide-chip rounded-full bg-foreground"
              style={{ "--slot": categoryIndex } as CSSProperties}
            />
          </span>
          {MEETUP_CATEGORIES.map((item) => (
            <label
              key={item.value}
              className={`relative flex h-9 cursor-pointer items-center justify-center rounded-full text-sm font-semibold transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring ${
                category === item.value ? "text-background" : "text-foreground"
              }`}
            >
              <input
                type="radio"
                name="meetup-category"
                value={item.value}
                checked={category === item.value}
                onChange={() => setCategory(item.value)}
                className="sr-only"
              />
              {item.label}
            </label>
          ))}
        </div>
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
          className="w-full min-w-0 resize-none rounded-xl border border-input bg-card px-3.5 py-2.5 text-base transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
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
        <div className="col-span-2">
          <SlotPreview start={start} end={end} schedule={schedule} />
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor="meetup-max" className={FIELD_LABEL_CLASS}>
          정원
        </label>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" aria-label="정원 한 명 줄이기" onClick={() => stepMembers(-1)}>
            <Minus aria-hidden="true" />
          </Button>
          <Input
            id="meetup-max"
            type="number"
            inputMode="numeric"
            min={MIN_MEMBERS}
            max={MAX_MEMBERS}
            value={maxMembers}
            className="w-16 px-1 text-center font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            onChange={(event) => setMaxMembers(event.target.value)}
          />
          <Button type="button" variant="outline" size="icon" aria-label="정원 한 명 늘리기" onClick={() => stepMembers(1)}>
            <Plus aria-hidden="true" />
          </Button>
        </div>
        <SeatRow
          members={me ? [{ userId: me.userId, nickname: me.nickname }] : []}
          maxMembers={seatPreviewCount}
          size="sm"
          waiting={false}
          popOpenSeats
        />
      </div>

      {error && (
        <p key={error} role="alert" className="nudge text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <MockWriteNotice />

      <DialogFooter>
        <Button
          ref={submit}
          type="submit"
          size="lg"
          className="w-full bg-status-meetup text-status-foreground hover:bg-status-meetup/90 sm:w-auto"
          disabled={pending || USE_MOCK}
        >
          {pending ? "만드는 중이에요" : "모임 만들기"}
        </Button>
      </DialogFooter>
    </form>
    {created && <CreatedFlood meetup={created.meetup} origin={created.origin} onClose={onDone} />}
    </>
  );
}

/** fixedRoom이 있으면 강의실 상세에서 연 것으로, 강의실을 고정한다. 폼은 열 때마다 새로 시작한다. */
export function MeetupFormDialog({
  fixedRoom,
  at,
  tone = "paper",
}: {
  fixedRoom?: RoomStatus;
  at: string;
  /** hero: 상태 색면 위에 놓는 흰 버튼 */
  tone?: "paper" | "hero";
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <Button
        size="lg"
        className={tone === "hero" ? "bg-white text-foreground hover:bg-white/90" : undefined}
        onClick={() => setOpen(true)}
      >
        <Plus aria-hidden="true" />
        모임 만들기
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent tray className="overflow-hidden p-0 sm:max-w-md sm:p-0">
          <MeetupForm fixedRoom={fixedRoom} at={at} onDone={close} />
        </DialogContent>
      </Dialog>
    </>
  );
}
