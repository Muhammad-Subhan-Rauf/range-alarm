import { create } from 'zustand';
import * as dbApi from '@/services/db';
import * as scheduler from '@/services/scheduler';
import { seedBundledRingtones, pickAndImportRingtone, deleteUserRingtone } from '@/services/ringtoneService';
import type { AlarmGroup, AlarmInstance, Ringtone } from '@/types';

type State = {
  groups: AlarmGroup[];
  instancesByGroup: Record<string, AlarmInstance[]>;
  ringtones: Ringtone[];
  selectedGroupIds: Set<string>;
  isHydrated: boolean;
};

type Actions = {
  hydrate: () => Promise<void>;
  refreshGroups: () => Promise<void>;
  refreshInstances: (groupId: string) => Promise<void>;
  refreshRingtones: () => Promise<void>;

  saveGroup: (g: AlarmGroup) => Promise<void>;
  toggleGroup: (groupId: string, enabled: boolean) => Promise<void>;
  removeGroups: (ids: string[]) => Promise<void>;

  setInstanceSkipped: (groupId: string, instanceId: string, skipped: boolean) => Promise<void>;

  // Batch ops
  batchPatch: (
    ids: string[],
    patch: Partial<Pick<AlarmGroup, 'ringtoneId' | 'snoozeMs' | 'snoozeMaxRepeats' | 'vibrate' | 'repeatDays' | 'label'>>,
  ) => Promise<void>;

  selectGroup: (id: string, selected: boolean) => void;
  clearSelection: () => void;
  toggleSelection: (id: string) => void;
  setAllSelected: (selected: boolean) => void;

  importRingtone: () => Promise<Ringtone | null>;
  removeRingtone: (rt: Ringtone) => Promise<void>;
};

export const useAlarmStore = create<State & Actions>((set, get) => ({
  groups: [],
  instancesByGroup: {},
  ringtones: [],
  selectedGroupIds: new Set(),
  isHydrated: false,

  hydrate: async () => {
    await seedBundledRingtones();
    const [groups, ringtones, allInstances] = await Promise.all([
      dbApi.listGroups(),
      dbApi.listRingtones(),
      dbApi.listAllInstances(),
    ]);
    const instancesByGroup: Record<string, AlarmInstance[]> = {};
    for (const inst of allInstances) {
      (instancesByGroup[inst.groupId] ||= []).push(inst);
    }
    for (const list of Object.values(instancesByGroup)) {
      list.sort((a, b) => a.index - b.index);
    }
    set({ groups, ringtones, instancesByGroup, isHydrated: true });
    try {
      await scheduler.reconcileOnLaunch(ringtones);
    } catch (err) {
      // Permission may be missing; UI shows a banner.
      console.warn('[alarm-store] reconcile failed:', err);
    }
  },

  refreshGroups: async () => {
    const groups = await dbApi.listGroups();
    set({ groups });
  },

  refreshInstances: async (groupId) => {
    const list = await dbApi.listInstances(groupId);
    set(s => ({ instancesByGroup: { ...s.instancesByGroup, [groupId]: list } }));
  },

  refreshRingtones: async () => {
    const ringtones = await dbApi.listRingtones();
    set({ ringtones });
  },

  saveGroup: async (g) => {
    const previous = get().instancesByGroup[g.id] ?? [];
    const instances = await scheduler.applyGroup(g, get().ringtones, previous);
    set(s => ({
      groups: replaceById(s.groups, g, (a, b) => a.id === b.id),
      instancesByGroup: { ...s.instancesByGroup, [g.id]: instances },
    }));
  },

  toggleGroup: async (groupId, enabled) => {
    const group = get().groups.find(x => x.id === groupId);
    if (!group) return;
    const updated = await scheduler.setGroupEnabled(group, enabled, get().ringtones);
    set(s => ({ groups: replaceById(s.groups, updated, (a, b) => a.id === b.id) }));
  },

  removeGroups: async (ids) => {
    await scheduler.removeGroups(ids);
    set(s => ({
      groups: s.groups.filter(g => !ids.includes(g.id)),
      instancesByGroup: Object.fromEntries(
        Object.entries(s.instancesByGroup).filter(([k]) => !ids.includes(k)),
      ),
      selectedGroupIds: new Set(),
    }));
  },

  setInstanceSkipped: async (groupId, instanceId, skipped) => {
    const group = get().groups.find(x => x.id === groupId);
    const instance = get().instancesByGroup[groupId]?.find(x => x.id === instanceId);
    if (!group || !instance) return;
    const updated = await scheduler.setInstanceSkipped(group, instance, skipped, get().ringtones);
    set(s => ({
      instancesByGroup: {
        ...s.instancesByGroup,
        [groupId]: (s.instancesByGroup[groupId] ?? []).map(i => i.id === instanceId ? updated : i),
      },
    }));
  },

  batchPatch: async (ids, patch) => {
    const now = Date.now();
    for (const id of ids) {
      const g = get().groups.find(x => x.id === id);
      if (!g) continue;
      const updated: AlarmGroup = { ...g, ...patch, updatedAt: now };
      const previous = get().instancesByGroup[id] ?? [];
      const instances = await scheduler.applyGroup(updated, get().ringtones, previous);
      set(s => ({
        groups: replaceById(s.groups, updated, (a, b) => a.id === b.id),
        instancesByGroup: { ...s.instancesByGroup, [id]: instances },
      }));
    }
  },

  selectGroup: (id, selected) => set(s => {
    const next = new Set(s.selectedGroupIds);
    if (selected) next.add(id); else next.delete(id);
    return { selectedGroupIds: next };
  }),

  toggleSelection: (id) => set(s => {
    const next = new Set(s.selectedGroupIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    return { selectedGroupIds: next };
  }),

  clearSelection: () => set({ selectedGroupIds: new Set() }),

  setAllSelected: (selected) => set(s => ({
    selectedGroupIds: selected ? new Set(s.groups.map(g => g.id)) : new Set(),
  })),

  importRingtone: async () => {
    const rt = await pickAndImportRingtone();
    if (rt) await get().refreshRingtones();
    return rt;
  },

  removeRingtone: async (rt) => {
    await deleteUserRingtone(rt);
    await get().refreshRingtones();
  },
}));

function replaceById<T>(list: T[], item: T, eq: (a: T, b: T) => boolean): T[] {
  const idx = list.findIndex(x => eq(x, item));
  if (idx === -1) return [...list, item];
  const copy = list.slice();
  copy[idx] = item;
  return copy;
}
