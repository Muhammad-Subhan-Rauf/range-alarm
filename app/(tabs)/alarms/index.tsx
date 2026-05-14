import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Settings as SettingsIcon } from 'lucide-react-native';
import { useAlarmStore } from '@/stores/useAlarmStore';
import { AlarmRow } from '@/components/AlarmRow';
import { SwipeableRow } from '@/components/SwipeableRow';
import { BatchActionBar } from '@/components/BatchActionBar';
import { AnimatedFAB } from '@/components/AnimatedFAB';
import { useColors, type Palette } from '@/constants/colors';

export default function AlarmsListScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const groups = useAlarmStore(s => s.groups);
  const instancesByGroup = useAlarmStore(s => s.instancesByGroup);
  const ringtones = useAlarmStore(s => s.ringtones);
  const selectedIds = useAlarmStore(s => s.selectedGroupIds);
  const toggleSelection = useAlarmStore(s => s.toggleSelection);
  const clearSelection = useAlarmStore(s => s.clearSelection);
  const toggleGroup = useAlarmStore(s => s.toggleGroup);
  const removeGroups = useAlarmStore(s => s.removeGroups);
  const batchPatch = useAlarmStore(s => s.batchPatch);
  const pauseGroupsToday = useAlarmStore(s => s.pauseGroupsToday);
  const pauseGroupToday = useAlarmStore(s => s.pauseGroupToday);
  const resumeGroup = useAlarmStore(s => s.resumeGroup);

  const selectionMode = selectedIds.size > 0;
  const [batchEditOpen, setBatchEditOpen] = useState(false);

  const ringtoneFor = useMemo(() => {
    const map = new Map(ringtones.map(r => [r.id, r] as const));
    return (id: string) => map.get(id);
  }, [ringtones]);

  const handleRowPress = (id: string) => {
    if (selectionMode) toggleSelection(id);
    else router.push(`/(tabs)/alarms/${id}`);
  };

  const handleBatchDelete = async () => {
    await removeGroups(Array.from(selectedIds));
  };

  const handleBatchToggle = async () => {
    const allEnabled = Array.from(selectedIds).every(id =>
      groups.find(g => g.id === id)?.enabled,
    );
    for (const id of selectedIds) {
      await toggleGroup(id, !allEnabled);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Alarms</Text>
        <Pressable hitSlop={10} onPress={() => router.push('/settings')}>
          <SettingsIcon size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      {groups.length === 0 ? (
        <Animated.View entering={FadeIn.duration(220)} style={styles.empty}>
          <Text style={styles.emptyTitle}>No alarms yet</Text>
          <Text style={styles.emptyHint}>Tap + to create a single alarm or a range</Text>
        </Animated.View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => (
            <SwipeableRow onSwipeDelete={() => removeGroups([item.id])}>
              <AlarmRow
                group={item}
                instances={instancesByGroup[item.id] ?? []}
                ringtone={ringtoneFor(item.ringtoneId)}
                selectionMode={selectionMode}
                selected={selectedIds.has(item.id)}
                onPress={() => handleRowPress(item.id)}
                onLongPress={() => toggleSelection(item.id)}
                onToggle={(enabled) => {
                  toggleGroup(item.id, enabled).catch((err: any) => {
                    Alert.alert('Could not toggle alarm', String(err?.message ?? err));
                  });
                }}
                onPauseToggle={() => {
                  const paused = !!item.pausedUntilMs && item.pausedUntilMs > Date.now();
                  const action = paused ? resumeGroup(item.id) : pauseGroupToday(item.id);
                  action.catch((err: any) => Alert.alert(paused ? 'Could not resume' : 'Could not pause', String(err?.message ?? err)));
                }}
              />
            </SwipeableRow>
          )}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 180 }}
        />
      )}

      <BatchActionBar
        count={selectedIds.size}
        onCancel={clearSelection}
        onDelete={handleBatchDelete}
        onToggle={handleBatchToggle}
        onPauseToday={() => {
          pauseGroupsToday(Array.from(selectedIds)).then(() => clearSelection());
        }}
        onEdit={() => setBatchEditOpen(true)}
      />

      <AnimatedFAB onPress={() => router.push('/(tabs)/alarms/new')} />

      {batchEditOpen && (
        <BatchEditSheet
          onClose={() => setBatchEditOpen(false)}
          onLabel={async (label) => {
            await batchPatch(Array.from(selectedIds), { label });
            setBatchEditOpen(false);
            clearSelection();
          }}
        />
      )}
    </SafeAreaView>
  );
}

function BatchEditSheet({ onClose, onLabel }: { onClose: () => void; onLabel: (label: string) => void | Promise<void>; }) {
  const colors = useColors();
  const sheet = useMemo(() => makeSheetStyles(colors), [colors]);
  const [val, setVal] = useState('');
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={sheet.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={sheet.sheet}>
          <Text style={sheet.title}>Rename selected</Text>
          <TextInput
            value={val}
            onChangeText={setVal}
            placeholder="Group label"
            placeholderTextColor={colors.textDim}
            style={sheet.input}
            autoFocus
          />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <Pressable onPress={onClose} style={[sheet.btn, { backgroundColor: colors.card }]}>
              <Text style={{ color: colors.text }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onLabel(val.trim())}
              style={[sheet.btn, { backgroundColor: colors.accent }]}
            >
              <Text style={{ color: colors.accentOn, fontWeight: '600' }}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeSheetStyles = (colors: Palette) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 24 },
  sheet: { backgroundColor: colors.bgElevated, borderRadius: 18, padding: 18 },
  title: { color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 12 },
  input: {
    color: colors.text,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
  },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});

const makeStyles = (colors: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { color: colors.text, fontSize: 32, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '600' },
  emptyHint: { color: colors.textDim, marginTop: 8, textAlign: 'center' },
});
