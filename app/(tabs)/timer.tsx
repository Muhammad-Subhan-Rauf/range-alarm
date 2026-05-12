import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { Pause, Play, RotateCcw } from 'lucide-react-native';
import { useTimerStore } from '@/stores/useTimerStore';
import { useNow } from '@/hooks/useNow';
import { formatDuration } from '@/services/timeUtils';
import { useColors, type Palette } from '@/constants/colors';
import { springs } from '@/constants/animations';

const SIZE = 280;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

export default function TimerScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const now = useNow(100);
  const { status, durationMs, endAtMs, remainingMs, setDuration, start, pause, resume, reset } = useTimerStore();

  const remaining = status === 'running' && endAtMs
    ? Math.max(0, endAtMs - now)
    : remainingMs;

  const progress = durationMs > 0 ? 1 - remaining / durationMs : 0;
  const dashOffset = CIRC * (1 - progress);

  const presets = useMemo(() => [
    { label: '1m', ms: 60_000 },
    { label: '5m', ms: 5 * 60_000 },
    { label: '10m', ms: 10 * 60_000 },
    { label: '15m', ms: 15 * 60_000 },
    { label: '25m', ms: 25 * 60_000 },
    { label: '45m', ms: 45 * 60_000 },
  ], []);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Timer</Text>
      </View>

      <View style={styles.ringWrap}>
        <Svg width={SIZE} height={SIZE}>
          <SvgCircle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.card} strokeWidth={STROKE} fill="none" />
          <SvgCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={colors.accent}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={`${CIRC} ${CIRC}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={styles.center}>
          <Text style={styles.timeBig}>{formatDuration(remaining)}</Text>
          <Text style={styles.statusTxt}>{status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.presetRow}>
        {presets.map(p => (
          <Pressable
            key={p.label}
            onPress={() => setDuration(p.ms)}
            disabled={status === 'running'}
            style={[styles.preset, durationMs === p.ms && styles.presetActive]}
          >
            <Text style={[styles.presetTxt, durationMs === p.ms && styles.presetTxtActive]}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.controls}>
        <Pressable onPress={reset} style={styles.smallBtn}>
          <RotateCcw size={20} color={colors.text} />
        </Pressable>
        <BigButton
          status={status}
          onStart={start}
          onPause={pause}
          onResume={resume}
        />
        <View style={{ width: 50 }} />
      </View>
    </SafeAreaView>
  );
}

function BigButton({ status, onStart, onPause, onResume }: { status: 'idle' | 'running' | 'paused'; onStart: () => void; onPause: () => void; onResume: () => void; }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const action = status === 'running' ? onPause : status === 'paused' ? onResume : onStart;
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(status === 'running' ? 1.05 : 1, springs.bouncy) }],
  }));
  return (
    <Pressable onPress={action} hitSlop={10}>
      <Animated.View style={[styles.bigBtn, animated]}>
        {status === 'running' ? (
          <Pause size={28} color={colors.accentOn} />
        ) : (
          <Play size={28} color={colors.accentOn} style={{ marginLeft: 3 }} />
        )}
      </Animated.View>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  header: { width: '100%', paddingHorizontal: 20, paddingVertical: 16 },
  title: { color: colors.text, fontSize: 32, fontWeight: '700' },
  ringWrap: { marginTop: 12 },
  center: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  timeBig: { color: colors.text, fontSize: 56, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statusTxt: { color: colors.textMuted, marginTop: 6, letterSpacing: 2, fontSize: 11 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 26 },
  preset: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, backgroundColor: colors.card },
  presetActive: { backgroundColor: colors.accent },
  presetTxt: { color: colors.textMuted, fontWeight: '600' },
  presetTxtActive: { color: colors.bg },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 32 },
  smallBtn: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  bigBtn: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
});
