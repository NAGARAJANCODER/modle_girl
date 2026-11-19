import Lenis from 'lenis';
import {bagStore} from './bag';

/**
 * The page's single rAF loop: advance Lenis, then hand every scroll-driven
 * component the frame so it can read its own position and write styles.
 * Nothing in here touches React state.
 */
type FrameFn = (now: number) => void;

const subs = new Set<FrameFn>();
let lenis: Lenis | null = null;
let raf = 0;

const tick = (now: number) => {
  lenis?.raf(now);
  subs.forEach((fn) => fn(now));
  raf = requestAnimationFrame(tick);
};
const ensureLoop = () => {
  if (!raf) raf = requestAnimationFrame(tick);
};

export function onFrame(fn: FrameFn) {
  subs.add(fn);
  ensureLoop();
  return () => {
    subs.delete(fn);
  };
}

/** Starts smooth scrolling (native scroll under reduced motion). Returns a cleanup. */
export function startScroll(reduced: boolean) {
  ensureLoop();
  if (!reduced) lenis = new Lenis({lerp: 0.09, anchors: true, autoRaf: false});

  // Freeze the page behind the open bag.
  const unsub = bagStore.subscribe(() => {
    if (bagStore.get().open) lenis?.stop();
    else lenis?.start();
  });

  return () => {
    unsub();
    lenis?.destroy();
    lenis = null;
  };
}
