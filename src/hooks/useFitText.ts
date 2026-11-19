import {useEffect, useRef} from 'react';

/** Sizes a single line of text so it spans exactly its parent's width (the footer wordmark). */
export function useFitText<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const fit = () => {
      el.style.fontSize = '100px';
      const w = el.getBoundingClientRect().width;
      // A hair under full width so sub-pixel rounding never causes sideways scroll.
      if (w) el.style.fontSize = `${(100 * parent.clientWidth * 0.995) / w}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(parent);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, []);

  return ref;
}
