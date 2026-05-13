import { requireNativeModule } from 'expo-modules-core';
import type {
  AlarmPayload,
  ScheduledAlarmInfo,
  AlarmFiredEvent,
  AlarmDismissedEvent,
  AlarmSnoozedEvent,
} from './NativeAlarm.types';

export type EventSubscription = { remove(): void };

type NativeAlarm = {
  scheduleAlarm(payload: AlarmPayload): Promise<void>;
  scheduleMany(entries: AlarmPayload[]): Promise<void>;
  cancelAlarm(instanceId: string): Promise<void>;
  cancelGroup(groupId: string): Promise<void>;
  cancelAll(): Promise<void>;
  getScheduled(): Promise<ScheduledAlarmInfo[]>;
  hasExactAlarmPermission(): Promise<boolean>;
  openExactAlarmSettings(): Promise<void>;
  hasFullScreenIntentPermission(): Promise<boolean>;
  openFullScreenIntentSettings(): Promise<void>;
  hasNotificationPermission(): Promise<boolean>;
  getSystemRingtones(): Promise<{ id: string; name: string; uri: string; category: string }[]>;
  addListener(event: 'onAlarmFired', handler: (e: AlarmFiredEvent) => void): EventSubscription;
  addListener(event: 'onAlarmDismissed', handler: (e: AlarmDismissedEvent) => void): EventSubscription;
  addListener(event: 'onAlarmSnoozed', handler: (e: AlarmSnoozedEvent) => void): EventSubscription;
  removeAllListeners(event: string): void;
};

export const nativeAlarm = requireNativeModule<NativeAlarm>('NativeAlarm');

export function addAlarmFiredListener(handler: (e: AlarmFiredEvent) => void): EventSubscription {
  return nativeAlarm.addListener('onAlarmFired', handler);
}

export function addAlarmDismissedListener(handler: (e: AlarmDismissedEvent) => void): EventSubscription {
  return nativeAlarm.addListener('onAlarmDismissed', handler);
}

export function addAlarmSnoozedListener(handler: (e: AlarmSnoozedEvent) => void): EventSubscription {
  return nativeAlarm.addListener('onAlarmSnoozed', handler);
}

export type {
  AlarmPayload,
  ScheduledAlarmInfo,
  AlarmFiredEvent,
  AlarmDismissedEvent,
  AlarmSnoozedEvent,
};
