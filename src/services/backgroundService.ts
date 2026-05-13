import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { PEXELS_API_KEY } from '@/config/pexels';
import { findTopic, type BackgroundTopic } from '@/constants/backgrounds';

const ROOT = `${FileSystem.documentDirectory}backgrounds/`;
const TOPIC_DIR = (id: string) => `${ROOT}topics/${id}/`;
const CUSTOM_DIR = `${ROOT}custom/`;

const IMAGES_PER_TOPIC = 10;
const PEXELS_SEARCH = 'https://api.pexels.com/v1/search';

async function ensureDir(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) await FileSystem.makeDirectoryAsync(path, { intermediates: true });
}

async function listFiles(path: string): Promise<string[]> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) return [];
  const names = await FileSystem.readDirectoryAsync(path);
  return names.map(n => path + n);
}

export type TopicCacheStatus = {
  topicId: string;
  label: string;
  cachedCount: number;
  files: string[];
};

export async function getTopicStatus(topicId: string): Promise<TopicCacheStatus> {
  const topic = findTopic(topicId);
  const files = await listFiles(TOPIC_DIR(topicId));
  return {
    topicId,
    label: topic?.label ?? topicId,
    cachedCount: files.length,
    files,
  };
}

/**
 * Downloads up to {@link IMAGES_PER_TOPIC} photos for a topic via Pexels.
 * No-ops if the cache already has that many. Returns the number of files
 * present in the cache afterward.
 */
export async function fetchTopic(topic: BackgroundTopic): Promise<number> {
  await ensureDir(TOPIC_DIR(topic.id));
  const existing = await listFiles(TOPIC_DIR(topic.id));
  if (existing.length >= IMAGES_PER_TOPIC) return existing.length;

  const url = `${PEXELS_SEARCH}?query=${encodeURIComponent(topic.query)}&per_page=${IMAGES_PER_TOPIC}&orientation=portrait`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } });
  if (!res.ok) {
    throw new Error(`Pexels HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    photos?: { id: number; src: { large2x: string; large: string; portrait: string } }[];
  };
  const photos = data.photos ?? [];

  for (const photo of photos) {
    const dst = `${TOPIC_DIR(topic.id)}${photo.id}.jpg`;
    const info = await FileSystem.getInfoAsync(dst);
    if (info.exists) continue;
    const remote = photo.src.portrait || photo.src.large2x || photo.src.large;
    try {
      await FileSystem.downloadAsync(remote, dst);
    } catch (err) {
      console.warn('[bg] download failed', err);
    }
  }
  const after = await listFiles(TOPIC_DIR(topic.id));
  return after.length;
}

/** Bulk fetch for multiple topics. Failures bubble up only after all attempts. */
export async function fetchTopics(topicIds: string[]): Promise<{ topicId: string; count: number; error?: string }[]> {
  const out: { topicId: string; count: number; error?: string }[] = [];
  for (const id of topicIds) {
    const topic = findTopic(id);
    if (!topic) { out.push({ topicId: id, count: 0, error: 'unknown topic' }); continue; }
    try {
      const count = await fetchTopic(topic);
      out.push({ topicId: id, count });
    } catch (e: any) {
      out.push({ topicId: id, count: 0, error: e?.message ?? 'fetch failed' });
    }
  }
  return out;
}

/** Open the OS image picker, copy the chosen image into the app's custom cache. */
export async function pickCustomImage(groupId: string): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.92,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  await ensureDir(CUSTOM_DIR);
  const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
  const dst = `${CUSTOM_DIR}${groupId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
  await FileSystem.copyAsync({ from: asset.uri, to: dst });
  return dst;
}

export async function removeCustomImage(uri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
}

/**
 * Returns the union of every cached image available for the group:
 * the file list across each selected topic + the group's custom uploads.
 */
export async function poolForGroup(group: {
  backgroundTopics: string[];
  backgroundCustomImages: string[];
}): Promise<string[]> {
  const result: string[] = [];
  for (const id of group.backgroundTopics) {
    const files = await listFiles(TOPIC_DIR(id));
    result.push(...files);
  }
  for (const uri of group.backgroundCustomImages) {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) result.push(uri);
  }
  return result;
}

/** Pick one random URI from the group's pool, or null if empty. */
export async function pickRandomBackground(group: {
  backgroundTopics: string[];
  backgroundCustomImages: string[];
}): Promise<string | null> {
  const pool = await poolForGroup(group);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
