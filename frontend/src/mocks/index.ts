// NEXT_PUBLIC_USE_MOCK=1일 때 조회만 대신하는 가짜 서버. 쓰기는 lib/api.ts에서 막는다(SPEC v1 §4).
// campus.json은 SPEC v1 §5 시드 그대로이고, 상태 계산은 §3 규칙을 따른다.
// 금 15:10 집계: 공학관 10/12(모임 1), 인문관 6/12, 자연관 3/12.

import { ApiError } from "@/lib/api";
import { KST_OFFSET_MS, toKstMinuteIso } from "@/lib/time";
import type {
  BuildingsResponse,
  BuildingSummary,
  Meetup,
  MeetupsResponse,
  RoomDetailResponse,
  RoomStatus,
  RoomsResponse,
} from "@/lib/types";
import campus from "./campus.json";

type SeedBuilding = (typeof campus.buildings)[number];
type SeedRoom = (typeof campus.rooms)[number];

const LATENCY_MS = 150;
const OPEN = "09:00";
const CLOSE = "22:00";

const demoMeetup: Meetup = {
  id: "demo-m1",
  roomId: "eng-303",
  roomName: "303호",
  buildingId: "eng",
  buildingName: "공학관",
  floor: 3,
  title: "카공 모여라",
  category: "study",
  description: "조용히 각자 공부해요. 콘센트 자리 있음",
  startAt: "2026-11-06T15:00:00+09:00",
  endAt: "2026-11-06T17:00:00+09:00",
  maxMembers: 4,
  hostId: "u-demo-host",
  hostNickname: "민지",
  members: [{ userId: "u-demo-host", nickname: "민지", joinedAt: "2026-11-06T14:58:00+09:00" }],
  memberCount: 1,
  isFull: false,
  status: "open",
  createdAt: "2026-11-06T14:58:00+09:00",
};

function notFound(message: string): never {
  throw new ApiError("NOT_FOUND", message, 404);
}

function toMinutes(clock: string) {
  const [hours, minutes] = clock.split(":").map(Number);
  return hours * 60 + minutes;
}

/** at을 KST 날짜·"HH:MM"·ISO 요일(월=1…일=7)로 나눈다. "HH:MM" 문자열은 그대로 대소 비교할 수 있다. */
function kstParts(at: Date) {
  const kst = new Date(at.getTime() + KST_OFFSET_MS);
  const iso = kst.toISOString();
  return { day: iso.slice(0, 10), clock: iso.slice(11, 16), dayOfWeek: kst.getUTCDay() || 7 };
}

function parseAt(params: URLSearchParams) {
  return new Date(Date.parse(toKstMinuteIso(Date.parse(params.get("at") ?? new Date().toISOString()))));
}

