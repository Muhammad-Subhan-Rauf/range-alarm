import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { nativeAlarm, addAlarmDismissedListener, addAlarmFiredListener, addAlarmSnoozedListener } from 'native-alarm';
import { useAlarmStore } from '@/stores/useAlarmStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useWorldClockStore } from '@/stores/useWorldClockStore';
import { useColors } from '@/constants/colors';

export default function RootLayout() {
  const colors = useColors();
  const hydrateAlarms = useAlarmStore(s => s.hydrate);
  const hydrateSettings = useSettingsStore(s => s.hydrate);
  const hydrateClocks = useWorldClockStore(s => s.hydrate);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([hydrateSettings(), hydrateClocks(), hydrateAlarms()]);
      if (cancelled) return;
      const ok = await nativeAlarm.hasExactAlarmPermission();
      const acked = useSettingsStore.getState().permissionsAcknowledged;
      if (!ok && !acked) router.push('/permissions');
    })().catch(err => console.warn('[root] hydrate failed', err));
    return () => { cancelled = true; };
  }, [hydrateAlarms, hydrateSettings, hydrateClocks, router]);

  useEffect(() => {
    const refresh = () => {
      useAlarmStore.getState().refreshGroups().catch(() => {});
    };
    const subs = [
      addAlarmFiredListener(refresh),
      addAlarmDismissedListener(refresh),
      addAlarmSnoozedListener(refresh),
    ];
    return () => { subs.forEach(s => s.remove()); };
  }, []);

  const isDark = colors.bg === '#0E0E10';
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.bg} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="permissions" options={{ presentation: 'modal' }} />
          <Stack.Screen name="ringtones" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
