// 로그인 없음. 브라우저별 userId와 닉네임을 localStorage에 둔다(contracts/api.md '사용자').

import { useSyncExternalStore } from "react";

const USER_ID_KEY = "userId";
const NICKNAME_KEY = "nickname";

export const NICKNAME_MAX_LENGTH = 12;

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** userId와 닉네임이 모두 저장돼 있으면 돌려준다. 생성·참여 요청 직전에 읽는다. */
export function getUser(): { userId: string; nickname: string } | null {
  const userId = localStorage.getItem(USER_ID_KEY);
  const nickname = localStorage.getItem(NICKNAME_KEY);
  return userId && nickname ? { userId, nickname } : null;
}

export function saveNickname(nickname: string) {
  if (!localStorage.getItem(USER_ID_KEY)) {
    localStorage.setItem(USER_ID_KEY, crypto.randomUUID());
  }
  localStorage.setItem(NICKNAME_KEY, nickname);
  listeners.forEach((listener) => listener());
}

/** 내가 주최자·참여자인지 화면에서 판단할 때 쓴다. */
export function useUserId(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => getUser()?.userId ?? null,
    () => null,
  );
}

/** undefined: 서버 렌더·하이드레이션 중(아직 모름), null: 첫 방문 */
export function useNickname(): string | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => getUser()?.nickname ?? null,
    () => undefined,
  );
}
