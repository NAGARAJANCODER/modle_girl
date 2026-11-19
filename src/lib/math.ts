export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** 0 → 1 as `v` travels from `a` to `b`, clamped. */
export const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a), 0, 1);

/** How far the viewport has scrolled through a pinned (sticky) section, 0 → 1. */
export const pinProgress = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  const travel = r.height - window.innerHeight;
  return travel > 0 ? clamp(-r.top / travel, 0, 1) : 0;
};

export const easeOut = (t: number) => 1 - (1 - t) ** 3;
export const easeIn = (t: number) => t ** 3;
export const smooth = (t: number) => t * t * (3 - 2 * t);
