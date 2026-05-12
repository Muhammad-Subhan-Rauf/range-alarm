import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';
import { Flag, Pause, Play, RotateCcw } from 'lucide-react-native';
import { useStopwatchStore } from '@/stores/useStopwatchStore';
import { useNow } from '@/hooks/useNow';
import { useColors, type Palette } from '@/constants/colors';

function formatStopwatch(ms: number): string {
  const total = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const cs = Math.floor((total % 1000) / 10);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(minutes)}:${pad(seconds)}.${pad(cs)}`;
}

export default function StopwatchScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  useNow(50);
  const { status, laps, start, pause, resume, reset, lap, elapsed } = useStopwatchStore();

  const ms = elapsed();
  const previousLapTotal = laps.length > 0 ? laps[0] : 0;
  const currentLapMs = ms - previousLapTotal;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Stopwatch</Text>
      </View>
      <View style={styles.timeWrap}>
        <Text style={styles.timeMain}>{formatStopwatch(ms)}</Text>
        {laps.length > 0 && (
          <Text style={styles.timeSub}>Lap {formatStopwatch(currentLapMs)}</Text>
        )}
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={status === 'running' ? lap : reset}
          style={[styles.sideBtn, status === 'idle' && { opacity: 0.4 }]}
          disabled={status === 'idle'}
        >
          {status === 'running' ? <Flag size={20} color={colors.text} /> : <RotateCcw size={20} color={colors.text} />}
        </Pressable>
        <Pressable
          onPress={status === 'running' ? pause : status === 'paused' ? resume : start}
          style={[styles.bigBtn, { backgroundColor: status === 'running' ? colors.warn : colors.accent }]}
        >
          {status === 'running' ? <Pause size={28} color={colors.accentOn} /> : <Play size={28} color={colors.accentOn} style={{ marginLeft: 3 }} />}
        </Pressable>
        <View style={{ width: 50 }} />
      </View>

      <FlatList
        data={laps}
        keyExtractor={(_, i) => `lap-${i}`}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.springify()} layout={LinearTransition.springify().damping(18)} style={styles.lapRow}>
            <Text style={styles.lapIdx}>Lap {laps.length - index}</Text>
            <Text style={styles.lapTime}>{formatStopwatch(index === 0 ? ms - item : laps[index - 1] - item)}</Text>
            <Text style={styles.lapTotal}>{formatStopwatch(item)}</Text>
          </Animated.View>
        )}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { color: colors.text, fontSize: 32, fontWeight: '700' },
  timeWrap: { alignItems: 'center', paddingVertical: 32 },
  timeMain: { color: colors.text, fontSize: 64, fontWeight: '700', fontVariant: ['tabular-nums'] },
  timeSub: { color: colors.textMuted, marginTop: 6, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, marginVertical: 18 },
  sideBtn: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  bigBtn: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  lapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 8,
  },
  lapIdx: { color: colors.textMuted, width: 70 },
  lapTime: { color: colors.text, flex: 1, fontWeight: '600', fontVariant: ['tabular-nums'] },
  lapTotal: { color: colors.textDim, fontVariant: ['tabular-nums'] },
});
