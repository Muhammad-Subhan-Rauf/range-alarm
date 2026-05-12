import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useColors, type Palette } from '@/constants/colors';
import { springs } from '@/constants/animations';

type Props = {
  children: React.ReactNode;
  onSwipeDelete?: () => void;
  threshold?: number;
};

/** Swipe-left-to-reveal-delete with smooth Reanimated motion. */
export function SwipeableRow({ children, onSwipeDelete, threshold = -100 }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const tx = useSharedValue(0);
  const opacity = useSharedValue(1);
  const height = useSharedValue<number | 'auto'>('auto');

  const collapse = () => {
    opacity.value = withTiming(0, { duration: 180 });
    height.value = withTiming(0, { duration: 220 }, (finished) => {
      if (finished && onSwipeDelete) runOnJS(onSwipeDelete)();
    });
  };

  const gesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate(e => {
      tx.value = Math.min(0, e.translationX);
    })
    .onEnd(() => {
      if (tx.value < threshold && onSwipeDelete) {
        tx.value = withTiming(-500, { duration: 220 });
        runOnJS(collapse)();
      } else {
        tx.value = withSpring(0, springs.snappy);
      }
    });

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
    opacity: opacity.value,
  }));

  const wrapperStyle = useAnimatedStyle(() => ({
    height: height.value as number | undefined,
  }));

  const trailStyle = useAnimatedStyle(() => {
    const visible = -tx.value > 12 ? 1 : 0;
    return { opacity: withTiming(visible, { duration: 80 }) };
  });

  return (
    <Animated.View style={[styles.outer, wrapperStyle]}>
      <Animated.View style={[styles.trail, trailStyle]} pointerEvents="none">
        <View style={styles.trailLabel} />
      </Animated.View>
      <GestureDetector gesture={gesture}>
        <Animated.View style={containerStyle}>{children}</Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  outer: { overflow: 'hidden' },
  trail: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.danger,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 28,
  },
  trailLabel: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.35)' },
});
