import { create } from 'zustand';
import * as scheduler from '@/services/scheduler';
import { useAlarmStore } from './useAlarmStore';

type Status = 'idle' | 'running' | 'paused';

type State = {
  status: Status;
  durationMs: number;       // configured duration
  endAtMs: number | null;   // absolute end time when running
  remainingMs: number;      // last computed remaining (for paused state)
};

type Actions = {
  setDuration: (ms: number) => void;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  reset: () => Promise<void>;
};

const TIMER_ID = 'timer:default';

export const useTimerStore = create<State & Actions>((set, get) => ({
  status: 'idle',
  durationMs: 5 * 60_000,
  endAtMs: null,
  remainingMs: 5 * 60_000,

  setDuration: (ms) => {
    if (get().status !== 'idle') return;
    set({ durationMs: ms, remainingMs: ms });
  },

  start: async () => {
    const { durationMs } = get();
    if (durationMs <= 0) return;
    const endAt = Date.now() + durationMs;
    set({ status: 'running', endAtMs: endAt, remainingMs: durationMs });
    const ringtone = useAlarmStore.getState().ringtones.find(r => r.id === 'system-default') ?? null;
    await scheduler.scheduleTimer(TIMER_ID, endAt, 'Timer', ringtone);
  },

  pause: async () => {
    if (get().status !== 'running') return;
    const remaining = Math.max(0, (get().endAtMs ?? 0) - Date.now());
    set({ status: 'paused', remainingMs: remaining, endAtMs: null });
    await scheduler.cancelTimer(TIMER_ID);
  },

  resume: async () => {
    if (get().status !== 'paused') return;
    const remaining = get().remainingMs;
    const endAt = Date.now() + remaining;
    set({ status: 'running', endAtMs: endAt });
    const ringtone = useAlarmStore.getState().ringtones.find(r => r.id === 'system-default') ?? null;
    await scheduler.scheduleTimer(TIMER_ID, endAt, 'Timer', ringtone);
  },

  reset: async () => {
    set(s => ({ status: 'idle', endAtMs: null, remainingMs: s.durationMs }));
    await scheduler.cancelTimer(TIMER_ID);
  },
}));
