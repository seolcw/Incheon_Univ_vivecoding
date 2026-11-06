// 서버와 같이 Asia/Seoul(+09:00) 고정. 브라우저 시간대에 영향받지 않는다.

export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 어느 시각이든 KST로 바꾸고 초 이하를 버린다. "2026-11-06T15:10:00+09:00" */
export function toKstMinuteIso(time: number): string {
  return `${new Date(time + KST_OFFSET_MS).toISOString().slice(0, 16)}:00+09:00`;
}

/** ISO 시각을 KST "HH:MM"으로 표시한다. */
export function formatKstTime(iso: string): string {
  return new Date(Date.parse(iso) + KST_OFFSET_MS).toISOString().slice(11, 16);
}
