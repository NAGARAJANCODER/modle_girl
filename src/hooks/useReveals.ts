import {useEffect, useRef} from 'react';

/** Adds `.is-in` to every `[data-reveal]` inside the ref'd element the first time it scrolls into view. */
export function useReveals<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      },
      {rootMargin: '0px 0px -8% 0px', threshold: 0.12},
    );
    root.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return ref;
}
