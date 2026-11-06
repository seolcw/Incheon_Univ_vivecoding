// API 접근의 단일 진입점: fetch 래퍼, 목업 모드, 시연 시각(demoAt), 공통 에러 형식.
// 조회는 SWR 키(= at·필터를 포함한 상대 API URL)로, 쓰기는 아래 함수로 호출한다.

import { useCallback, useSyncExternalStore } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toKstMinuteIso } from "@/lib/time";
import type {
  ChatRequest,
  ChatResponse,
  BuildingsResponse,
  CancelMeetupRequest,
  CreateMeetupRequest,
  ErrorCode,
  JoinMeetupRequest,
  LeaveMeetupRequest,
  MeetupResponse,
  MeetupsQuery,
  MeetupsResponse,
  RoomDetailResponse,
  RoomsQuery,
  RoomsResponse,
} from "@/lib/types";

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "1";
export const MOCK_WRITE_MESSAGE = "실제 API 연결 후 이용할 수 있어요.";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---- 공통 에러 ----

/** 계약의 에러 코드 + 서버 응답이 없을 때 프론트가 쓰는 코드 */
export type ApiErrorCode = ErrorCode | "NETWORK_ERROR" | "MOCK_WRITE_DISABLED";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

// ---- fetch 래퍼 ----

async function send<T>(method: "GET" | "POST", relativeUrl: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${relativeUrl}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", "서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.", 0);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || data === null) {
    throw new ApiError(
      data?.error?.code ?? "INTERNAL_ERROR",
      data?.error?.message ?? "일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요.",
      response.status,
    );
  }
  return data as T;
}

async function fetcher<T>(key: string): Promise<T> {
  if (USE_MOCK) {
    const { mockGet } = await import("@/mocks");
    return mockGet<T>(key);
  }
  return send<T>("GET", key);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  // 목업에는 저장소가 없다. 실패해도 실제 API와 목업을 자동으로 오가지 않는다.
  if (USE_MOCK) throw new ApiError("MOCK_WRITE_DISABLED", MOCK_WRITE_MESSAGE, 0);
  return send<T>("POST", path, body);
}

// ---- 시연 시각 (demoAt) ----

const DEMO_AT_KEY = "demoAt";

export type DemoAt =
  | { status: "loading" } // 초기화 전: 조회하지 않는다
  | { status: "off" } // 서버 현재 시각
  | { status: "on"; at: string }
  | { status: "invalid" }; // 형식 오류: 조회하지 않고 해제 버튼을 보여 준다

const DEMO_AT_LOADING: DemoAt = { status: "loading" };

let demoAt: DemoAt = DEMO_AT_LOADING;
const demoAtListeners = new Set<() => void>();

function setDemoAt(next: DemoAt) {
  if (JSON.stringify(next) === JSON.stringify(demoAt)) return;
  demoAt = next;
  demoAtListeners.forEach((listener) => listener());
}

/** 유효한 값만 KST 분 단위 ISO로 바꾼다. 오프셋이 없으면 KST로 읽는다. */
export function normalizeDemoAt(raw: string): string | null {
  // URL에 + 를 인코딩하지 않고 넣으면 공백으로 읽힌다.
  const value = raw.trim().replace(" ", "+");
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:\d{2})?$/i.exec(value);
  if (!match) return null;
  const time = Date.parse(`${match[1]}${match[2] ?? "+09:00"}`);
  return Number.isNaN(time) ? null : toKstMinuteIso(time);
}

/** 우선순위: URL at → 저장값 → 서버 현재 시각. 유효한 URL 값만 저장한다. */
export function syncDemoAt(urlAt: string | null) {
  if (urlAt !== null) {
    const at = normalizeDemoAt(urlAt);
    if (at) localStorage.setItem(DEMO_AT_KEY, at);
    setDemoAt(at ? { status: "on", at } : { status: "invalid" });
    return;
  }
  const stored = localStorage.getItem(DEMO_AT_KEY);
  if (stored === null) {
    setDemoAt({ status: "off" });
    return;
  }
  const at = normalizeDemoAt(stored);
  setDemoAt(at ? { status: "on", at } : { status: "invalid" });
}

