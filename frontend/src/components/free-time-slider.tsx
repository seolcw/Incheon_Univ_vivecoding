"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { tick } from "@/lib/motion";

const OPTIONS = [
  { value: 0, label: "전체" },
  { value: 30, label: "30분" },
  { value: 60, label: "60분" },
  { value: 120, label: "120분" },
];
const LAST = OPTIONS.length - 1;
/** 드래그 중 가까운 눈금 쪽으로 끌리는 정도 */
const MAGNET = 0.55;
const THUMB_RADIUS = 15;
/** 터치는 이만큼 가로로 움직여야 조작으로 본다. 세로 스크롤 중 스쳐도 값이 바뀌지 않는다. */
const TOUCH_SLOP_PX = 6;

/** 눈금에 걸리듯 움직이는 최소 여유 시간 조절. 도면이 드래그를 따라 바로 반응한다. */
export function FreeTimeSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const rail = useRef<HTMLDivElement>(null);
  const [dragPosition, setDragPosition] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const index = Math.max(
    OPTIONS.findIndex((option) => option.value === value),
    0,
  );

  function select(nextIndex: number) {
    if (nextIndex === index) return;
    onChange(OPTIONS[nextIndex].value);
    tick();
  }

  function moveTo(clientX: number) {
    const box = rail.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    const raw = Math.min(Math.max((clientX - box.left) / box.width, 0), 1);
    const nearest = Math.round(raw * LAST);
    setDragPosition(raw + (nearest / LAST - raw) * MAGNET);
    select(nearest);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.pointerType === "touch") touchStartX.current = event.clientX;
    else moveTo(event.clientX);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (dragPosition !== null) {
      moveTo(event.clientX);
    } else if (touchStartX.current !== null && Math.abs(event.clientX - touchStartX.current) > TOUCH_SLOP_PX) {
      touchStartX.current = null;
      moveTo(event.clientX);
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    // 움직이지 않고 뗀 터치는 그 자리를 누른 것으로 처리한다.
    if (touchStartX.current !== null) moveTo(event.clientX);
    touchStartX.current = null;
    setDragPosition(null);
  }

  function handlePointerCancel() {
    touchStartX.current = null;
    setDragPosition(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    const target = {
      ArrowRight: index + 1,
      ArrowUp: index + 1,
      ArrowLeft: index - 1,
      ArrowDown: index - 1,
      Home: 0,
      End: LAST,
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    select(Math.min(Math.max(target, 0), LAST));
  }

  return (
    <div
      className="free-slider select-none"
      data-dragging={dragPosition !== null}
      style={{ "--p": dragPosition ?? index / LAST } as CSSProperties}
    >
      <p id="free-time-label" className="mb-1 text-sm font-semibold">
        최소 여유 시간
      </p>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="cursor-grab active:cursor-grabbing"
      >
        <div className="relative h-11">
          <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full bg-muted">
            <div className="free-slider-fill absolute inset-0 bg-foreground" />
          </div>
          <div ref={rail} className="absolute inset-y-0" style={{ left: THUMB_RADIUS, right: THUMB_RADIUS }}>
            {OPTIONS.map((option, optionIndex) => (
              <span
                key={option.value}
                aria-hidden="true"
                data-passed={optionIndex <= index}
                data-current={optionIndex === index}
                className="free-slider-tick absolute top-1/2 -mt-1 -ml-px h-2 w-0.5 rounded-full bg-foreground/25"
                style={{ left: `${(optionIndex / LAST) * 100}%` }}
              />
            ))}
            <div className="free-slider-rail pointer-events-none absolute inset-y-0 left-0 w-full">
              <span
                role="slider"
                tabIndex={0}
                aria-labelledby="free-time-label"
                aria-valuemin={0}
                aria-valuemax={120}
                aria-valuenow={OPTIONS[index].value}
                aria-valuetext={OPTIONS[index].label}
                onKeyDown={handleKeyDown}
                className="free-slider-thumb pointer-events-auto absolute top-1/2 left-0 block rounded-full bg-card shadow-[0_3px_10px_-2px_oklch(0.2_0.008_265/0.4)] ring-1 ring-foreground/10 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                style={{
                  width: THUMB_RADIUS * 2,
                  height: THUMB_RADIUS * 2,
                  marginTop: -THUMB_RADIUS,
                  marginLeft: -THUMB_RADIUS,
                }}
              />
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="relative h-5" style={{ marginInline: THUMB_RADIUS }}>
          {OPTIONS.map((option, optionIndex) => (
            <span
              key={option.value}
              className={`absolute -translate-x-1/2 text-xs whitespace-nowrap tabular-nums transition-colors duration-200 ${
                optionIndex === index ? "font-bold text-foreground" : "text-muted-foreground"
              }`}
              style={{ left: `${(optionIndex / LAST) * 100}%` }}
            >
              {option.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
