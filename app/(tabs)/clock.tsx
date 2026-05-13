import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';
import { Plus, Search } from 'lucide-react-native';
import { DateTime } from 'luxon';
import { useNow } from '@/hooks/useNow';
import { useWorldClockStore } from '@/stores/useWorldClockStore';
import { WorldClockCard } from '@/components/WorldClockCard';
import { WorldMapPicker } from '@/components/WorldMapPicker';
import { useColors, type Palette } from '@/constants/colors';

const COMMON_ZONES: { label: string; tz: string }[] = [
  { label: 'New York', tz: 'America/New_York' },
  { label: 'Los Angeles', tz: 'America/Los_Angeles' },
  { label: 'London', tz: 'Europe/London' },
  { label: 'Paris', tz: 'Europe/Paris' },
  { label: 'Dubai', tz: 'Asia/Dubai' },
  { label: 'Mumbai', tz: 'Asia/Kolkata' },
  { label: 'Singapore', tz: 'Asia/Singapore' },
  { label: 'Tokyo', tz: 'Asia/Tokyo' },
  { label: 'Sydney', tz: 'Australia/Sydney' },
  { label: 'Auckland', tz: 'Pacific/Auckland' },
  { label: 'São Paulo', tz: 'America/Sao_Paulo' },
  { label: 'Reykjavik', tz: 'Atlantic/Reykjavik' },
  { label: 'Cairo', tz: 'Africa/Cairo' },
  { label: 'Johannesburg', tz: 'Africa/Johannesburg' },
];

export default function ClockScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const now = useNow(1000);
  const clocks = useWorldClockStore(s => s.clocks);
  const add = useWorldClockStore(s => s.add);
  const remove = useWorldClockStore(s => s.remove);
  const [open, setOpen] = useState(false);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Clock</Text>
        <Pressable onPress={() => setOpen(true)} hitSlop={10}>
          <Plus size={24} color={colors.accent} />
        </Pressable>
      </View>

      <View style={styles.localCard}>
        <Text style={styles.localTime}>{DateTime.fromMillis(now).toFormat('HH:mm:ss')}</Text>
        <Text style={styles.localDate}>{DateTime.fromMillis(now).toFormat('EEEE, dd LLL yyyy')}</Text>
        <Text style={styles.localTz}>{DateTime.local().zoneName}</Text>
      </View>

      <FlatList
        data={clocks}
        keyExtractor={c => c.id}
        renderItem={({ item }) => (
          <WorldClockCard clock={item} now={now} onRemove={() => remove(item.id)} />
        )}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 80 }}
        ListEmptyComponent={
          <Animated.View entering={FadeIn} style={styles.empty}>
            <Text style={styles.emptyTxt}>No world clocks yet</Text>
            <Text style={styles.emptyHint}>Tap + to add a timezone</Text>
          </Animated.View>
        }
      />

      <AddZoneModal
        visible={open}
        onClose={() => setOpen(false)}
        onAdd={async (label, tz) => {
          await add({ label, timezone: tz });
          setOpen(false);
        }}
        already={new Set(clocks.map(c => c.timezone))}
        now={now}
      />
    </SafeAreaView>
  );
}

function AddZoneModal({ visible, onClose, onAdd, already, now }: { visible: boolean; onClose: () => void; onAdd: (label: string, tz: string) => void | Promise<void>; already: Set<string>; now: number }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => COMMON_ZONES.filter(z =>
      !already.has(z.tz) && (z.label.toLowerCase().includes(query.toLowerCase()) || z.tz.toLowerCase().includes(query.toLowerCase())),
    ),
    [query, already],
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View entering={SlideInDown.duration(220)} style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Add timezone</Text>
          <View style={styles.modeRow}>
            <Pressable onPress={() => setMode('map')} style={[styles.modeBtn, mode === 'map' && styles.modeBtnActive]}>
              <Text style={[styles.modeTxt, mode === 'map' && styles.modeTxtActive]}>Map</Text>
            </Pressable>
            <Pressable onPress={() => setMode('list')} style={[styles.modeBtn, mode === 'list' && styles.modeBtnActive]}>
              <Text style={[styles.modeTxt, mode === 'list' && styles.modeTxtActive]}>Search</Text>
            </Pressable>
          </View>

          {mode === 'map' ? (
            <View style={{ paddingTop: 6 }}>
              <WorldMapPicker
                addedTimezones={already}
                now={now}
                onAdd={(city) => onAdd(city.label, city.timezone)}
              />
            </View>
          ) : (
            <>
              <View style={styles.searchRow}>
                <Search size={16} color={colors.textDim} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search cities or zones…"
                  placeholderTextColor={colors.textDim}
                  style={styles.searchInput}
                />
              </View>
              <FlatList
                data={filtered}
                keyExtractor={(z) => z.tz}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => onAdd(item.label, item.tz)}
                    style={styles.zoneRow}
                    android_ripple={{ color: colors.cardHover }}
                  >
                    <View>
                      <Text style={styles.zoneLabel}>{item.label}</Text>
                      <Text style={styles.zoneTz}>{item.tz}</Text>
                    </View>
                    <Text style={styles.zoneTime}>{DateTime.fromMillis(now).setZone(item.tz).toFormat('HH:mm')}</Text>
                  </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={styles.sep} />}
              />
            </>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  title: { color: colors.text, fontSize: 32, fontWeight: '700' },
  localCard: { alignItems: 'center', paddingVertical: 24 },
  localTime: { color: colors.text, fontSize: 60, fontWeight: '700', fontVariant: ['tabular-nums'] },
  localDate: { color: colors.textMuted, marginTop: 4 },
  localTz: { color: colors.accent, marginTop: 4 },
  empty: { alignItems: 'center', padding: 32 },
  emptyTxt: { color: colors.text, fontSize: 18, fontWeight: '600' },
  emptyHint: { color: colors.textDim, marginTop: 6 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 10 },
  modeRow: { flexDirection: 'row', backgroundColor: colors.bgElevated, borderRadius: 10, padding: 3, marginBottom: 12 },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.accent },
  modeTxt: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  modeTxtActive: { color: colors.accentOn },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 12, gap: 8 },
  searchInput: { color: colors.text, flex: 1, paddingVertical: 10 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  zoneLabel: { color: colors.text, fontSize: 16, fontWeight: '500' },
  zoneTz: { color: colors.textDim, fontSize: 12 },
  zoneTime: { color: colors.textMuted, fontSize: 18, fontVariant: ['tabular-nums'] },
  sep: { height: 1, backgroundColor: colors.border },
});
