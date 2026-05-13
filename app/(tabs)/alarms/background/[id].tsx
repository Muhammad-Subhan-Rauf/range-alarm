import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { ChevronLeft, Check, Image as ImageIcon, Plus, Trash2 } from 'lucide-react-native';
import { useAlarmStore } from '@/stores/useAlarmStore';
import { useColors, type Palette } from '@/constants/colors';
import { BACKGROUND_TOPICS } from '@/constants/backgrounds';
import { fetchTopics, pickCustomImage, removeCustomImage, getTopicStatus, type TopicCacheStatus } from '@/services/backgroundService';

export default function BackgroundPickerScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const group = useAlarmStore(s => s.groups.find(g => g.id === id));
  const saveGroup = useAlarmStore(s => s.saveGroup);

  const [selectedTopics, setSelectedTopics] = useState<string[]>(group?.backgroundTopics ?? []);
  const [customImages, setCustomImages] = useState<string[]>(group?.backgroundCustomImages ?? []);
  const [cacheStatus, setCacheStatus] = useState<Record<string, TopicCacheStatus>>({});
  const [busy, setBusy] = useState(false);
  const [pendingTopic, setPendingTopic] = useState<string | null>(null);

  // Load cache status for selected topics.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, TopicCacheStatus> = {};
      for (const t of BACKGROUND_TOPICS) {
        next[t.id] = await getTopicStatus(t.id);
        if (cancelled) return;
      }
      setCacheStatus(next);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!group) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ color: colors.textMuted, padding: 20 }}>Alarm not found.</Text>
      </SafeAreaView>
    );
  }

  const toggleTopic = async (topicId: string) => {
    if (selectedTopics.includes(topicId)) {
      setSelectedTopics(prev => prev.filter(t => t !== topicId));
      return;
    }
    setPendingTopic(topicId);
    try {
      await fetchTopics([topicId]);
      const updated = await getTopicStatus(topicId);
      setCacheStatus(s => ({ ...s, [topicId]: updated }));
      if (updated.cachedCount > 0) {
        setSelectedTopics(prev => [...prev, topicId]);
      }
    } catch (err: any) {
      console.warn('[bg] fetchTopic failed', err);
    } finally {
      setPendingTopic(null);
    }
  };

  const handleAddCustom = async () => {
    setBusy(true);
    try {
      const uri = await pickCustomImage(group.id);
      if (uri) setCustomImages(prev => [...prev, uri]);
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveCustom = async (uri: string) => {
    await removeCustomImage(uri);
    setCustomImages(prev => prev.filter(u => u !== uri));
  };

  const onSave = async () => {
    await saveGroup({
      ...group,
      backgroundTopics: selectedTopics,
      backgroundCustomImages: customImages,
      updatedAt: Date.now(),
    });
    router.back();
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronLeft size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Background</Text>
        <Pressable onPress={onSave} hitSlop={10}>
          <Text style={styles.save}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <Text style={styles.section}>Categories</Text>
        <Text style={styles.hint}>
          Selecting a category downloads 10 images so the alarm has visuals even offline.
        </Text>
        <View style={styles.grid}>
          {BACKGROUND_TOPICS.map(t => {
            const active = selectedTopics.includes(t.id);
            const status = cacheStatus[t.id];
            const loading = pendingTopic === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => !loading && toggleTopic(t.id)}
                style={[styles.topic, active && styles.topicActive, loading && styles.topicLoading]}
              >
                <View style={styles.topicLeft}>
                  <Text style={styles.topicEmoji}>{t.emoji}</Text>
                  <View>
                    <Text style={[styles.topicLabel, active && styles.topicLabelActive]}>{t.label}</Text>
                    <Text style={styles.topicMeta}>
                      {loading ? 'Downloading…' : status ? `${status.cachedCount} cached` : ''}
                    </Text>
                  </View>
                </View>
                {loading ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : active ? (
                  <Check size={20} color={colors.accent} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.section}>Your images</Text>
        <View style={styles.customRow}>
          <Pressable onPress={handleAddCustom} disabled={busy} style={styles.addBtn}>
            <Plus size={20} color={colors.accent} />
            <Text style={styles.addTxt}>Add from gallery</Text>
          </Pressable>
        </View>
        {customImages.length > 0 && (
          <FlatList
            horizontal
            data={customImages}
            keyExtractor={(u, i) => `${u}-${i}`}
            renderItem={({ item }) => (
              <Animated.View entering={FadeIn} layout={LinearTransition.springify().damping(18)} style={styles.thumb}>
                <Image source={{ uri: item }} style={styles.thumbImage} />
                <Pressable onPress={() => handleRemoveCustom(item)} style={styles.thumbDelete}>
                  <Trash2 size={14} color={colors.text} />
                </Pressable>
              </Animated.View>
            )}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          />
        )}
        {customImages.length === 0 && (
          <View style={styles.emptyCustom}>
            <ImageIcon size={24} color={colors.textDim} />
            <Text style={styles.emptyTxt}>No custom images yet</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: '600' },
  save: { color: colors.accent, fontWeight: '700', fontSize: 16 },
  section: { color: colors.textDim, fontSize: 12, letterSpacing: 1, marginTop: 18, marginBottom: 8, marginHorizontal: 20 },
  hint: { color: colors.textMuted, fontSize: 13, marginHorizontal: 20, marginBottom: 10 },
  grid: { paddingHorizontal: 16, gap: 8 },
  topic: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14 },
  topicActive: { backgroundColor: colors.cardHover, borderWidth: 1, borderColor: colors.accent },
  topicLoading: { opacity: 0.7 },
  topicLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topicEmoji: { fontSize: 22 },
  topicLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  topicLabelActive: { color: colors.accent },
  topicMeta: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  customRow: { paddingHorizontal: 16 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 14, backgroundColor: colors.card, borderRadius: 14 },
  addTxt: { color: colors.accent, fontWeight: '600' },
  thumb: { width: 96, height: 96, borderRadius: 12, overflow: 'hidden', marginTop: 12 },
  thumbImage: { width: '100%', height: '100%' },
  thumbDelete: { position: 'absolute', top: 4, right: 4, padding: 6, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)' },
  emptyCustom: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyTxt: { color: colors.textDim },
});
