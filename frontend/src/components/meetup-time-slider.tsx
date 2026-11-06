"use client";

import { Slider } from "@base-ui/react/slider";
import { clockToMinutes, minutesToClock } from "@/lib/time";

const STEP_MINUTES = 5;
const LARGE_STEP_MINUTES = 30;
const AXIS_CLOCKS = ["09:00", "12:00", "15:00", "18:00", "22:00"];
const THUMB_CLASS =
  "pointer-events-auto relative block size-6.5 touch-none rounded-full bg-card shadow-[0_3px_10px_-2px_oklch(0.2_0.008_265/0.4)] ring-1 ring-foreground/10 transition-[scale,box-shadow] duration-200 ease-fluid select-none after:absolute after:-inset-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring data-dragging:scale-110";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const isClock = (clock: string) => /^\d{2}:\d{2}$/.test(clock);
const snapDown = (minutes: number) => Math.floor(minutes / STEP_MINUTES) * STEP_MINUTES;
const snapUp = (minutes: number) => Math.ceil(minutes / STEP_MINUTES) * STEP_MINUTES;

function spokenTime(minutes: number) {
  const rest = minutes % 60;
  return `${Math.floor(minutes / 60)}시${rest > 0 ? ` ${rest}분` : ""}`;
}

/** 입력칸과 같은 값을 보여 주는 슬라이더. 직접 입력한 14:13은 그 손잡이를 움직이기 전까지 그대로 둔다. */
export function MeetupTimeSlider({
  start,
  end,
  open,
  close,
  minLength,
  maxLength,
  onChange,
}: {
  start: string;
  end: string;
  /** 하루 범위 "HH:MM" */
  open: string;
  close: string;
  /** 모임 길이 제한(분) */
  minLength: number;
  maxLength: number;
  onChange: (start: string, end: string) => void;
}) {
  const min = clockToMinutes(open);
  const max = clockToMinutes(close);
  const from = isClock(start) ? clamp(clockToMinutes(start), min, max) : min;
  const to = isClock(end) ? clamp(clockToMinutes(end), min, max) : Math.min(from + minLength, max);
  const low = Math.min(from, to);
  const high = Math.max(from, to);

  function handleChange(next: number[], thumb: number) {
    if (thumb === 0) {
      const moved = clamp(next[0], Math.max(snapUp(high - maxLength), min), Math.max(snapDown(high - minLength), min));
      onChange(minutesToClock(moved), minutesToClock(high));
    } else {
      const moved = clamp(next[1], Math.min(snapUp(low + minLength), max), Math.min(snapDown(low + maxLength), max));
      onChange(minutesToClock(low), minutesToClock(moved));
    }
  }

  return (
    <div className="select-none">
      <Slider.Root
        aria-label="모임 시간"
        value={[low, high]}
        min={min}
        max={max}
        step={STEP_MINUTES}
        largeStep={LARGE_STEP_MINUTES}
        minStepsBetweenValues={Math.ceil(minLength / STEP_MINUTES)}
        thumbCollisionBehavior="none"
        onValueChange={(next, details) => handleChange(next as number[], details.activeThumbIndex)}
      >
        {/* 폰에서는 손잡이만 잡힌다. 트랙 위로 세로로 밀면 값이 바뀌지 않고 폼이 스크롤된다. */}
        <Slider.Control className="relative mx-3 flex h-11 touch-pan-y items-center pointer-coarse:pointer-events-none">
          <Slider.Track className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
            <Slider.Indicator className="bg-foreground" />
          </Slider.Track>
          {(["시작", "끝"] as const).map((label, index) => (
            <Slider.Thumb
              key={label}
              index={index}
              aria-label={label}
              getAriaValueText={(_, value) => spokenTime(value)}
              className={THUMB_CLASS}
            />
          ))}
        </Slider.Control>
      </Slider.Root>
      <div aria-hidden="true" className="relative mx-3 h-4 text-[11px] leading-4 text-muted-foreground tabular-nums">
        {AXIS_CLOCKS.map((clock) => (
          <span
            key={clock}
            className="absolute -translate-x-1/2"
            style={{ left: `${((clockToMinutes(clock) - min) / (max - min)) * 100}%` }}
          >
            {clock}
          </span>
        ))}
      </div>
    </div>
  );
}
