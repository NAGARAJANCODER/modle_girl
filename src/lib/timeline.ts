import {clamp, easeIn, easeOut, range, smooth} from './math';

/**
 * The whole camera move, laid out on the Stage's scroll progress (0 → 1).
 * The film holds at 0 s (wide), 5 s (face), 10 s (earring), 15 s (pendant)
 * and 20 s (ring). Change a window and every beat after it moves.
 */

/** [scroll progress, film seconds]. Each segment eases in and out so the camera settles on its holds. */
export const REMAP: [p: number, t: number][] = [
  [0, 0],
  [0.03, 0], // wide shot holds while the hero copy clears
  [0.15, 5], // crane up to her face
  [0.25, 10], // into the earring
  [0.35, 10], // hold — Undertow Drops
  [0.46, 15], // down her neck to the pendant
  [0.56, 15], // hold — Deep End Pendant
  [0.67, 20], // down to the ring on her hand
  [0.77, 20], // hold — Night Swim Ring
  [0.86, 0], // rewind, ~4× faster than forward, to the wide shot
  [1, 0], // wide shot holds under the outro until the closing sheet rises
];

/** Hero copy blurs away as the crane begins. */
export const HERO_OUT: [number, number] = [0.015, 0.08];

/** Outro lines rise once the rewind has landed on the wide shot (0.86). */
export const OUTRO_IN: [number, number] = [0.865, 0.94];

export type Card = {
  side: 'left' | 'right';
  /** Slides in starting exactly when the camera settles on its piece. */
  in: [number, number];
  /** Slides out, finishing exactly as the camera starts to move again. */
  out: [number, number];
};

// One per product, in order. Sides keep the card off the jewel: the earring
// and ring sit left of centre; the pendant is central, so it alternates.
export const CARDS: Card[] = [
  {side: 'right', in: [0.25, 0.285], out: [0.32, 0.35]},
  {side: 'left', in: [0.46, 0.495], out: [0.53, 0.56]},
  {side: 'right', in: [0.67, 0.705], out: [0.74, 0.77]},
];

/** How far a card is in, 0 → 1. */
export const cardAmount = (p: number, c: Card) =>
  easeOut(range(p, c.in[0], c.in[1])) * (1 - easeIn(range(p, c.out[0], c.out[1])));

/** How much any card is holding the screen — the amount the film is narrowed by. */
export const holdAmount = (p: number) => Math.max(...CARDS.map((c) => cardAmount(p, c)));

/** Where the jewel sits in the frame (0–1 of the image) and how tight to crop on it, by film time. */
const FOCI: {t: number; x: number; y: number; z: number}[] = [
  {t: 0, x: 0.5, y: 0.55, z: 1},
  {t: 5, x: 0.5, y: 0.4, z: 1},
  {t: 10, x: 0.44, y: 0.57, z: 1.06},
  {t: 15, x: 0.47, y: 0.78, z: 1.06},
  {t: 20, x: 0.39, y: 0.48, z: 1.06},
];

export const focalAt = (t: number) => {
  const tt = clamp(t, 0, FOCI[FOCI.length - 1].t);
  let i = 1;
  while (i < FOCI.length - 1 && FOCI[i].t < tt) i++;
  const a = FOCI[i - 1];
  const b = FOCI[i];
  const k = smooth(range(tt, a.t, b.t));
  return {x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, zoom: a.z + (b.z - a.z) * k};
};
