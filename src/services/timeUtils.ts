import { DateTime } from 'luxon';
import type { AlarmGroup, AlarmInstance, DayMask, TimeOfDay } from '@/types';

const MIN_PER_DAY = 24 * 60;

export const toMinutes = (t: TimeOfDay): number => t.hour * 60 + t.minute;

export const fromMinutes = (mins: number): TimeOfDay => {
  const wrapped = ((mins % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY;
  return { hour: Math.floor(wrapped / 60), minute: wrapped % 60 };
};

export const formatTime = (t: TimeOfDay, h24 = true): string => {
  if (h24) return `${pad(t.hour)}:${pad(t.minute)}`;
  const h = t.hour % 12 === 0 ? 12 : t.hour % 12;
  const ampm = t.hour < 12 ? 'AM' : 'PM';
  return `${h}:${pad(t.minute)} ${ampm}`;
};

const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

/** Convert a 24-hour value to 12-hour {hour12, isPm}. */
export function to12h(h24: number): { hour12: number; isPm: boolean } {
  const isPm = h24 >= 12;
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour12, isPm };
}

/** Convert a 12-hour value back to 24-hour. */
export function to24h(hour12: number, isPm: boolean): number {
  if (hour12 === 12) return isPm ? 12 : 0;
  return isPm ? hour12 + 12 : hour12;
}

export const formatDuration = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
};

/**
 * Expand a group's start..end with stepMinutes into AlarmInstance[].
 * Preserves `skipped` and `lastFiredAt` for matching indices in `previous`.
 * Ranges that wrap past midnight are NOT supported — clamp end >= start.
 */
export function expandGroup(g: AlarmGroup, previous: AlarmInstance[] = []): AlarmInstance[] {
  const startM = toMinutes(g.start);
  const endM = toMinutes(g.end);
  const step = Math.max(1, Math.floor(g.stepMinutes));
  const single = g.stepMinutes <= 0 || startM === endM;
  const slots: number[] = [];
  if (single) {
    slots.push(startM);
  } else {
    const last = endM >= startM ? endM : startM;
    for (let m = startM; m <= last; m += step) slots.push(m);
  }
  const prevByIndex = new Map(previous.map(p => [p.index, p]));
  return slots.map((minutes, i) => {
    const prior = prevByIndex.get(i);
    return {
      id: `${g.id}:${i}`,
      groupId: g.id,
      index: i,
      time: fromMinutes(minutes),
      skipped: prior?.skipped ?? false,
      lastFiredAt: prior?.lastFiredAt ?? null,
      snoozedUntilMs: prior?.snoozedUntilMs ?? null,
    };
  });
}

/**
 * Next epoch ms strictly after `now` when the alarm should fire.
 * One-shot (repeatDays === 0): the next occurrence of `time` (today if not yet
 * passed, otherwise tomorrow). Repeating: the soonest day in the mask.
 */
/**
 * Strict future-only scheduling. An alarm whose configured slot is already in
 * the past (even by a second) is pushed to its next occurrence, never fired
 * the same minute it was saved. This is intentional — the old grace window
 * caused duplicate fires when a slot fell exactly on the save moment.
 */
export function nextFireMs(
  time: TimeOfDay,
  repeatDays: DayMask,
  now: DateTime = DateTime.local(),
): number {
  const todayFire = now.set({ hour: time.hour, minute: time.minute, second: 0, millisecond: 0 });
  if (!repeatDays) {
    return (todayFire > now ? todayFire : todayFire.plus({ days: 1 })).toMillis();
  }
  for (let offset = 0; offset < 8; offset++) {
    const candidate = now
      .plus({ days: offset })
      .set({ hour: time.hour, minute: time.minute, second: 0, millisecond: 0 });
    // Luxon weekday: Mon=1..Sun=7. Convert to our Sun=0 then bit position.
    const sundayBased = candidate.weekday % 7; // Sun=0..Sat=6
    const bit = 1 << sundayBased;
    if ((repeatDays & bit) !== 0 && candidate > now) return candidate.toMillis();
  }
  // Fallback: tomorrow same time (shouldn't reach with a non-zero mask).
  return now
    .plus({ days: 1 })
    .set({ hour: time.hour, minute: time.minute, second: 0, millisecond: 0 })
    .toMillis();
}

export function describeRepeat(mask: DayMask): string {
  if (!mask) return 'Once';
  if (mask === 0b1111111) return 'Every day';
  if (mask === 0b0111110) return 'Weekdays';
  if (mask === 0b1000001) return 'Weekends';
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return labels.filter((_, i) => (mask & (1 << i)) !== 0).join(' ');
}

export const formatTimeOfDayRange = (start: TimeOfDay, end: TimeOfDay, step: number): string => {
  if (step <= 0 || (start.hour === end.hour && start.minute === end.minute)) {
    return formatTime(start);
  }
  return `${formatTime(start)} – ${formatTime(end)}  •  every ${step}m`;
};
