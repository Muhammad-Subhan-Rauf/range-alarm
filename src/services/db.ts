import * as SQLite from 'expo-sqlite';
import type {
  AlarmGroup,
  AlarmInstance,
  AppSettings,
  Ringtone,
  TimerPreset,
  WorldClock,
} from '@/types';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function db(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('rangealarm.db').then(async d => {
      await d.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      await migrate(d);
      return d;
    });
  }
  return dbPromise;
}

async function migrate(d: SQLite.SQLiteDatabase): Promise<void> {
  await d.execAsync(`
    CREATE TABLE IF NOT EXISTS alarm_groups (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      startHour INTEGER NOT NULL,
      startMinute INTEGER NOT NULL,
      endHour INTEGER NOT NULL,
      endMinute INTEGER NOT NULL,
      stepMinutes INTEGER NOT NULL,
      repeatDays INTEGER NOT NULL,
      ringtoneId TEXT NOT NULL,
      snoozeMs INTEGER NOT NULL,
      snoozeMaxRepeats INTEGER NOT NULL,
      vibrate INTEGER NOT NULL,
      enabled INTEGER NOT NULL,
      backgroundTopics TEXT NOT NULL DEFAULT '[]',
      backgroundCustomImages TEXT NOT NULL DEFAULT '[]',
      dismissChallenge TEXT NOT NULL DEFAULT 'none',
      challengeBlocksSnooze INTEGER NOT NULL DEFAULT 0,
      pausedUntilMs INTEGER,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS alarm_instances (
      id TEXT PRIMARY KEY,
      groupId TEXT NOT NULL REFERENCES alarm_groups(id) ON DELETE CASCADE,
      idx INTEGER NOT NULL,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      skipped INTEGER NOT NULL,
      lastFiredAt INTEGER,
      snoozedUntilMs INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_alarm_instances_group ON alarm_instances(groupId);
    CREATE TABLE IF NOT EXISTS ringtones (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      uri TEXT NOT NULL,
      bundled INTEGER NOT NULL,
      durationMs INTEGER
    );
    CREATE TABLE IF NOT EXISTS world_clocks (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      timezone TEXT NOT NULL,
      ordering INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS timer_presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      durationMs INTEGER NOT NULL,
      ringtoneId TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      k TEXT PRIMARY KEY,
      v TEXT NOT NULL
    );
  `);
  // Forward-compat: if an older install is missing columns, add them.
  for (const col of [
    `backgroundTopics TEXT NOT NULL DEFAULT '[]'`,
    `backgroundCustomImages TEXT NOT NULL DEFAULT '[]'`,
    `dismissChallenge TEXT NOT NULL DEFAULT 'none'`,
    `challengeBlocksSnooze INTEGER NOT NULL DEFAULT 0`,
    `pausedUntilMs INTEGER`,
  ]) {
    try { await d.execAsync(`ALTER TABLE alarm_groups ADD COLUMN ${col}`); } catch { /* already present */ }
  }
}

// --- Mappers ----------------------------------------------------------------

