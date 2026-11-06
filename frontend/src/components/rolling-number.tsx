"use client";

import { useEffect, useState } from "react";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** 숫자판처럼 자리마다 굴러 가는 숫자. 처음에는 0에서 올라온다. */
export function RollingNumber({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const text = String(value);
  const digits = String(shown).padStart(text.length, "0").slice(-text.length);

  return (
    <span className={`roll ${className ?? ""}`}>
      <span className="sr-only">{value}</span>
      {digits.split("").map((digit, index) => (
        <span key={text.length - index} aria-hidden="true" className="roll-col">
          <span
            className="roll-strip"
            style={{ transform: `translateY(${-Number(digit) * 10}%)`, transitionDelay: `${index * 50}ms` }}
          >
            {DIGITS.map((item) => (
              <span key={item} data-digit={item} />
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}
