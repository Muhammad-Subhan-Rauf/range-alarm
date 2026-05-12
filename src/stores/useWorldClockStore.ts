import { create } from 'zustand';
import * as dbApi from '@/services/db';
import type { WorldClock } from '@/types';

type State = {
  clocks: WorldClock[];
  isHydrated: boolean;
};

type Actions = {
  hydrate: () => Promise<void>;
  add: (c: Omit<WorldClock, 'id'>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

export const useWorldClockStore = create<State & Actions>((set, get) => ({
  clocks: [],
  isHydrated: false,
  hydrate: async () => {
    const clocks = await dbApi.listWorldClocks();
    set({ clocks, isHydrated: true });
  },
  add: async ({ label, timezone }) => {
    const id = `wc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await dbApi.upsertWorldClock({ id, label, timezone }, get().clocks.length);
    set(s => ({ clocks: [...s.clocks, { id, label, timezone }] }));
  },
  remove: async (id) => {
    await dbApi.deleteWorldClock(id);
    set(s => ({ clocks: s.clocks.filter(c => c.id !== id) }));
  },
}));
