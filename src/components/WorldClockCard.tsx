import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DateTime } from 'luxon';
import { X } from 'lucide-react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useColors, type Palette } from '@/constants/colors';
import type { WorldClock } from '@/types';

type Props = {
  clock: WorldClock;
  now: number;
  onRemove: () => void;
};

export const WorldClockCard = React.memo(function WorldClockCard({ clock, now, onRemove }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const dt = DateTime.fromMillis(now).setZone(clock.timezone);
  const local = DateTime.fromMillis(now);
  const diffH = Math.round((dt.offset - local.offset) / 60);
  const diffLabel = diffH === 0
    ? 'Same time'
    : `${diffH > 0 ? '+' : ''}${diffH}h vs local`;

  return (
    <Animated.View layout={LinearTransition.springify().damping(18)} style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.label}>{clock.label}</Text>
        <Text style={styles.tz}>{clock.timezone}  •  {diffLabel}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.time}>{dt.toFormat('HH:mm')}</Text>
        <Text style={styles.date}>{dt.toFormat('EEE, dd LLL')}</Text>
      </View>
      <Pressable onPress={onRemove} hitSlop={10} style={styles.close}>
        <X size={16} color={colors.textDim} />
      </Pressable>
    </Animated.View>
  );
});

const makeStyles = (colors: Palette) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 18,
    backgroundColor: colors.card,
  },
  left: { flex: 1 },
  label: { color: colors.text, fontSize: 18, fontWeight: '600' },
  tz: { color: colors.textDim, fontSize: 12, marginTop: 3 },
  right: { alignItems: 'flex-end' },
  time: { color: colors.text, fontSize: 28, fontWeight: '600', fontVariant: ['tabular-nums'] },
  date: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  close: { position: 'absolute', top: 8, right: 8, padding: 4 },
});