/** 저장값을 지운다. URL의 at은 호출하는 쪽에서 router로 지운다. */
export function clearDemoAt() {
  localStorage.removeItem(DEMO_AT_KEY);
  setDemoAt({ status: "off" });
}

// 첫 조회 전에 값을 확정한다. 이후 URL 변경은 components/demo-at.tsx의 DemoAtSync가 맡는다.
if (typeof window !== "undefined") {
  syncDemoAt(new URLSearchParams(window.location.search).get("at"));
}

function subscribeDemoAt(listener: () => void) {
  demoAtListeners.add(listener);
  return () => {
    demoAtListeners.delete(listener);
  };
}

export function useDemoAt(): DemoAt {
  return useSyncExternalStore(
    subscribeDemoAt,
    () => demoAt,
    () => DEMO_AT_LOADING,
  );
}

/** 화면 계산용 현재 시각: 시연 시각이 있으면 그 값 */
export function currentAtIso(at: DemoAt): string {
  return at.status === "on" ? at.at : toKstMinuteIso(Date.now());
}

// ---- 조회 (SWR) ----

type Query = Record<string, string | number | boolean | undefined>;

function buildKey(path: string, query: Query | null, at: DemoAt, sendAt: boolean): string | null {
  if (query === null || at.status === "loading" || at.status === "invalid") return null;
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined) params.set(name, String(value));
  }
  if (sendAt && at.status === "on") params.set("at", at.at);
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

function useApi<T>(path: string, query: Query | null = {}, sendAt = true) {
  const at = useDemoAt();
  return useSWR<T, ApiError>(buildKey(path, query, at, sendAt), fetcher<T>);
}

const DATA_KEY = /^\/api\/(buildings|rooms|meetups)/;

function isDataKey(key: unknown) {
  return typeof key === "string" && DATA_KEY.test(key);
}

/**
 * 생성·참여·나가기·취소 직후와 409에 호출한다. buildings·rooms·meetups의 모든 쿼리를 재조회하고,
 * 화면에 떠 있는 조회 중 새로 실패한 것이 있으면 false를 돌려준다. 안 떠 있는 쿼리는 다음 mount에 조회된다.
 */
export function useRevalidateData() {
  const { mutate, cache } = useSWRConfig();
  return useCallback(async () => {
    const keys = [...cache.keys()].filter(isDataKey);
    const errorsBefore = new Map(keys.map((key) => [key, cache.get(key)?.error]));
    await mutate(isDataKey);
    return keys.every((key) => {
      const error = cache.get(key)?.error;
      return !error || error === errorsBefore.get(key);
    });
  }, [mutate, cache]);
}

export function useBuildings() {
  return useApi<BuildingsResponse>("/api/buildings");
}

/** null이면 조회하지 않는다. */
export function useRooms(query: RoomsQuery | null = {}) {
  return useApi<RoomsResponse>("/api/rooms", query && { ...query });
}

export function useRoom(roomId: string) {
  return useApi<RoomDetailResponse>(`/api/rooms/${encodeURIComponent(roomId)}`);
}

export function useMeetups(query: MeetupsQuery = {}) {
  return useApi<MeetupsResponse>("/api/meetups", { ...query });
}

/** 모임 단건은 at을 받지 않는다(SPEC v1 §3). */
export function useMeetup(meetupId: string) {
  return useApi<MeetupResponse>(`/api/meetups/${encodeURIComponent(meetupId)}`, {}, false);
}

// ---- 쓰기 (at을 보내지 않는다) ----

export function createMeetup(body: CreateMeetupRequest) {
  return post<MeetupResponse>("/api/meetups", body);
}

export function joinMeetup(meetupId: string, body: JoinMeetupRequest) {
  return post<MeetupResponse>(`/api/meetups/${encodeURIComponent(meetupId)}/join`, body);
}

export function leaveMeetup(meetupId: string, body: LeaveMeetupRequest) {
  return post<MeetupResponse>(`/api/meetups/${encodeURIComponent(meetupId)}/leave`, body);
}

export function cancelMeetup(meetupId: string, body: CancelMeetupRequest) {
  return post<MeetupResponse>(`/api/meetups/${encodeURIComponent(meetupId)}/cancel`, body);
}

export function askTorch(body: ChatRequest) {
  return post<ChatResponse>("/api/chat", body);
}
