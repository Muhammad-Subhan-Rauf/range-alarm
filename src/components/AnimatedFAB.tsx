import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import { useColors, type Palette } from '@/constants/colors';
import { springs } from '@/constants/animations';

type Props = { onPress: () => void };

export function AnimatedFAB({ onPress }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [pressedState, setPressedState] = React.useState(false);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressedState ? 0.9 : 1, springs.bouncy) }],
  }));

  return (
    <Pressable
      onPressIn={() => setPressedState(true)}
      onPressOut={() => setPressedState(false)}
      onPress={onPress}
      style={styles.touch}
      hitSlop={8}
    >
      <Animated.View style={[styles.fab, style]}>
        <Plus size={28} color={colors.accentOn} />
      </Animated.View>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  touch: { position: 'absolute', right: 20, bottom: 100 },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
});
