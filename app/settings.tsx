import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useAlarmStore } from '@/stores/useAlarmStore';
import { useColors, type Palette } from '@/constants/colors';

export default function SettingsScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const settings = useSettingsStore();
  const ringtones = useAlarmStore(s => s.ringtones);
  const ringtoneName = ringtones.find(r => r.id === settings.defaultRingtoneId)?.name ?? 'Default alarm';

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronLeft size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.section}>Appearance</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Clock format</Text>
            <View style={styles.segment}>
              <Pressable
                onPress={() => settings.set('clockFormat', '24h')}
                style={[styles.segmentBtn, settings.clockFormat === '24h' && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentTxt, settings.clockFormat === '24h' && styles.segmentTxtActive]}>24h</Text>
              </Pressable>
              <Pressable
                onPress={() => settings.set('clockFormat', '12h')}
                style={[styles.segmentBtn, settings.clockFormat === '12h' && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentTxt, settings.clockFormat === '12h' && styles.segmentTxtActive]}>12h</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Text style={styles.section}>Defaults for new alarms</Text>
        <View style={styles.card}>
          <Pressable style={styles.row} onPress={() => router.push('/ringtones')}>
            <Text style={styles.label}>Default ringtone</Text>
            <View style={styles.rowRight}>
              <Text style={styles.value}>{ringtoneName}</Text>
              <ChevronRight size={18} color={colors.textDim} />
            </View>
          </Pressable>
          <View style={styles.sep} />
          <View style={styles.row}>
            <Text style={styles.label}>Vibrate by default</Text>
            <Switch
              value={settings.defaultVibrate}
              onValueChange={(v) => settings.set('defaultVibrate', v)}
              trackColor={{ false: colors.shimmer, true: colors.accentDim }}
              thumbColor={settings.defaultVibrate ? colors.accent : '#888'}
            />
          </View>
        </View>

        <Text style={styles.section}>Permissions</Text>
        <Pressable style={[styles.card, styles.row, { paddingHorizontal: 16 }]} onPress={() => router.push('/permissions')}>
          <Text style={styles.label}>Manage alarm permissions</Text>
          <ChevronRight size={18} color={colors.textDim} />
        </Pressable>

        <Text style={styles.section}>Custom ringtones</Text>
        <Pressable style={[styles.card, styles.row, { paddingHorizontal: 16 }]} onPress={() => router.push('/ringtones')}>
          <Text style={styles.label}>Manage ringtones</Text>
          <ChevronRight size={18} color={colors.textDim} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  section: { color: colors.textDim, fontSize: 12, letterSpacing: 1, marginTop: 18, marginBottom: 8, marginHorizontal: 4 },
  card: { backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: colors.text, fontSize: 15 },
  value: { color: colors.textMuted, fontSize: 14 },
  sep: { height: 1, backgroundColor: colors.border },
  segment: { flexDirection: 'row', backgroundColor: colors.bgElevated, borderRadius: 10, padding: 2 },
  segmentBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  segmentBtnActive: { backgroundColor: colors.accent },
  segmentTxt: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  segmentTxtActive: { color: colors.accentOn },
});
