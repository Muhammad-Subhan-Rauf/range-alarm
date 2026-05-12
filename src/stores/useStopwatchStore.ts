import { create } from 'zustand';

type Status = 'idle' | 'running' | 'paused';

type State = {
  status: Status;
  startedAtMs: number | null;   // absolute start time (or resume time)
  accumulatedMs: number;        // total elapsed across runs (excluding current segment)
  laps: number[];               // ms per lap, newest first
};

type Actions = {
  elapsed: () => number;        // total elapsed in ms
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  lap: () => void;
};

export const useStopwatchStore = create<State & Actions>((set, get) => ({
  status: 'idle',
  startedAtMs: null,
  accumulatedMs: 0,
  laps: [],

  elapsed: () => {
    const { status, startedAtMs, accumulatedMs } = get();
    if (status === 'running' && startedAtMs) return accumulatedMs + (Date.now() - startedAtMs);
    return accumulatedMs;
  },

  start: () => set({ status: 'running', startedAtMs: Date.now(), accumulatedMs: 0, laps: [] }),

  pause: () => {
    const { status, startedAtMs, accumulatedMs } = get();
    if (status !== 'running' || !startedAtMs) return;
    set({
      status: 'paused',
      accumulatedMs: accumulatedMs + (Date.now() - startedAtMs),
      startedAtMs: null,
    });
  },

  resume: () => {
    if (get().status !== 'paused') return;
    set({ status: 'running', startedAtMs: Date.now() });
  },

  reset: () => set({ status: 'idle', startedAtMs: null, accumulatedMs: 0, laps: [] }),

  lap: () => {
    const elapsed = get().elapsed();
    set(s => ({ laps: [elapsed, ...s.laps] }));
  },
}));
