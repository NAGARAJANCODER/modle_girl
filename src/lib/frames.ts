/**
 * The film is a 20 s shot at 24 fps, exported as one WebP per frame:
 * public/frames/d (1600 × 904) for desktop, public/frames/m (1024 × 578) for phones.
 */
export const FPS = 24;
export const DURATION = 20;
export const FRAME_COUNT = DURATION * FPS + 1; // 481, c001 … c481

export type FrameSet = 'd' | 'm';

/** Requests in flight at once; enough to keep the pipe full without starving the hero. */
const CONCURRENCY = 6;

export const frameUrl = (set: FrameSet, i: number) =>
  `${import.meta.env.BASE_URL}frames/${set}/c${String(i + 1).padStart(3, '0')}.webp`;

/**
 * Loads `priority` frames first, then the rest coarse-to-fine (every 24th,
 * 12th, 6th, 3rd, then all) so scrubbing anywhere shows a near frame early.
 * Each image is decoded before it is handed over. Returns a cancel function.
 */
export function loadFrames(set: FrameSet, priority: number[], onLoad: (i: number, img: HTMLImageElement) => void) {
  const order: number[] = [];
  const seen = new Set<number>();
  const push = (i: number) => {
    if (i < 0 || i >= FRAME_COUNT || seen.has(i)) return;
    seen.add(i);
    order.push(i);
  };
  priority.forEach(push);
  for (const step of [24, 12, 6, 3, 1]) for (let i = 0; i < FRAME_COUNT; i += step) push(i);

  let cancelled = false;
  let next = 0;
  const pump = () => {
    if (cancelled || next >= order.length) return;
    const i = order[next++];
    const img = new Image();
    img.decoding = 'async';
    img.src = frameUrl(set, i);
    img
      .decode()
      .then(() => {
        if (!cancelled) onLoad(i, img);
      })
      .catch(() => {})
      .finally(pump);
  };
  for (let k = 0; k < CONCURRENCY; k++) pump();

  return () => {
    cancelled = true;
  };
}
