import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { CheckCircle2, Circle, Moon, Music2, Repeat } from 'lucide-react-native';
import { useColors, type Palette } from '@/constants/colors';
import { springs } from '@/constants/animations';
import { describeRepeat, formatTime, formatTimeOfDayRange } from '@/services/timeUtils';
import { useTimeFormat } from '@/hooks/useTimeFormat';
import type { AlarmGroup, AlarmInstance, Ringtone } from '@/types';
import { isSingleAlarmGroup } from '@/types';

type Props = {
  group: AlarmGroup;
  instances: AlarmInstance[];
  ringtone: Ringtone | undefined;
  selectionMode: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onToggle: (enabled: boolean) => void;
};

export const AlarmRow = React.memo(function AlarmRow({
  group, instances, ringtone, selectionMode, selected, onPress, onLongPress, onToggle,
}: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { is24 } = useTimeFormat();
  const enabled = group.enabled;
  const childCount = instances.length;
  const single = isSingleAlarmGroup(group);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(selected ? 0.98 : 1, springs.snappy) }],
    backgroundColor: selected ? colors.cardHover : colors.card,
  }));

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} android_ripple={{ color: colors.cardHover }}>
      <Animated.View style={[styles.row, animated]} layout={LinearTransition.springify().damping(20)}>
        {selectionMode ? (
          <View style={styles.checkbox}>
            {selected ? <CheckCircle2 size={22} color={colors.accent} /> : <Circle size={22} color={colors.textDim} />}
          </View>
        ) : null}

        <View style={styles.main}>
          <Text style={[styles.time, !enabled && styles.timeDim]}>
            {formatTime(group.start, is24)}
          </Text>
          {!single && (
            <Text style={styles.range}>
              {is24
                ? formatTimeOfDayRange(group.start, group.end, group.stepMinutes)
                : `${formatTime(group.start, false)} – ${formatTime(group.end, false)}${
                    group.stepMinutes > 0 ? `  •  every ${group.stepMinutes}m` : ''
                  }`}
              {`  (${childCount})`}
            </Text>
          )}
          {group.label ? <Text style={styles.label} numberOfLines={1}>{group.label}</Text> : null}
          <View style={styles.metaRow}>
            <Repeat size={12} color={colors.textDim} />
            <Text style={styles.meta}>{describeRepeat(group.repeatDays)}</Text>
            <View style={styles.dot} />
            <Music2 size={12} color={colors.textDim} />
            <Text style={styles.meta} numberOfLines={1}>{ringtone?.name ?? 'Default'}</Text>
          </View>
          {enabled && group.pausedUntilMs && group.pausedUntilMs > Date.now() ? (
            <View style={styles.pauseBadge}>
              <Moon size={12} color={colors.warn} />
              <Text style={styles.pauseBadgeText}>Paused until tomorrow</Text>
            </View>
          ) : null}
        </View>

        {!selectionMode && (
          <Switch
            value={enabled}
            onValueChange={onToggle}
            trackColor={{ false: colors.shimmer, true: colors.accentDim }}
            thumbColor={enabled ? colors.accent : '#888'}
          />
        )}
      </Animated.View>
    </Pressable>
  );
});

const makeStyles = (colors: Palette) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    marginHorizontal: 16,
    marginVertical: 4,
    gap: 12,
  },
  checkbox: { width: 28, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, gap: 2 },
  time: { color: colors.text, fontSize: 34, fontWeight: '600', fontVariant: ['tabular-nums'] },
  timeDim: { color: colors.textDim },
  range: { color: colors.textMuted, fontSize: 12, marginTop: 2, letterSpacing: 0.5 },
  label: { color: colors.text, fontSize: 14, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  meta: { color: colors.textDim, fontSize: 12 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textDim, marginHorizontal: 4 },
  pauseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(232,166,111,0.12)',
  },
  pauseBadgeText: { color: colors.warn, fontSize: 11, fontWeight: '600' },
});
