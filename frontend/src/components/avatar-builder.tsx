"use client";

import { Dices } from "lucide-react";
import { useId, useRef, useState, type CSSProperties } from "react";
import { AvatarFace } from "@/components/avatar-face";
import { seatColor } from "@/components/seat-row";
import { Button } from "@/components/ui/button";
import {
  AVATAR_OPTION_LABELS,
  AVATAR_PART_LABELS,
  AVATAR_PART_ORDER,
  decodeAvatar,
  DEFAULT_AVATAR_PARTS,
  encodeAvatar,
  HAIR_COLOR_OPTIONS,
  randomAvatarParts,
  SKIN_OPTIONS,
  type AvatarPart,
  type AvatarParts,
} from "@/lib/avatar";
import { burstFrom, tick } from "@/lib/motion";

const SWATCHES: Partial<Record<AvatarPart, { color: string }[]>> = {
  skin: SKIN_OPTIONS,
  hairColor: HAIR_COLOR_OPTIONS,
};

function PartGroup({
  part,
  shown,
  selected,
  onPick,
}: {
  part: AvatarPart;
  /** 썸네일의 나머지 부위. 아직 설정 전이면 시작값이다. */
  shown: AvatarParts;
  /** 실제로 고른 값. 설정 전이면 null이라 아무것도 선택되지 않는다. */
  selected: number | null;
  onPick: (index: number) => void;
}) {
  const id = useId();
  const labels = AVATAR_OPTION_LABELS[part];
  const swatches = SWATCHES[part];
  return (
    <div className="grid gap-1.5">
      <p id={`${id}-label`} className="flex items-baseline justify-between gap-2 text-sm font-semibold">
        {AVATAR_PART_LABELS[part]}
        {selected !== null && <span className="text-xs font-medium text-muted-foreground">{labels[selected]}</span>}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        className={`grid gap-1.5 ${part === "hairColor" ? "grid-cols-8" : "grid-cols-6"}`}
      >
        {labels.map((label, index) => (
          <label
            key={label}
            title={label}
            data-selected={selected === index}
            className="avatar-option relative block aspect-square cursor-pointer rounded-full bg-muted"
          >
            <input
              type="radio"
              name={id}
              aria-label={label}
              checked={selected === index}
              onChange={() => onPick(index)}
              className="sr-only"
            />
            {swatches ? (
              <span
                aria-hidden="true"
                className="absolute inset-[3px] rounded-full ring-1 ring-foreground/10"
                style={{ backgroundColor: swatches[index].color }}
              />
            ) : (
              <AvatarFace parts={{ ...shown, [part]: index }} />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

/**
 * 얼굴 편집기. 값은 부모가 들고, 고를 때마다 onChange로 바로 알린다.
 * value가 null이면 이름 첫 글자 상태이고, 아무 부위나 고르면 그때 얼굴이 생긴다.
 */
export function AvatarBuilder({
  value,
  onChange,
  initial,
  seed,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  initial: string;
  seed: string;
}) {
  const parts = decodeAvatar(value);
  const [draft, setDraft] = useState<AvatarParts>(parts ?? DEFAULT_AVATAR_PARTS);
  const preview = useRef<HTMLSpanElement>(null);
  const shown = parts ?? draft;

  function apply(next: AvatarParts) {
    setDraft(next);
    onChange(encodeAvatar(next));
    tick();
  }

  function shuffle() {
    apply(randomAvatarParts());
    burstFrom(preview.current, { count: 10, spread: 64 });
  }

  function clearFace() {
    setDraft(shown);
    onChange(null);
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex items-center gap-4">
        <span
          ref={preview}
          className="seat"
          style={
            {
              width: 92,
              height: 92,
              fontSize: 38,
              backgroundColor: seatColor(seed),
              color: "var(--seat-foreground)",
            } as CSSProperties
          }
        >
          {parts ? <span key={value} className="avatar-pop absolute inset-0"><AvatarFace parts={parts} /></span> : initial}
        </span>
        <div className="grid min-w-0 flex-1 justify-items-start gap-1.5">
          <p aria-live="polite" className="text-xs font-medium text-muted-foreground">
            {parts ? "자리에 이 얼굴로 앉아요" : "지금은 이름 첫 글자로 보여요"}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={shuffle}>
            <Dices aria-hidden="true" />
            무작위
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={!parts} onClick={clearFace}>
            이름 첫 글자로 쓰기
          </Button>
        </div>
      </div>
      <div className="grid max-h-[40dvh] gap-3 overflow-x-hidden overflow-y-auto p-1 pr-1.5">
        {AVATAR_PART_ORDER.map((part) => (
          <PartGroup
            key={part}
            part={part}
            shown={shown}
            selected={parts ? parts[part] : null}
            onPick={(index) => apply({ ...shown, [part]: index })}
          />
        ))}
      </div>
    </div>
  );
}
