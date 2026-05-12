import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useColors } from '@/constants/colors';
import { springs } from '@/constants/animations';
import { DAY_LABELS, type DayMask } from '@/types';

type Props = {
  value: DayMask;
  onChange: (mask: DayMask) => void;
};

export function WeekdaySelector({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {DAY_LABELS.map((label, i) => {
        const bit = 1 << i;
        const active = (value & bit) !== 0;
        return (
          <DayChip
            key={i}
            label={label}
            active={active}
            onPress={() => onChange(value ^ bit)}
          />
        );
      })}
    </View>
  );
}

function DayChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(active ? 1.05 : 1, springs.bouncy) }],
    backgroundColor: active ? colors.accent : colors.card,
  }));
  return (
    <Pressable onPress={onPress} hitSlop={4}>
      <Animated.View style={[styles.chip, animated]}>
        <Text style={[styles.chipText, { color: active ? colors.accentOn : colors.textMuted }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  chip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontWeight: '700', fontSize: 14 },
});
