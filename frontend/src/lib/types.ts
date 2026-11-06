// contracts/api.md v0의 타입을 그대로 옮긴 파일. 계약이 바뀌면 여기를 함께 고친다.

// ---- 공통 ----

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "ROOM_OCCUPIED"
  | "MEETUP_FULL"
  | "MEETUP_CLOSED"
  | "NOT_MEMBER"
  | "HOST_CANNOT_LEAVE"
  | "AI_UNAVAILABLE"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string };
}

// ---- Building / BuildingSummary ----

export interface BuildingMapBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FloorSummary {
  floor: number;
  totalCount: number;
  /** status가 empty 또는 meetup인 강의실 수 */
  emptyCount: number;
  meetupCount: number;
}

export interface BuildingSummary {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** 오름차순 */
  floors: number[];
  /** 캠퍼스 SVG viewBox 0–100 기준 블록 위치·크기 */
  map: BuildingMapBox;
  totalCount: number;
  /** status가 empty 또는 meetup인 강의실 수 */
  emptyCount: number;
  meetupCount: number;
  floorSummary: FloorSummary[];
}

// ---- RoomStatus ----

export type RoomStatusValue = "empty" | "meetup" | "class" | "closed";

export interface RoomStatus {
  id: string;
  buildingId: string;
  buildingName: string;
  floor: number;
  name: string;
  capacity: number;
  tags: string[];
  status: RoomStatusValue;
  /** empty·meetup: 다음 수업 시작 또는 폐관(22:00). class·closed: null */
  freeUntil: string | null;
  /** at부터 freeUntil까지 분. class·closed: 0 */
  freeMinutes: number;
  /** class일 때 수업 종료 시각 */
  classEndsAt: string | null;
  /** class: 수업명, meetup: 모임 제목, 그 외 null */
  currentTitle: string | null;
  /** meetup일 때 진행 중 모임 id */
  activeMeetupId: string | null;
}

// ---- Meetup ----

export type MeetupCategory = "study" | "project" | "social" | "etc";
export type MeetupStatus = "open" | "cancelled";

export interface MeetupMember {
  userId: string;
  nickname: string;
  joinedAt: string;
}

export interface Meetup {
  id: string;
  roomId: string;
  roomName: string;
  buildingId: string;
  buildingName: string;
  floor: number;
  /** 1–30자 */
  title: string;
  category: MeetupCategory;
  /** 0–200자, 기본 "" */
  description: string;
  startAt: string;
  endAt: string;
  /** 2–30 */
  maxMembers: number;
  hostId: string;
  hostNickname: string;
  /** 주최자가 첫 번째 */
  members: MeetupMember[];
  memberCount: number;
  isFull: boolean;
  status: MeetupStatus;
  createdAt: string;
}

// ---- RoomDetail = RoomStatus + ----

export interface ScheduleItem {
  startAt: string;
  endAt: string;
  title: string;
}

export interface RoomDetail extends RoomStatus {
  /** at 날짜의 수업, 시작 순 */
  todaySchedule: ScheduleItem[];
  /** 이 강의실의 open 모임 중 endAt > at, startAt 순 */
  meetups: Meetup[];
}

// ---- Recommendation (/api/chat) ----

export interface Recommendation {
  roomId: string;
  roomName: string;
  buildingId: string;
  buildingName: string;
  floor: number;
  status: "empty" | "meetup";
  freeUntil: string;
  freeMinutes: number;
  /** 위치가 있을 때 건물까지 도보 분, 없으면 null */
  walkMinutes: number | null;
  /** 60자 이내 한국어 */
  reason: string;
}

// ---- 엔드포인트별 요청·응답 ----

export interface HealthResponse {
  status: string;
  storage: string;
  time: string;
  version: string;
}

export interface BuildingsResponse {
  at: string;
  buildings: BuildingSummary[];
}

export interface RoomsQuery {
  buildingId?: string;
  floor?: number;
  status?: RoomStatusValue;
  /** 0–600, freeMinutes ≥ 값인 것만 */
  minFreeMinutes?: number;
}

export interface RoomsResponse {
  at: string;
  rooms: RoomStatus[];
}

export interface RoomDetailResponse {
  at: string;
  room: RoomDetail;
}

export interface MeetupsQuery {
  roomId?: string;
  buildingId?: string;
  includePast?: boolean;
}

export interface MeetupsResponse {
  meetups: Meetup[];
}

export interface MeetupResponse {
  meetup: Meetup;
}

export interface CreateMeetupRequest {
  roomId: string;
  title: string;
  category: MeetupCategory;
  description?: string;
  startAt: string;
  endAt: string;
  maxMembers: number;
  userId: string;
  nickname: string;
}

export interface JoinMeetupRequest {
  userId: string;
  nickname: string;
}

export interface LeaveMeetupRequest {
  userId: string;
}

export interface CancelMeetupRequest {
  userId: string;
}

export interface ChatRequest {
  userId: string;
  /** 1–300자 */
  message: string;
  location: { lat: number; lng: number } | null;
  at?: string;
}

export interface ChatResponse {
  reply: string;
  recommendations: Recommendation[];
  source: "llm" | "fallback";
}
