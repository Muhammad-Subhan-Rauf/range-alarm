import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlarmClock, Bell, Lock, Maximize } from 'lucide-react-native';
import { nativeAlarm } from 'native-alarm';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useColors, type Palette } from '@/constants/colors';

export default function PermissionsScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const setSetting = useSettingsStore(s => s.set);
  const [exact, setExact] = useState<boolean | null>(null);
  const [fsi, setFsi] = useState<boolean | null>(null);
  const [notif, setNotif] = useState<boolean | null>(null);

  const refresh = async () => {
    setExact(await nativeAlarm.hasExactAlarmPermission());
    setFsi(await nativeAlarm.hasFullScreenIntentPermission());
    setNotif(await nativeAlarm.hasNotificationPermission());
  };

  useEffect(() => { void refresh(); }, []);

  const allGranted = exact === true && fsi === true && notif === true;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <AlarmClock size={32} color={colors.accent} />
        <Text style={styles.title}>Just a few permissions</Text>
        <Text style={styles.sub}>
          The app needs these so alarms can fire even when your phone is locked or the app is killed.
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <PermissionRow
          icon={<Lock size={20} color={colors.accent} />}
          title="Exact alarms"
          desc="Required for alarms to fire at the exact time you set. Without this, Android may delay them by minutes."
          granted={exact}
          onPress={async () => { await nativeAlarm.openExactAlarmSettings(); }}
        />
        <PermissionRow
          icon={<Maximize size={20} color={colors.accent} />}
          title="Full-screen alarms"
          desc="Allows the alarm to take over the screen when it fires, even on the lock screen."
          granted={fsi}
          onPress={async () => { await nativeAlarm.openFullScreenIntentSettings(); }}
        />
        <PermissionRow
          icon={<Bell size={20} color={colors.accent} />}
          title="Notifications"
          desc="Used as a fallback display channel when the system blocks the full-screen activity."
          granted={notif}
          onPress={refresh}
        />

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
          <Pressable onPress={refresh} style={[styles.btn, { backgroundColor: colors.card }]}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>Re-check</Text>
          </Pressable>
          <Pressable
            disabled={!allGranted}
            onPress={async () => {
              await setSetting('permissionsAcknowledged', true);
              router.back();
            }}
            style={[styles.btn, { backgroundColor: allGranted ? colors.accent : colors.card }]}
          >
            <Text style={{ color: allGranted ? colors.accentOn : colors.textDim, fontWeight: '700' }}>Done</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={async () => {
            await setSetting('permissionsAcknowledged', true);
            router.back();
          }}
          style={{ marginTop: 18, alignItems: 'center' }}
        >
          <Text style={{ color: colors.textDim }}>Skip for now</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function PermissionRow({
  icon,
  title,
  desc,
  granted,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  granted: boolean | null;
  onPress: () => void | Promise<void>;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable onPress={onPress} style={styles.row} android_ripple={{ color: colors.cardHover }}>
      <View style={styles.iconWrap}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDesc}>{desc}</Text>
      </View>
      <Text style={[styles.status, { color: granted ? colors.accent : colors.warn }]}>
        {granted == null ? '...' : granted ? 'OK' : 'GRANT'}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { alignItems: 'center', padding: 24, gap: 8 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  sub: { color: colors.textMuted, textAlign: 'center', marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, backgroundColor: colors.card, borderRadius: 16, marginBottom: 12 },
  iconWrap: { padding: 6, backgroundColor: colors.cardHover, borderRadius: 10 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowDesc: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  status: { fontWeight: '700', alignSelf: 'center' },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
});
