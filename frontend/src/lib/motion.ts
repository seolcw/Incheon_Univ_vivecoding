// 짧은 일회성 연출. 모두 transform과 opacity만 움직이고, 움직임 줄이기 설정이면 건너뛴다.

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function tick(ms = 8) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
}

const PIECE_COLORS = [
  "var(--seat-1)",
  "var(--seat-2)",
  "var(--seat-3)",
  "var(--seat-4)",
  "var(--seat-5)",
  "var(--status-meetup)",
];

interface BurstOptions {
  count?: number;
  spread?: number;
  colors?: string[];
}

/** 한 지점에서 조각을 흩뿌린다. 끝나면 DOM에서 지운다. */
export function burst(x: number, y: number, { count = 14, spread = 84, colors = PIECE_COLORS }: BurstOptions = {}) {
  if (prefersReducedMotion()) return;
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:0;height:0;z-index:70;pointer-events:none`;
  const animations: Animation[] = [];
  for (let index = 0; index < count; index += 1) {
    const piece = document.createElement("span");
    const size = 5 + Math.random() * 6;
    const angle = (index / count) * Math.PI * 2 + Math.random() * 0.5;
    const distance = spread * (0.55 + Math.random() * 0.6);
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const spin = (Math.random() - 0.5) * 300;
    piece.style.cssText = `position:absolute;left:${-size / 2}px;top:${-size / 2}px;width:${size}px;height:${size}px;border-radius:${index % 3 === 0 ? "2px" : "50%"};background:${colors[index % colors.length]}`;
    host.append(piece);
    animations.push(
      piece.animate(
        [
          { transform: "translate(0, 0) scale(0.4)", opacity: 1, offset: 0 },
          { transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(1)`, opacity: 1, offset: 0.55 },
          {
            transform: `translate(${dx * 1.12}px, ${dy + spread * 0.5}px) rotate(${spin * 1.5}deg) scale(0.5)`,
            opacity: 0,
            offset: 1,
          },
        ],
        { duration: 680 + Math.random() * 340, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
      ),
    );
  }
  document.body.append(host);
  void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => host.remove());
}

export function burstFrom(element: Element | null, options?: BurstOptions) {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  burst(rect.left + rect.width / 2, rect.top + rect.height / 2, options);
}

/**
 * 내 이름표가 버튼에서 빈자리로 날아가 앉는다. 돌려준 함수를 부르면 이름표를 치운다.
 * 저장이 끝나면 진짜 자리가 그 위치에 나타나므로, 저장을 기다리는 동안 이름표가 자리를 맡아 둔다.
 */
export function flyToSeat(from: Element | null, to: Element | null, label: string, background: string) {
  if (!from || !to || prefersReducedMotion()) return () => {};
  const start = from.getBoundingClientRect();
  const end = to.getBoundingClientRect();
  const size = end.width;
  const token = document.createElement("span");
  token.setAttribute("aria-hidden", "true");
  token.textContent = label;
  token.style.cssText = `position:fixed;left:0;top:0;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:${background};color:var(--seat-foreground);font-size:${size * 0.42}px;font-weight:700;z-index:70;pointer-events:none`;
  document.body.append(token);
  const fromX = start.left + start.width / 2 - size / 2;
  const fromY = start.top + start.height / 2 - size / 2;
  token.animate(
    [
      { transform: `translate(${fromX}px, ${fromY}px) scale(0.7)`, opacity: 0.9 },
      {
        transform: `translate(${(fromX + end.left) / 2}px, ${Math.min(fromY, end.top) - 34}px) scale(1.12)`,
        opacity: 1,
        offset: 0.5,
      },
      { transform: `translate(${end.left}px, ${end.top}px) scale(1)`, opacity: 1 },
    ],
    { duration: 460, easing: "cubic-bezier(0.3, 0.1, 0.2, 1)", fill: "forwards" },
  );
  return () => token.remove();
}
