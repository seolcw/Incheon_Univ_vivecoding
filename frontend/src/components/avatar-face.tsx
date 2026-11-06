import type { ReactNode } from "react";
import { decodeAvatar, HAIR_COLOR_OPTIONS, SKIN_OPTIONS, type AvatarParts } from "@/lib/avatar";

// viewBox 0–100에 층을 쌓는다. 순서: 뒷머리 → 목·귀·얼굴 → 눈 → 앞머리 → 액세서리 → 모자.
// 눈은 (39,58), (61,58)에 맞춰 안경과 선글라스가 어떤 눈매든 덮는다.
// 모자를 쓰면 머리를 HAT_LINE 아래만 그리고, 모자의 띠가 그 잘린 선을 덮는다.

const HAT_LINE = 43;
const INK = "oklch(0.22 0.012 265)";

const HAIR_STYLES: { back?: string; front?: string; hidesEars?: boolean }[] = [
  {},
  {
    front:
      "M20.5 58C16 32 32 15 50 15C68 15 84 32 79.5 58C78 50 75 45 71 42C60 44 42 44 29 42C25 45 22 50 20.5 58Z",
  },
  {
    front:
      "M20.5 60C15 32 31 14 52 14C70 14 85 32 79.5 60C78 52 76 47 72 43C60 44 46 40 38 33C36 41 28 47 24 50C22 53 21 56 20.5 60Z",
  },
  {
    front:
      "M19 60a9 9 0 0 1-3-15a10 10 0 0 1 6-16a11 11 0 0 1 16-12a11 11 0 0 1 24 0a11 11 0 0 1 16 12a10 10 0 0 1 6 16a9 9 0 0 1-3 15C78 52 74 46 68 44a8 8 0 0 1-12 1a8 8 0 0 1-12 0a8 8 0 0 1-12-1C26 46 22 52 19 60Z",
  },
  {
    back: "M17 54C15 30 32 14 50 14C68 14 85 30 83 54L85 80C85 86 78 88 72 86L28 86C22 88 15 86 15 80Z",
    front: "M22 62C18 36 33 18 50 18C67 18 82 36 78 62C77 52 74 46 70 43C58 46 42 46 30 43C26 46 23 52 22 62Z",
    hidesEars: true,
  },
  {
    back: "M17 54C15 30 32 14 50 14C68 14 85 30 83 54L88 100L12 100Z",
    front: "M21 66C17 36 33 18 50 18C67 18 83 36 79 66C78 54 72 44 58 38L50 31L42 38C28 44 22 54 21 66Z",
    hidesEars: true,
  },
  {
    front:
      "M50 3a10 10 0 0 1 0 20a10 10 0 0 1 0-20ZM21.5 56C17 34 33 19 50 19C67 19 83 34 78.5 56C76 46 68 38 50 38C32 38 24 46 21.5 56Z",
  },
];

/** 모자 아래로만 머리를 보이게 한다. 안쪽 svg는 자기 영역 밖을 그리지 않는다. */
function BelowHat({ on, children }: { on: boolean; children: ReactNode }) {
  if (!on) return children;
  return (
    <svg x="0" y={HAT_LINE} width="100" height={100 - HAT_LINE} viewBox={`0 ${HAT_LINE} 100 ${100 - HAT_LINE}`}>
      {children}
    </svg>
  );
}

function Eyes({ variant }: { variant: number }) {
  const line = { fill: "none", stroke: INK, strokeWidth: 3.6, strokeLinecap: "round" as const };
  if (variant === 1) {
    return (
      <>
        <path d="M33 60Q39 51 45 60" {...line} />
        <path d="M55 60Q61 51 67 60" {...line} />
      </>
    );
  }
  if (variant === 2) {
    return (
      <>
        {[39, 61].map((x) => (
          <g key={x}>
            <circle cx={x} cy="58" r="6.8" fill="white" />
            <circle cx={x} cy="58.5" r="4" fill={INK} />
            <path d={`M${x - 7} 55Q${x} 48.5 ${x + 7} 55`} fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          </g>
        ))}
      </>
    );
  }
  if (variant === 3) {
    return (
      <>
        {[39, 61].map((x) => (
          <path key={x} d={`M${x - 6.5} 56.5h13a6.5 6.5 0 0 1-13 0Z`} fill={INK} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
        ))}
      </>
    );
  }
  if (variant === 4) {
    return (
      <>
        <path d="M33 58H45" {...line} />
        <path d="M55 58H67" {...line} />
      </>
    );
  }
  if (variant === 5) {
    return (
      <>
        <circle cx="39" cy="58" r="4.8" fill={INK} />
        <path d="M55 60Q61 52 67 60" {...line} />
      </>
    );
  }
  return (
    <>
      {[39, 61].map((x) => (
        <g key={x}>
          <circle cx={x} cy="58" r="4.8" fill={INK} />
          <circle cx={x + 1.6} cy="56.4" r="1.4" fill="white" />
        </g>
      ))}
    </>
  );
}

