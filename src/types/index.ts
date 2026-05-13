export type TimeOfDay = { hour: number; minute: number };

/** Bitmask: Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64. 0 = one-shot. */
export type DayMask = number;

export const DAY_MASK = {
  SUN: 1,
  MON: 2,
  TUE: 4,
  WED: 8,
  THU: 16,
  FRI: 32,
  SAT: 64,
  WEEKDAYS: 2 | 4 | 8 | 16 | 32,
  WEEKEND: 1 | 64,
  EVERY_DAY: 1 | 2 | 4 | 8 | 16 | 32 | 64,
} as const;

export const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
export const DAY_LABELS_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export interface AlarmGroup {
  id: string;
  label: string;
  start: TimeOfDay;
  end: TimeOfDay;
  stepMinutes: number;
  repeatDays: DayMask;
  ringtoneId: string;
  snoozeMs: number;
  snoozeMaxRepeats: number;
  vibrate: boolean;
  enabled: boolean;
  /** Pexels topic ids (see src/constants/backgrounds.ts). Empty = dark default. */
  backgroundTopics: string[];
  /** Local file:// URIs for user-uploaded background images. */
  backgroundCustomImages: string[];
  /** Gate the Dismiss button behind a trace-the-shape mini-game. */
  dismissChallenge: DismissChallenge;
  /** When true (and challenge is enabled), Snooze also requires completing the challenge. */
  challengeBlocksSnooze: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AlarmInstance {
  id: string;
  groupId: string;
  index: number;
  time: TimeOfDay;
  skipped: boolean;
  lastFiredAt: number | null;
  snoozedUntilMs: number | null;
}

export interface Ringtone {
  id: string;
  name: string;
  uri: string;
  bundled: boolean;
  durationMs: number | null;
}

export interface WorldClock {
  id: string;
  label: string;
  timezone: string;
}

export interface TimerPreset {
  id: string;
  name: string;
  durationMs: number;
  ringtoneId: string;
}

export interface AppSettings {
  defaultRingtoneId: string;
  defaultSnoozeMs: number;
  defaultSnoozeMaxRepeats: number;
  defaultVibrate: boolean;
  theme: 'system' | 'light' | 'dark';
  clockFormat: '24h' | '12h';
  permissionsAcknowledged: boolean;
}

export type DismissChallenge = 'none' | 'shape';

export const isSingleAlarmGroup = (g: AlarmGroup): boolean =>
  g.stepMinutes === 0 ||
  (g.start.hour === g.end.hour && g.start.minute === g.end.minute);
