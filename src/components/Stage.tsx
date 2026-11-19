import {useEffect, useRef} from 'react';
import {DURATION, FPS, FRAME_COUNT, loadFrames, type FrameSet} from '../lib/frames';
import {clamp, pinProgress, range} from '../lib/math';
import {onFrame} from '../lib/scroll';
import {CARDS, HERO_OUT, OUTRO_IN, REMAP, cardAmount, focalAt, holdAmount} from '../lib/timeline';
import {products} from '../content';
import {HeroCopy} from './HeroCopy';
import {ProductCard} from './ProductCard';
import {Outro} from './Outro';
import {ChapterRail} from './ChapterRail';

/** Frames the preloader waits for before lifting (coarse spread across the film). */
const READY_AT = 28;

type Props = {onProgress: (loaded: number) => void};

export function Stage({onProgress}: Props) {
  const root = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const outroRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const section = root.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d', {alpha: false})!;
    const frames: (HTMLImageElement | undefined)[] = new Array(FRAME_COUNT);
    let loaded = 0;

    const mobile = () => window.innerWidth < 768;
    const set: FrameSet = mobile() ? 'm' : 'd';
    // The hero frame, then every hold frame, so each landing is sharp first.
    const holds = [0, 5, 10, 15, DURATION].map((s) => Math.round(s * FPS));
    const cancel = loadFrames(set, holds, (i, img) => {
      frames[i] = img;
      loaded++;
      if (loaded <= READY_AT + 1) onProgress(Math.min(1, loaded / READY_AT));
      dirty = true;
    });

    // ---- canvas sizing -------------------------------------------------
    let W = 0;
    let H = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingQuality = 'high';
      dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const nearest = (i: number) => {
      for (let d = 0; d < FRAME_COUNT; d++) {
        if (frames[i - d]) return frames[i - d]!;
        if (frames[i + d]) return frames[i + d]!;
      }
      return undefined;
    };

    /** Cover-fit a frame into a rect, cropping around the jewel rather than the centre. */
    const draw = (img: HTMLImageElement, rx: number, ry: number, rw: number, rh: number, fx: number, fy: number, zoom: number) => {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const s = Math.max(rw / iw, rh / ih) * zoom;
      const vw = rw / s;
      const vh = rh / s;
      const sx = clamp(fx * iw - vw / 2, 0, iw - vw);
      const sy = clamp(fy * ih - vh / 2, 0, ih - vh);
      ctx.drawImage(img, sx, sy, vw, vh, rx, ry, rw, rh);
    };

    // ---- per-frame state ------------------------------------------------
    let playhead = 0;
    let last = performance.now();
    let dirty = true;
    let lastKey = '';
    const cardE = [0, 0, 0];
    const heroEls = () => Array.from(heroRef.current?.querySelectorAll<HTMLElement>('[data-out]') ?? []);
    let heroNodes = heroEls();
    let heroK = -1;
    let outroK = -1;
    let railState = '';

    const styleCard = (el: HTMLElement, e: number, side: 'left' | 'right', isMobile: boolean) => {
      const off = (1 - e) * 100;
      el.style.transform = isMobile
        ? `translate3d(0, ${off}%, 0)`
        : `translate3d(${side === 'left' ? -off : off}%, 0, 0)`;
      el.style.visibility = e < 0.002 ? 'hidden' : 'visible';
      // Contents follow the panel in, one row after another.
      el.querySelectorAll<HTMLElement>('[data-k]').forEach((k, j) => {
        const ke = reduced ? 1 : clamp(e * 1.5 - j * 0.07, 0, 1);
        k.style.opacity = String(ke);
        k.style.transform = ke >= 1 ? '' : `translate3d(0, ${(1 - ke) * 18}px, 0)`;
      });
    };

    /** Film seconds for a scroll progress: piecewise along REMAP, each segment eased in and out. */
    const filmAt = (p: number) => {
      for (let i = 1; i < REMAP.length; i++) {
        const [p1, t1] = REMAP[i];
        if (p > p1) continue;
        const [p0, t0] = REMAP[i - 1];
        const k = range(p, p0, p1);
        return t0 + (t1 - t0) * k * k * (3 - 2 * k);
      }
      return REMAP[REMAP.length - 1][1];
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let wasMobile = mobile();

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const isMobile = mobile();
      if (isMobile !== wasMobile) {
        wasMobile = isMobile;
        cardE.fill(-1);
      }
      const p = pinProgress(section);

      // Playhead chases the scroll a touch, so the film glides between frames.
      const target = filmAt(p);
      playhead = reduced ? target : playhead + (target - playhead) * (1 - Math.exp(-dt * 14));
      if (Math.abs(target - playhead) < 0.002) playhead = target;
      const idx = clamp(Math.round(playhead * FPS), 0, FRAME_COUNT - 1);

      // ---- cards: slide in on the hold, and narrow the film beside them ----
      let active = -1;
      CARDS.forEach((c, i) => {
        const e = cardAmount(p, c);
        const el = cardRefs.current[i];
        if (el && e !== cardE[i]) styleCard(el, e, c.side, isMobile);
        cardE[i] = e;
        if (e > 0 && (active < 0 || e > cardE[active])) active = i;
      });
      const hold = holdAmount(p);
      let rx = 0;
      let ry = 0;
      let rw = W;
      let rh = H;
      const card = active >= 0 ? cardRefs.current[active] : null;
      if (card && hold > 0) {
        if (isMobile) {
          rh = Math.max(1, H - card.offsetHeight * hold);
        } else {
          const cover = card.offsetWidth * hold;
          rw = Math.max(1, W - cover);
          if (CARDS[active].side === 'left') rx = cover;
        }
      }

      // ---- film ----
      const outro = range(p, OUTRO_IN[0], OUTRO_IN[1]);
      const f = focalAt(playhead);
      const zoom = 1 + (f.zoom - 1) * hold;
      const key = `${idx}|${rx | 0}|${ry | 0}|${rw | 0}|${rh | 0}|${zoom.toFixed(3)}|${outro.toFixed(3)}|${W}x${H}`;
      if ((dirty || key !== lastKey) && W && H) {
        const img = frames[idx] ?? nearest(idx);
        if (img) {
          ctx.fillStyle = '#060809';
          ctx.fillRect(0, 0, W, H);
          draw(img, rx, ry, rw, rh, f.x, f.y, zoom);
          // Dim the wide shot under the outro so the type reads.
          if (outro > 0) {
            ctx.fillStyle = `rgba(6, 8, 9, ${0.5 * outro})`;
            ctx.fillRect(0, 0, W, H);
          }
          lastKey = key;
          // Keep redrawing until the exact frame (not a neighbour) has arrived.
          dirty = !frames[idx];
        }
      }

      // ---- hero copy blurs away as the crane begins ----
      const hk = range(p, HERO_OUT[0], HERO_OUT[1]);
      if (hk !== heroK) {
        heroK = hk;
        if (!heroNodes.length) heroNodes = heroEls();
        heroNodes.forEach((n, j) => {
          const k = clamp(hk * 1.4 - j * 0.06, 0, 1);
          n.style.opacity = String(1 - k);
          n.style.filter = reduced || k === 0 ? '' : `blur(${k * 10}px)`;
          n.style.transform = reduced || k === 0 ? '' : `translate3d(0, ${-k * 24}px, 0)`;
        });
        if (heroRef.current) heroRef.current.style.visibility = hk >= 1 ? 'hidden' : 'visible';
      }

      // ---- outro lines rise out of their masks ----
      if (outro !== outroK && outroRef.current) {
        outroK = outro;
        outroRef.current.style.visibility = outro > 0 ? 'visible' : 'hidden';
        outroRef.current.querySelectorAll<HTMLElement>('[data-line]').forEach((l, j) => {
          const k = reduced ? (outro > 0 ? 1 : 0) : clamp(outro * 1.35 - j * 0.35, 0, 1);
          const eased = 1 - (1 - k) ** 3;
          l.style.transform = `translate3d(0, ${(1 - eased) * 110}%, 0)`;
        });
      }

      // ---- chapter rail ----
      const rail = railRef.current;
      if (rail) {
        const [c0, c1, c2] = CARDS;
        const visible = p >= c0.in[0] - 0.04 && p <= c2.out[1];
        const fill = 0.5 * range(p, c0.in[0], c1.in[0]) + 0.5 * range(p, c1.in[0], c2.in[0]);
        let on = -1;
        CARDS.forEach((c, i) => {
          if (p >= c.in[0]) on = i;
        });
        const state = `${visible}|${on}|${fill.toFixed(3)}`;
        if (state !== railState) {
          railState = state;
          rail.style.opacity = visible ? '1' : '0';
          rail.style.setProperty('--fill', fill.toFixed(3));
          rail.querySelectorAll<HTMLElement>('[data-ch]').forEach((ch, i) => {
            if (visible && i === on) ch.setAttribute('data-on', '');
            else ch.removeAttribute('data-on');
          });
        }
      }
    };

    const stop = onFrame(tick);
    return () => {
      stop();
      cancel();
      ro.disconnect();
    };
  }, [onProgress]);

  return (
    <section ref={root} id="film" aria-label={`${products.length} pieces, one camera move`} className="relative h-[1000svh]">
      <div className="sticky top-0 h-svh overflow-hidden">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="At night, a woman in black sits at the edge of a lit pool, Paraíba-blue stones at her ears, throat and hand."
          className="absolute inset-0 h-full w-full"
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-ink/60 to-transparent" />
        <HeroCopy ref={heroRef} />
        {products.map((p, i) => (
          <ProductCard
            key={p.id}
            product={p}
            side={CARDS[i].side}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
          />
        ))}
        <Outro ref={outroRef} />
        <ChapterRail ref={railRef} />
      </div>
    </section>
  );
}