function Accessory({ variant }: { variant: number }) {
  if (variant === 1) {
    return (
      <g fill="oklch(1 0 0 / 0.16)" stroke={INK} strokeWidth="2.6">
        <circle cx="38" cy="58" r="10.5" />
        <circle cx="62" cy="58" r="10.5" />
        <path d="M48.5 57Q50 55.5 51.5 57M27.5 56L23 54M72.5 56L77 54" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (variant === 2) {
    return (
      <g fill="oklch(1 0 0 / 0.16)" stroke={INK} strokeWidth="3.6" strokeLinejoin="round">
        <rect x="27" y="49.5" width="20" height="16" rx="4" />
        <rect x="53" y="49.5" width="20" height="16" rx="4" />
        <path d="M47 55H53M27 54L23 53M73 54L77 53" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (variant === 3) {
    return (
      <g fill="oklch(0.74 0.16 80)" stroke={INK} strokeWidth="1.2">
        <circle cx="22.5" cy="71" r="4" />
        <circle cx="77.5" cy="71" r="4" />
      </g>
    );
  }
  if (variant === 4) {
    return (
      <g>
        <path d="M27 56L23 54M73 56L77 54M47 54.5H53" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
        <rect x="26" y="49" width="22" height="18" rx="6" fill={INK} />
        <rect x="52" y="49" width="22" height="18" rx="6" fill={INK} />
        <path d="M30 54L36 52M56 54L62 52" stroke="white" strokeOpacity="0.55" strokeWidth="2.2" strokeLinecap="round" />
      </g>
    );
  }
  return null;
}

function Hat({ variant }: { variant: number }) {
  if (variant === 1) {
    return (
      <g>
        <path d="M18 40C18 16 32 6 50 6C68 6 82 16 82 40Z" fill="var(--status-class)" />
        <rect x="14" y="31" width="72" height="14" rx="7" fill="oklch(0.42 0.17 27)" />
      </g>
    );
  }
  if (variant === 2) {
    return (
      <g>
        <path d="M18 44C18 16 33 6 50 6C67 6 82 16 82 44Z" fill="var(--status-meetup)" />
        <path d="M12 44C24 36 76 36 88 44C90 50 82 50 74 47.5C60 43.5 40 43.5 26 47.5C18 50 10 50 12 44Z" fill="oklch(0.38 0.18 263)" />
      </g>
    );
  }
  if (variant === 3) {
    return (
      <g>
        <path d="M18 45V26H82V45C66 39.5 34 39.5 18 45Z" fill={INK} />
        <path d="M50 4L95 21L50 37L5 21Z" fill={INK} stroke="oklch(0.36 0.012 265)" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M50 20.5L82 25V38" fill="none" stroke="oklch(0.78 0.15 85)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="82" cy="40" r="3.2" fill="oklch(0.78 0.15 85)" />
      </g>
    );
  }
  if (variant === 4) {
    return (
      <g>
        <path d="M25 36C25 15 36 7 50 7C64 7 75 15 75 36Z" fill="oklch(0.72 0.07 90)" />
        <path d="M8 45C16 29 84 29 92 45C94 50 86 50 80 48C60 43 40 43 20 48C14 50 6 50 8 45Z" fill="oklch(0.62 0.08 88)" />
      </g>
    );
  }
  return null;
}

/** 층을 쌓은 얼굴. 스스로 동그랗게 잘린다. 이름은 바깥에서 알려 주므로 보조기술에는 숨긴다. */
export function AvatarFace({ parts, className = "seat-face" }: { parts: AvatarParts; className?: string }) {
  const skin = SKIN_OPTIONS[parts.skin].color;
  const hairColor = HAIR_COLOR_OPTIONS[parts.hairColor].color;
  const hair = HAIR_STYLES[parts.hairStyle];
  const hatOn = parts.hat > 0;

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 100 100" className={className}>
      {hair.back && (
        <BelowHat on={hatOn}>
          <path d={hair.back} fill={hairColor} />
        </BelowHat>
      )}
      <path d="M40 78H60V102H40Z" fill={skin} />
      <path d="M40 78H60V102H40Z" fill={INK} opacity="0.14" />
      {!hair.hidesEars && (
        <g fill={skin}>
          <circle cx="23" cy="60" r="6.5" />
          <circle cx="77" cy="60" r="6.5" />
        </g>
      )}
      <path d="M23 56C23 38 35 28 50 28C65 28 77 38 77 56C77 76 65 88 50 88C35 88 23 76 23 56Z" fill={skin} />
      <g fill="var(--status-class)" opacity="0.18">
        <ellipse cx="31.5" cy="68.5" rx="5" ry="3.4" />
        <ellipse cx="68.5" cy="68.5" rx="5" ry="3.4" />
      </g>
      <path d="M33.5 48.5Q39 45.5 44.5 48.5M55.5 48.5Q61 45.5 66.5 48.5" fill="none" stroke={hairColor} strokeWidth="2.8" strokeLinecap="round" />
      <Eyes variant={parts.eyes} />
      <path d="M43.5 74Q50 79.5 56.5 74" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      {hair.front && (
        <BelowHat on={hatOn}>
          <path d={hair.front} fill={hairColor} />
        </BelowHat>
      )}
      <Accessory variant={parts.accessory} />
      <Hat variant={parts.hat} />
    </svg>
  );
}

/** 유효한 아바타면 얼굴, 아니면 이름 첫 글자. 자리 원 안에 넣는다. */
export function FaceOrInitial({ avatar, initial }: { avatar?: string | null; initial: string }) {
  const parts = decodeAvatar(avatar);
  return parts ? <AvatarFace parts={parts} /> : <>{initial}</>;
}
