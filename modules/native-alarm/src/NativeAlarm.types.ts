export type AlarmPayload = {
  instanceId: string;
  groupId: string;
  triggerAtMs: number;
  label: string;
  ringtoneUri: string;
  /** Optional local file URIs (multiple = slideshow with Ken Burns pan). */
  backgroundUris?: string[];
  vibrate: boolean;
  snoozeMs: number;
  snoozeMaxRepeats: number;
  repeatDaysMask: number;
};

export type ScheduledAlarmInfo = {
  instanceId: string;
  groupId: string;
  triggerAtMs: number;
};

export type AlarmFiredEvent = {
  instanceId: string;
  groupId: string;
  firedAtMs: number;
};

export type AlarmDismissedEvent = {
  instanceId: string;
  groupId: string;
};

export type AlarmSnoozedEvent = {
  instanceId: string;
  groupId: string;
  nextTriggerAtMs: number;
};

export type NativeAlarmEvents = {
  onAlarmFired: (event: AlarmFiredEvent) => void;
  onAlarmDismissed: (event: AlarmDismissedEvent) => void;
  onAlarmSnoozed: (event: AlarmSnoozedEvent) => void;
};
