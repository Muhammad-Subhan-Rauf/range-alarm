import React from 'react';
import { Stack } from 'expo-router';
import { useColors } from '@/constants/colors';

export default function AlarmsStack() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
