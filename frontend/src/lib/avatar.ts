// 프로필 얼굴. 서버와 주고받는 값은 "피부-눈-머리스타일-머리색-액세서리-모자" 숫자 문자열이다.
// 해석할 수 없거나 범위를 벗어난 값은 null로 처리해 이름 첫 글자로 돌아간다.

export type AvatarPart = "skin" | "eyes" | "hairStyle" | "hairColor" | "accessory" | "hat";

export type AvatarParts = Record<AvatarPart, number>;

/** 인코딩 순서. 바꾸면 이미 저장된 값의 뜻이 달라진다. */
export const AVATAR_PART_ORDER: AvatarPart[] = ["skin", "eyes", "hairStyle", "hairColor", "accessory", "hat"];

export const AVATAR_PART_LABELS: Record<AvatarPart, string> = {
  skin: "피부색",
  eyes: "눈매",
  hairStyle: "머리 스타일",
  hairColor: "머리색",
  accessory: "액세서리",
  hat: "모자",
};

export const SKIN_OPTIONS = [
  { label: "밝은 톤", color: "oklch(0.94 0.035 75)" },
  { label: "연한 톤", color: "oklch(0.88 0.06 70)" },
  { label: "중간 톤", color: "oklch(0.79 0.09 62)" },
  { label: "짙은 톤", color: "oklch(0.65 0.1 55)" },
  { label: "깊은 톤", color: "oklch(0.5 0.08 45)" },
];

export const HAIR_COLOR_OPTIONS = [
  { label: "검정", color: "oklch(0.25 0.015 265)" },
  { label: "흑갈색", color: "oklch(0.34 0.05 50)" },
  { label: "갈색", color: "oklch(0.47 0.09 55)" },
  { label: "금발", color: "oklch(0.8 0.12 88)" },
  { label: "적갈색", color: "oklch(0.5 0.14 35)" },
  { label: "은발", color: "oklch(0.76 0.01 265)" },
  { label: "파랑", color: "oklch(0.55 0.15 255)" },
  { label: "분홍", color: "oklch(0.72 0.14 350)" },
];

export const AVATAR_OPTION_LABELS: Record<AvatarPart, string[]> = {
  skin: SKIN_OPTIONS.map((option) => option.label),
  eyes: ["둥근 눈", "웃는 눈", "또렷한 눈", "졸린 눈", "일자 눈", "윙크"],
  hairStyle: ["민머리", "짧은 머리", "옆가르마", "곱슬머리", "단발", "긴 머리", "올림머리"],
  hairColor: HAIR_COLOR_OPTIONS.map((option) => option.label),
  accessory: ["없음", "동그란 안경", "뿔테 안경", "귀걸이", "선글라스"],
  hat: ["없음", "비니", "야구모자", "학사모", "버킷햇"],
};

/** 설정하지 않은 사람이 처음 고를 때 나머지 부위의 시작값 */
export const DEFAULT_AVATAR_PARTS: AvatarParts = {
  skin: 1,
  eyes: 0,
  hairStyle: 1,
  hairColor: 0,
  accessory: 0,
  hat: 0,
};

const AVATAR_PATTERN = /^\d{1,2}(-\d{1,2}){5}$/;

export function encodeAvatar(parts: AvatarParts): string {
  return AVATAR_PART_ORDER.map((part) => parts[part]).join("-");
}

export function decodeAvatar(value: unknown): AvatarParts | null {
  if (typeof value !== "string" || !AVATAR_PATTERN.test(value)) return null;
  const numbers = value.split("-").map(Number);
  const inRange = AVATAR_PART_ORDER.every((part, index) => numbers[index] < AVATAR_OPTION_LABELS[part].length);
  if (!inRange) return null;
  return Object.fromEntries(AVATAR_PART_ORDER.map((part, index) => [part, numbers[index]])) as AvatarParts;
}

export function randomAvatarParts(): AvatarParts {
  return Object.fromEntries(
    AVATAR_PART_ORDER.map((part) => [part, Math.floor(Math.random() * AVATAR_OPTION_LABELS[part].length)]),
  ) as AvatarParts;
}