function classesOn(room: SeedRoom, dayOfWeek: number) {
  return room.schedule
    .filter((item) => item.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function toRoomStatus(room: SeedRoom, at: Date): RoomStatus {
  const { day, clock, dayOfWeek } = kstParts(at);
  const base = {
    id: room.id,
    buildingId: room.buildingId,
    buildingName: campus.buildings.find((building) => building.id === room.buildingId)?.name ?? "",
    floor: room.floor,
    name: room.name,
    capacity: room.capacity,
    tags: room.tags,
    freeUntil: null,
    freeMinutes: 0,
    classEndsAt: null,
    currentTitle: null,
    activeMeetupId: null,
  };

  if (clock < OPEN || clock >= CLOSE) return { ...base, status: "closed" };

  const classes = classesOn(room, dayOfWeek);
  const current = classes.find((item) => item.startTime <= clock && clock < item.endTime);
  if (current) {
    return {
      ...base,
      status: "class",
      classEndsAt: `${day}T${current.endTime}:00+09:00`,
      currentTitle: current.title,
    };
  }

  const freeUntil = classes.find((item) => item.startTime > clock)?.startTime ?? CLOSE;
  const free = {
    ...base,
    freeUntil: `${day}T${freeUntil}:00+09:00`,
    freeMinutes: toMinutes(freeUntil) - toMinutes(clock),
  };
  const isMeetupNow =
    demoMeetup.roomId === room.id &&
    Date.parse(demoMeetup.startAt) <= at.getTime() &&
    at.getTime() < Date.parse(demoMeetup.endAt);
  if (isMeetupNow) {
    return { ...free, status: "meetup", currentTitle: demoMeetup.title, activeMeetupId: demoMeetup.id };
  }
  return { ...free, status: "empty" };
}

function summarize(rooms: RoomStatus[]) {
  return {
    totalCount: rooms.length,
    emptyCount: rooms.filter((room) => room.status === "empty" || room.status === "meetup").length,
    meetupCount: rooms.filter((room) => room.status === "meetup").length,
  };
}

function toBuildingSummary(building: SeedBuilding, at: Date): BuildingSummary {
  const rooms = campus.rooms.filter((room) => room.buildingId === building.id).map((room) => toRoomStatus(room, at));
  return {
    ...building,
    ...summarize(rooms),
    floorSummary: building.floors.map((floor) => ({
      floor,
      ...summarize(rooms.filter((room) => room.floor === floor)),
    })),
  };
}

function getBuildings(params: URLSearchParams): BuildingsResponse {
  const at = parseAt(params);
  return {
    at: toKstMinuteIso(at.getTime()),
    buildings: campus.buildings.map((building) => toBuildingSummary(building, at)),
  };
}

function getRooms(params: URLSearchParams): RoomsResponse {
  const at = parseAt(params);
  const buildingId = params.get("buildingId");
  const floor = params.get("floor");
  const status = params.get("status");
  const minFreeMinutes = params.get("minFreeMinutes");
  if (buildingId && !campus.buildings.some((building) => building.id === buildingId)) {
    notFound("건물을 찾을 수 없어요.");
  }
  const rooms = campus.rooms
    .filter((room) => !buildingId || room.buildingId === buildingId)
    .filter((room) => floor === null || room.floor === Number(floor))
    .map((room) => toRoomStatus(room, at))
    .filter((room) => !status || room.status === status)
    .filter((room) => minFreeMinutes === null || room.freeMinutes >= Number(minFreeMinutes));
  return { at: toKstMinuteIso(at.getTime()), rooms };
}

function getRoomDetail(roomId: string, params: URLSearchParams): RoomDetailResponse {
  const at = parseAt(params);
  const room = campus.rooms.find((item) => item.id === roomId) ?? notFound("강의실을 찾을 수 없어요.");
  const { day, dayOfWeek } = kstParts(at);
  return {
    at: toKstMinuteIso(at.getTime()),
    room: {
      ...toRoomStatus(room, at),
      todaySchedule: classesOn(room, dayOfWeek).map((item) => ({
        startAt: `${day}T${item.startTime}:00+09:00`,
        endAt: `${day}T${item.endTime}:00+09:00`,
        title: item.title,
      })),
      meetups: demoMeetup.roomId === roomId && Date.parse(demoMeetup.endAt) > at.getTime() ? [demoMeetup] : [],
    },
  };
}

function getMeetups(params: URLSearchParams): MeetupsResponse {
  const at = parseAt(params);
  const roomId = params.get("roomId");
  const buildingId = params.get("buildingId");
  if (roomId && !campus.rooms.some((room) => room.id === roomId)) notFound("강의실을 찾을 수 없어요.");
  if (buildingId && !campus.buildings.some((building) => building.id === buildingId)) {
    notFound("건물을 찾을 수 없어요.");
  }
  const visible =
    (!roomId || demoMeetup.roomId === roomId) &&
    (!buildingId || demoMeetup.buildingId === buildingId) &&
    (params.get("includePast") === "true" || Date.parse(demoMeetup.endAt) > at.getTime());
  return { meetups: visible ? [demoMeetup] : [] };
}

function route(path: string, params: URLSearchParams): unknown {
  const [resource, id] = path.replace(/^\/api\//, "").split("/").map(decodeURIComponent);
  if (resource === "buildings" && !id) return getBuildings(params);
  if (resource === "rooms" && !id) return getRooms(params);
  if (resource === "rooms") return getRoomDetail(id, params);
  if (resource === "meetups" && !id) return getMeetups(params);
  if (resource === "meetups") {
    return { meetup: id === demoMeetup.id ? demoMeetup : notFound("모임을 찾을 수 없어요.") };
  }
  return notFound("요청한 주소를 찾을 수 없어요.");
}

/** key는 SWR 키와 같은 상대 API URL이다. 예: /api/rooms?buildingId=eng&at=... */
export async function mockGet<T>(key: string): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
  const url = new URL(key, "http://mock.local");
  return route(url.pathname, url.searchParams) as T;
}
