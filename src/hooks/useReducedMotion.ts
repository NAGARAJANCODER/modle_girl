import {useSyncExternalStore} from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

const subscribe = (fn: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', fn);
  return () => mq.removeEventListener('change', fn);
};

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
