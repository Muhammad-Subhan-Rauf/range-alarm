import { useCallback } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { formatTime } from '@/services/timeUtils';
import type { TimeOfDay } from '@/types';

/**
 * Returns the active clock format and a formatter that honors it.
 *
 * Component code that wants a formatted time string should use this instead of
 * calling `formatTime` directly, so the user's 24h/12h preference flows through.
 */
export function useTimeFormat(): {
  format: '24h' | '12h';
  is24: boolean;
  fmt: (t: TimeOfDay) => string;
} {
  const format = useSettingsStore(s => s.clockFormat);
  const is24 = format === '24h';
  const fmt = useCallback((t: TimeOfDay) => formatTime(t, is24), [is24]);
  return { format, is24, fmt };
}
