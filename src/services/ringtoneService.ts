import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import type { Ringtone } from '@/types';
import * as dbApi from './db';

const RINGTONE_DIR = `${FileSystem.documentDirectory}ringtones/`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(RINGTONE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(RINGTONE_DIR, { intermediates: true });
  }
}

const BUNDLED: Ringtone[] = [
  { id: 'system-default', name: 'System default alarm', uri: '', bundled: true, durationMs: null },
];

export async function seedBundledRingtones(): Promise<void> {
  const existing = await dbApi.listRingtones();
  if (existing.find(r => r.id === 'system-default')) return;
  for (const r of BUNDLED) await dbApi.upsertRingtone(r);
}

export async function pickAndImportRingtone(): Promise<Ringtone | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'audio/*',
    copyToCacheDirectory: false,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  await ensureDir();
  const id = `rt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ext = (asset.name?.split('.').pop() || 'mp3').toLowerCase();
  const dest = `${RINGTONE_DIR}${id}.${ext}`;
  await FileSystem.copyAsync({ from: asset.uri, to: dest });
  const ringtone: Ringtone = {
    id,
    name: asset.name ?? 'Untitled',
    uri: dest,
    bundled: false,
    durationMs: null,
  };
  await dbApi.upsertRingtone(ringtone);
  return ringtone;
}

export async function deleteUserRingtone(rt: Ringtone): Promise<void> {
  if (rt.bundled) return;
  try {
    const info = await FileSystem.getInfoAsync(rt.uri);
    if (info.exists) await FileSystem.deleteAsync(rt.uri, { idempotent: true });
  } catch {
    // ignore
  }
  await dbApi.deleteRingtone(rt.id);
}