const toGroup = (r: any): AlarmGroup => ({
  id: r.id,
  label: r.label,
  start: { hour: r.startHour, minute: r.startMinute },
  end: { hour: r.endHour, minute: r.endMinute },
  stepMinutes: r.stepMinutes,
  repeatDays: r.repeatDays,
  ringtoneId: r.ringtoneId,
  snoozeMs: r.snoozeMs,
  snoozeMaxRepeats: r.snoozeMaxRepeats,
  vibrate: !!r.vibrate,
  enabled: !!r.enabled,
  backgroundTopics: parseTopics(r.backgroundTopics),
  backgroundCustomImages: parseTopics(r.backgroundCustomImages),
  dismissChallenge: r.dismissChallenge === 'shape' ? 'shape' : 'none',
  challengeBlocksSnooze: !!r.challengeBlocksSnooze,
  pausedUntilMs: r.pausedUntilMs ?? null,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

const parseTopics = (raw: unknown): string[] => {
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

const toInstance = (r: any): AlarmInstance => ({
  id: r.id,
  groupId: r.groupId,
  index: r.idx,
  time: { hour: r.hour, minute: r.minute },
  skipped: !!r.skipped,
  lastFiredAt: r.lastFiredAt,
  snoozedUntilMs: r.snoozedUntilMs,
});

// --- Groups -----------------------------------------------------------------

export async function listGroups(): Promise<AlarmGroup[]> {
  const d = await db();
  const rows = await d.getAllAsync<any>(
    'SELECT * FROM alarm_groups ORDER BY startHour, startMinute, createdAt DESC',
  );
  return rows.map(toGroup);
}

export async function getGroup(id: string): Promise<AlarmGroup | null> {
  const d = await db();
  const r = await d.getFirstAsync<any>('SELECT * FROM alarm_groups WHERE id = ?', [id]);
  return r ? toGroup(r) : null;
}

export async function upsertGroup(g: AlarmGroup): Promise<void> {
  const d = await db();
  await d.runAsync(
    `INSERT INTO alarm_groups (id,label,startHour,startMinute,endHour,endMinute,stepMinutes,repeatDays,ringtoneId,snoozeMs,snoozeMaxRepeats,vibrate,enabled,backgroundTopics,backgroundCustomImages,dismissChallenge,challengeBlocksSnooze,pausedUntilMs,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       label=excluded.label,
       startHour=excluded.startHour,
       startMinute=excluded.startMinute,
       endHour=excluded.endHour,
       endMinute=excluded.endMinute,
       stepMinutes=excluded.stepMinutes,
       repeatDays=excluded.repeatDays,
       ringtoneId=excluded.ringtoneId,
       snoozeMs=excluded.snoozeMs,
       snoozeMaxRepeats=excluded.snoozeMaxRepeats,
       vibrate=excluded.vibrate,
       enabled=excluded.enabled,
       backgroundTopics=excluded.backgroundTopics,
       backgroundCustomImages=excluded.backgroundCustomImages,
       dismissChallenge=excluded.dismissChallenge,
       challengeBlocksSnooze=excluded.challengeBlocksSnooze,
       pausedUntilMs=excluded.pausedUntilMs,
       updatedAt=excluded.updatedAt`,
    [
      g.id, g.label, g.start.hour, g.start.minute, g.end.hour, g.end.minute,
      g.stepMinutes, g.repeatDays, g.ringtoneId, g.snoozeMs, g.snoozeMaxRepeats,
      g.vibrate ? 1 : 0, g.enabled ? 1 : 0,
      JSON.stringify(g.backgroundTopics ?? []),
      JSON.stringify(g.backgroundCustomImages ?? []),
      g.dismissChallenge ?? 'none',
      g.challengeBlocksSnooze ? 1 : 0,
      g.pausedUntilMs ?? null,
      g.createdAt, g.updatedAt,
    ],
  );
}

export async function deleteGroup(id: string): Promise<void> {
  const d = await db();
  await d.runAsync('DELETE FROM alarm_groups WHERE id = ?', [id]);
}

export async function deleteGroups(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const d = await db();
  const placeholders = ids.map(() => '?').join(',');
  await d.runAsync(`DELETE FROM alarm_groups WHERE id IN (${placeholders})`, ids);
}

// --- Instances --------------------------------------------------------------

export async function listInstances(groupId: string): Promise<AlarmInstance[]> {
  const d = await db();
  const rows = await d.getAllAsync<any>(
    'SELECT * FROM alarm_instances WHERE groupId = ? ORDER BY idx ASC',
    [groupId],
  );
  return rows.map(toInstance);
}

export async function listAllInstances(): Promise<AlarmInstance[]> {
  const d = await db();
  const rows = await d.getAllAsync<any>('SELECT * FROM alarm_instances ORDER BY groupId, idx');
  return rows.map(toInstance);
}

export async function replaceInstances(
  groupId: string,
  instances: AlarmInstance[],
): Promise<void> {
  const d = await db();
  await d.withTransactionAsync(async () => {
    await d.runAsync('DELETE FROM alarm_instances WHERE groupId = ?', [groupId]);
    for (const inst of instances) {
      await d.runAsync(
        `INSERT INTO alarm_instances (id,groupId,idx,hour,minute,skipped,lastFiredAt,snoozedUntilMs)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          inst.id, inst.groupId, inst.index, inst.time.hour, inst.time.minute,
          inst.skipped ? 1 : 0, inst.lastFiredAt, inst.snoozedUntilMs,
        ],
      );
    }
  });
}

export async function updateInstance(inst: AlarmInstance): Promise<void> {
  const d = await db();
  await d.runAsync(
    `UPDATE alarm_instances SET hour=?,minute=?,skipped=?,lastFiredAt=?,snoozedUntilMs=? WHERE id=?`,
    [inst.time.hour, inst.time.minute, inst.skipped ? 1 : 0, inst.lastFiredAt, inst.snoozedUntilMs, inst.id],
  );
}

// --- Ringtones --------------------------------------------------------------

export async function listRingtones(): Promise<Ringtone[]> {
  const d = await db();
  return await d.getAllAsync<Ringtone>('SELECT * FROM ringtones ORDER BY bundled DESC, name ASC');
}

export async function upsertRingtone(r: Ringtone): Promise<void> {
  const d = await db();
  await d.runAsync(
    `INSERT INTO ringtones (id,name,uri,bundled,durationMs) VALUES (?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name,uri=excluded.uri,durationMs=excluded.durationMs`,
    [r.id, r.name, r.uri, r.bundled ? 1 : 0, r.durationMs],
  );
}

export async function deleteRingtone(id: string): Promise<void> {
  const d = await db();
  await d.runAsync('DELETE FROM ringtones WHERE id = ? AND bundled = 0', [id]);
}

// --- World clocks ----------------------------------------------------------

export async function listWorldClocks(): Promise<WorldClock[]> {
  const d = await db();
  return await d.getAllAsync<WorldClock>('SELECT id,label,timezone FROM world_clocks ORDER BY ordering ASC, label ASC');
}

export async function upsertWorldClock(c: WorldClock, ordering = 0): Promise<void> {
  const d = await db();
  await d.runAsync(
    `INSERT INTO world_clocks (id,label,timezone,ordering) VALUES (?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET label=excluded.label,timezone=excluded.timezone,ordering=excluded.ordering`,
    [c.id, c.label, c.timezone, ordering],
  );
}

export async function deleteWorldClock(id: string): Promise<void> {
  const d = await db();
  await d.runAsync('DELETE FROM world_clocks WHERE id = ?', [id]);
}

// --- Timer presets ---------------------------------------------------------

export async function listTimerPresets(): Promise<TimerPreset[]> {
  const d = await db();
  return await d.getAllAsync<TimerPreset>('SELECT id,name,durationMs,ringtoneId FROM timer_presets ORDER BY durationMs ASC');
}

export async function upsertTimerPreset(p: TimerPreset): Promise<void> {
  const d = await db();
  await d.runAsync(
    `INSERT INTO timer_presets (id,name,durationMs,ringtoneId) VALUES (?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name,durationMs=excluded.durationMs,ringtoneId=excluded.ringtoneId`,
    [p.id, p.name, p.durationMs, p.ringtoneId],
  );
}

export async function deleteTimerPreset(id: string): Promise<void> {
  const d = await db();
  await d.runAsync('DELETE FROM timer_presets WHERE id = ?', [id]);
}

// --- Settings --------------------------------------------------------------

export async function getSettings(): Promise<Partial<AppSettings>> {
  const d = await db();
  const rows = await d.getAllAsync<{ k: string; v: string }>('SELECT k,v FROM settings');
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    try { out[r.k] = JSON.parse(r.v); } catch { /* ignore */ }
  }
  return out as Partial<AppSettings>;
}

export async function setSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
): Promise<void> {
  const d = await db();
  await d.runAsync(
    'INSERT INTO settings (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v',
    [key, JSON.stringify(value)],
  );
}
