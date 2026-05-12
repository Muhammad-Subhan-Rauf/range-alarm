import { create } from 'zustand';
import * as dbApi from '@/services/db';
import type { AppSettings } from '@/types';

const DEFAULTS: AppSettings = {
  defaultRingtoneId: 'system-default',
  defaultSnoozeMs: 9 * 60_000,
  defaultSnoozeMaxRepeats: 3,
  defaultVibrate: true,
  theme: 'dark',
  clockFormat: '24h',
  permissionsAcknowledged: false,
};

type State = AppSettings & { isHydrated: boolean };

type Actions = {
  hydrate: () => Promise<void>;
  set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
};

export const useSettingsStore = create<State & Actions>((setState) => ({
  ...DEFAULTS,
  isHydrated: false,
  hydrate: async () => {
    const persisted = await dbApi.getSettings();
    setState({ ...DEFAULTS, ...persisted, isHydrated: true });
  },
  set: async (key, value) => {
    await dbApi.setSetting(key, value);
    setState({ [key]: value } as Pick<AppSettings, typeof key>);
  },
}));
