import { DateTime } from 'luxon';
import { nativeAlarm, type AlarmPayload } from 'native-alarm';
import * as dbApi from './db';
import { expandGroup, nextFireMs } from './timeUtils';
import { poolForGroup } from './backgroundService';
import type { AlarmGroup, AlarmInstance, Ringtone } from '@/types';

/**
 * The ONLY file that talks to the native module directly. Owns the JS-side
 * translation between {AlarmGroup, AlarmInstance, Ringtone} and AlarmPayload.
 */

function resolveRingtoneUri(ringtoneId: string, ringtones: Ringtone[]): string {
  const r = ringtones.find(x => x.id === ringtoneId);
  return r?.uri ?? '';
}

const MAX_BG_URIS = 10;

function shuffled<T>(arr: T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function buildPayloads(
  group: AlarmGroup,
  instances: AlarmInstance[],
  ringtones: Ringtone[],
  now: DateTime = DateTime.local(),
): Promise<AlarmPayload[]> {
  if (!group.enabled) return [];
  const ringtoneUri = resolveRingtoneUri(group.ringtoneId, ringtones);
  const pool = await poolForGroup(group);
  // Each instance gets its own shuffled subset so slideshows don't all start
  // with the same image when many alarms fire in quick succession.
  return instances
    .filter(i => !i.skipped)
    .map<AlarmPayload>(i => ({
      instanceId: i.id,
      groupId: group.id,
      triggerAtMs: nextFireMs(i.time, group.repeatDays, now),
      label: group.label || 'Alarm',
      ringtoneUri,
      backgroundUris: pool.length ? shuffled(pool).slice(0, MAX_BG_URIS) : [],
      vibrate: group.vibrate,
      snoozeMs: group.snoozeMs,
      snoozeMaxRepeats: group.snoozeMaxRepeats,
      repeatDaysMask: group.repeatDays,
    }));
}

/** Persist a group + its instances, then re-schedule them on the native side. */
export async function applyGroup(
  group: AlarmGroup,
  ringtones: Ringtone[],
  previousInstances: AlarmInstance[] = [],
): Promise<AlarmInstance[]> {
  const instances = expandGroup(group, previousInstances);
  await dbApi.upsertGroup(group);
  await dbApi.replaceInstances(group.id, instances);
  await nativeAlarm.cancelGroup(group.id);
  const payloads = await buildPayloads(group, instances, ringtones);
  if (payloads.length) await nativeAlarm.scheduleMany(payloads);
  return instances;
}

/** Remove a group and cancel every scheduled child. */
export async function removeGroup(groupId: string): Promise<void> {
  await nativeAlarm.cancelGroup(groupId);
  await dbApi.deleteGroup(groupId);
}

export async function removeGroups(groupIds: string[]): Promise<void> {
  for (const id of groupIds) await nativeAlarm.cancelGroup(id);
  await dbApi.deleteGroups(groupIds);
}

/** Toggle a group's enabled flag, scheduling or cancelling as needed. */
export async function setGroupEnabled(
  group: AlarmGroup,
  enabled: boolean,
  ringtones: Ringtone[],
): Promise<AlarmGroup> {
  const updated: AlarmGroup = { ...group, enabled, updatedAt: Date.now() };
  await dbApi.upsertGroup(updated);
  if (!enabled) {
    await nativeAlarm.cancelGroup(group.id);
  } else {
    const instances = await dbApi.listInstances(group.id);
    const payloads = await buildPayloads(updated, instances, ringtones);
    await nativeAlarm.cancelGroup(group.id);
    if (payloads.length) await nativeAlarm.scheduleMany(payloads);
  }
  return updated;
}

/** Toggle the skipped flag on a single child instance. */
export async function setInstanceSkipped(
  group: AlarmGroup,
  instance: AlarmInstance,
  skipped: boolean,
  ringtones: Ringtone[],
): Promise<AlarmInstance> {
  const updated: AlarmInstance = { ...instance, skipped };
  await dbApi.updateInstance(updated);
  if (skipped) {
    await nativeAlarm.cancelAlarm(instance.id);
  } else if (group.enabled) {
    const payload: AlarmPayload = {
      instanceId: instance.id,
      groupId: group.id,
      triggerAtMs: nextFireMs(instance.time, group.repeatDays),
      label: group.label,
      ringtoneUri: resolveRingtoneUri(group.ringtoneId, ringtones),
      vibrate: group.vibrate,
      snoozeMs: group.snoozeMs,
      snoozeMaxRepeats: group.snoozeMaxRepeats,
      repeatDaysMask: group.repeatDays,
    };
    await nativeAlarm.scheduleAlarm(payload);
  }
  return updated;
}

/**
 * On app launch: read everything we have and reconcile with the native side.
 * If a group should have schedule entries that aren't there, re-add them.
 * If the native side has entries that aren't in our DB, drop them.
 */
export async function reconcileOnLaunch(ringtones: Ringtone[]): Promise<void> {
  const [groups, scheduled] = await Promise.all([
    dbApi.listGroups(),
    nativeAlarm.getScheduled(),
  ]);
  const scheduledIds = new Set(scheduled.map(s => s.instanceId));
  const expectedIds = new Set<string>();
  const now = DateTime.local();

  for (const g of groups) {
    if (!g.enabled) continue;
    const instances = await dbApi.listInstances(g.id);
    const payloads = await buildPayloads(g, instances, ringtones, now);
    payloads.forEach(p => expectedIds.add(p.instanceId));
    const missing = payloads.filter(p => !scheduledIds.has(p.instanceId));
    if (missing.length) await nativeAlarm.scheduleMany(missing);
  }

  const orphans = scheduled.filter(s => !expectedIds.has(s.instanceId));
  for (const o of orphans) {
    await nativeAlarm.cancelAlarm(o.instanceId);
  }
}

/** For the timer feature — schedule a one-shot alarm at `triggerAtMs`. */
export async function scheduleTimer(
  id: string,
  triggerAtMs: number,
  label: string,
  ringtone: Ringtone | null,
): Promise<void> {
  await nativeAlarm.scheduleAlarm({
    instanceId: id,
    groupId: 'timer',
    triggerAtMs,
    label,
    ringtoneUri: ringtone?.uri ?? '',
    vibrate: true,
    snoozeMs: 60_000,
    snoozeMaxRepeats: 0,
    repeatDaysMask: 0,
  });
}

export async function cancelTimer(id: string): Promise<void> {
  await nativeAlarm.cancelAlarm(id);
}
