// 로그인 없음. 브라우저별 userId와 닉네임을 localStorage에 둔다(contracts/api.md '사용자').

import { useSyncExternalStore } from "react";
import { decodeAvatar } from "@/lib/avatar";

const USER_ID_KEY = "userId";
const NICKNAME_KEY = "nickname";
const AVATAR_KEY = "avatar";

export const NICKNAME_MAX_LENGTH = 12;

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 저장된 얼굴. 해석할 수 없는 값이면 없는 것으로 본다. */
function readAvatar(): string | null {
  const avatar = localStorage.getItem(AVATAR_KEY);
  return decodeAvatar(avatar) ? avatar : null;
}

/** userId와 닉네임이 모두 저장돼 있으면 돌려준다. 생성·참여 요청 직전에 읽는다. avatar는 선택이다. */
export function getUser(): { userId: string; nickname: string; avatar?: string } | null {
  const userId = localStorage.getItem(USER_ID_KEY);
  const nickname = localStorage.getItem(NICKNAME_KEY);
  if (!userId || !nickname) return null;
  const avatar = readAvatar();
  return avatar ? { userId, nickname, avatar } : { userId, nickname };
}

/** null이면 지워서 이름 첫 글자로 돌아간다. */
export function saveAvatar(avatar: string | null) {
  if (avatar === null) localStorage.removeItem(AVATAR_KEY);
  else localStorage.setItem(AVATAR_KEY, avatar);
  listeners.forEach((listener) => listener());
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

export function useAvatar(): string | null {
  return useSyncExternalStore(subscribe, readAvatar, () => null);
}

/** undefined: 서버 렌더·하이드레이션 중(아직 모름), null: 첫 방문 */
export function useNickname(): string | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => getUser()?.nickname ?? null,
    () => undefined,
  );
}
