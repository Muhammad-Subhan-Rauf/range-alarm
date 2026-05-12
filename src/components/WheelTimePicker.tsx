import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useColors, type Palette } from '@/constants/colors';
import { springs } from '@/constants/animations';

export const WHEEL_ITEM_HEIGHT = 48;
export const WHEEL_VISIBLE = 5;
const ITEM_HEIGHT = WHEEL_ITEM_HEIGHT;
const VISIBLE = WHEEL_VISIBLE;

type Props = {
  value: number;
  onChange: (value: number) => void;
  /** Inclusive range. */
  min: number;
  max: number;
  /** Step (default 1). */
  step?: number;
  width?: number;
  label?: string;
  /** When part of a multi-wheel row, the parent draws one continuous highlight. */
  hideHighlight?: boolean;
};

export function WheelTimePicker({ value, onChange, min, max, step = 1, width = 60, label, hideHighlight }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const count = Math.floor((max - min) / step) + 1;
  const values = Array.from({ length: count }, (_, i) => min + i * step);

  const scrollY = useSharedValue(((value - min) / step) * ITEM_HEIGHT);

  useEffect(() => {
    scrollY.value = withSpring(((value - min) / step) * ITEM_HEIGHT, springs.snappy);
  }, [value, min, step, scrollY]);

  const startY = useSharedValue(0);

  const setValue = (next: number) => {
    onChange(next);
  };

  const gesture = Gesture.Pan()
    .onStart(() => {
      startY.value = scrollY.value;
    })
    .onUpdate((e) => {
      const next = startY.value - e.translationY;
      scrollY.value = Math.max(0, Math.min((count - 1) * ITEM_HEIGHT, next));
    })
    .onEnd(() => {
      const idx = Math.round(scrollY.value / ITEM_HEIGHT);
      const snap = idx * ITEM_HEIGHT;
      scrollY.value = withSpring(snap, springs.snappy);
      const next = min + idx * step;
      runOnJS(setValue)(next);
    });

  return (
    <View style={[styles.wrap, { width }]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <GestureDetector gesture={gesture}>
        <View style={styles.window}>
          {!hideHighlight && <View style={styles.highlightRow} pointerEvents="none" />}
          {values.map((v, i) => (
            <WheelItem key={v} index={i} value={v} scrollY={scrollY} styles={styles} />
          ))}
        </View>
      </GestureDetector>
    </View>
  );
}

type ItemProps = {
  index: number;
  value: number;
  scrollY: SharedValue<number>;
  styles: ReturnType<typeof makeStyles>;
};

function WheelItem({ index, value, scrollY, styles }: ItemProps) {
  const animated = useAnimatedStyle(() => {
    const center = scrollY.value;
    const itemY = index * ITEM_HEIGHT;
    const distance = Math.abs(itemY - center);
    const opacity = interpolate(distance, [0, ITEM_HEIGHT, ITEM_HEIGHT * 2], [1, 0.45, 0.15], Extrapolation.CLAMP);
    const scale = interpolate(distance, [0, ITEM_HEIGHT, ITEM_HEIGHT * 2], [1, 0.85, 0.7], Extrapolation.CLAMP);
    const translateY = -center + itemY + (VISIBLE - 1.5) * ITEM_HEIGHT * 0.5;
    return {
      transform: [{ translateY }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.item, animated]}>
      <Text style={styles.itemText}>{value < 10 ? `0${value}` : `${value}`}</Text>
    </Animated.View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { alignItems: 'center' },
  label: { color: colors.textMuted, fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  window: {
    height: ITEM_HEIGHT * VISIBLE,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    width: '100%',
  },
  highlightRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ((VISIBLE - 1.45) / 2) * ITEM_HEIGHT,
    height: ITEM_HEIGHT,
    backgroundColor: colors.cardHover,
    borderRadius: 12,
  },
  item: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { color: colors.text, fontSize: 26, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
