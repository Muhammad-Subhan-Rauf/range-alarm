import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { ChevronLeft, Music2, Plus, Trash2 } from 'lucide-react-native';
import { useAlarmStore } from '@/stores/useAlarmStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useColors, type Palette } from '@/constants/colors';

export default function RingtonesScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const ringtones = useAlarmStore(s => s.ringtones);
  const importRingtone = useAlarmStore(s => s.importRingtone);
  const removeRingtone = useAlarmStore(s => s.removeRingtone);
  const setDefault = useSettingsStore(s => s.set);
  const defaultId = useSettingsStore(s => s.defaultRingtoneId);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronLeft size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Ringtones</Text>
        <Pressable onPress={importRingtone} hitSlop={10}>
          <Plus size={24} color={colors.accent} />
        </Pressable>
      </View>
      <FlatList
        data={ringtones}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <Animated.View layout={LinearTransition.springify().damping(18)} style={styles.row}>
            <Music2 size={20} color={item.id === defaultId ? colors.accent : colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.bundled ? 'Bundled' : 'Imported'}</Text>
            </View>
            <Pressable onPress={() => setDefault('defaultRingtoneId', item.id)} hitSlop={8}>
              <Text style={[styles.action, { color: item.id === defaultId ? colors.accent : colors.textMuted }]}>
                {item.id === defaultId ? 'Default' : 'Use'}
              </Text>
            </Pressable>
            {!item.bundled && (
              <Pressable onPress={() => removeRingtone(item)} hitSlop={8} style={{ marginLeft: 8 }}>
                <Trash2 size={16} color={colors.danger} />
              </Pressable>
            )}
          </Animated.View>
        )}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: 14,
    marginBottom: 8,
  },
  name: { color: colors.text, fontSize: 15, fontWeight: '500' },
  meta: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  action: { fontWeight: '600' },
});
