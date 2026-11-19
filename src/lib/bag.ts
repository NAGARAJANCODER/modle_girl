import {useSyncExternalStore} from 'react';

/** A tiny external store for the bag, so adds from any card update the nav, drawer and toast. */
export type Bag = Record<string, number>;
type Flash = {id: string; at: number};
type State = {bag: Bag; open: boolean; flash: Flash | null};

let state: State = {bag: {}, open: false, flash: null};
const subs = new Set<() => void>();
const emit = (next: Partial<State>) => {
  state = {...state, ...next};
  subs.forEach((fn) => fn());
};

export const bagStore = {
  subscribe(fn: () => void) {
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  },
  get: () => state,
  add(id: string, n = 1) {
    emit({bag: {...state.bag, [id]: Math.min(99, (state.bag[id] ?? 0) + n)}});
  },
  set(id: string, n: number) {
    const bag = {...state.bag};
    if (n <= 0) delete bag[id];
    else bag[id] = Math.min(99, n);
    emit({bag});
  },
  setOpen(open: boolean) {
    if (open !== state.open) emit({open});
  },
  /** Announces an add (a product id, or 'set') to the toast and the nav counter. */
  flash(id: string) {
    emit({flash: {id, at: Date.now()}});
  },
};

export const bagCount = (bag: Bag) => Object.values(bag).reduce((a, n) => a + n, 0);

export const useBag = () => useSyncExternalStore(bagStore.subscribe, () => state.bag);
export const useBagOpen = () => useSyncExternalStore(bagStore.subscribe, () => state.open);
export const useFlash = () => useSyncExternalStore(bagStore.subscribe, () => state.flash);
