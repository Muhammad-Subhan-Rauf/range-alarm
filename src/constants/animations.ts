import { Easing } from 'react-native-reanimated';

export const springs = {
  gentle: { damping: 16, stiffness: 120, mass: 0.6 },
  snappy: { damping: 18, stiffness: 240, mass: 0.5 },
  bouncy: { damping: 10, stiffness: 200, mass: 0.6 },
} as const;

export const timings = {
  fast: { duration: 160, easing: Easing.bezier(0.2, 0.7, 0.2, 1) },
  normal: { duration: 260, easing: Easing.bezier(0.2, 0.7, 0.2, 1) },
  slow: { duration: 420, easing: Easing.bezier(0.16, 1, 0.3, 1) },
} as const;
