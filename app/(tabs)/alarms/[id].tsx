import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Image as ImageIcon, Music2, Trash2 } from 'lucide-react-native';
import { useAlarmStore } from '@/stores/useAlarmStore';
import { RingtonePicker } from '@/components/RingtonePicker';
import { WeekdaySelector } from '@/components/WeekdaySelector';
import { WheelTimePicker } from '@/components/WheelTimePicker';
import { useColors, type Palette } from '@/constants/colors';
import { describeRepeat, expandGroup, formatTime, to12h, to24h } from '@/services/timeUtils';
import { useTimeFormat } from '@/hooks/useTimeFormat';
import { DAY_MASK, isSingleAlarmGroup } from '@/types';

export default function EditGroupScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { is24 } = useTimeFormat();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const group = useAlarmStore(s => s.groups.find(g => g.id === id));
  const instances = useAlarmStore(s => s.instancesByGroup[id ?? ''] ?? []);
  const ringtones = useAlarmStore(s => s.ringtones);
  const saveGroup = useAlarmStore(s => s.saveGroup);
  const removeGroups = useAlarmStore(s => s.removeGroups);
  const setInstanceSkipped = useAlarmStore(s => s.setInstanceSkipped);
  const importRingtone = useAlarmStore(s => s.importRingtone);

  const [label, setLabel] = useState(group?.label ?? '');
  const [repeatDays, setRepeatDays] = useState(group?.repeatDays ?? 0);
  const [ringtoneId, setRingtoneId] = useState(group?.ringtoneId ?? 'system-default');
  const [snoozeMin, setSnoozeMin] = useState(Math.round((group?.snoozeMs ?? 9 * 60_000) / 60_000));
  const [snoozeMax, setSnoozeMax] = useState(group?.snoozeMaxRepeats ?? 0);
  const [vibrate, setVibrate] = useState(group?.vibrate ?? true);
  const [dismissChallenge, setDismissChallenge] = useState<'none' | 'shape'>(group?.dismissChallenge ?? 'none');
  const [challengeBlocksSnooze, setChallengeBlocksSnooze] = useState<boolean>(group?.challengeBlocksSnooze ?? false);
  const [ringtoneOpen, setRingtoneOpen] = useState(false);
  const [startH, setStartH] = useState(group?.start.hour ?? 8);
  const [startM, setStartM] = useState(group?.start.minute ?? 0);
  const [endH, setEndH] = useState(group?.end.hour ?? 8);
  const [endM, setEndM] = useState(group?.end.minute ?? 0);
  const [step, setStep] = useState(group?.stepMinutes ?? 0);

  const single = useMemo(() => (group ? isSingleAlarmGroup(group) : true), [group]);
  const previewCount = useMemo(() => {
    if (!group) return 0;
    return expandGroup({
      ...group,
      start: { hour: startH, minute: startM },
      end: { hour: endH, minute: endM },
      stepMinutes: single ? 0 : step,
    }).length;
  }, [group, startH, startM, endH, endM, step, single]);

  if (!group) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ color: colors.textMuted, padding: 20 }}>Group not found.</Text>
      </SafeAreaView>
    );
  }

  const onSave = () => {
    const updated = {
      ...group,
      label,
      repeatDays,
      ringtoneId,
      snoozeMs: snoozeMin * 60_000,
      snoozeMaxRepeats: snoozeMax,
      vibrate,
      dismissChallenge,
      challengeBlocksSnooze: dismissChallenge === 'shape' ? challengeBlocksSnooze : false,
      start: { hour: startH, minute: startM },
      end: single ? { hour: startH, minute: startM } : { hour: endH, minute: endM },
      stepMinutes: single ? 0 : step,
      updatedAt: Date.now(),
    };
    // Happy path: close immediately. Save runs in the background; surface any
    // error via an Alert if it ever fails.
    router.back();
    saveGroup(updated).catch((err: any) => {
      console.error('[edit] save failed', err?.message ?? err);
      Alert.alert('Could not save alarm', String(err?.message ?? err));
    });
  };

  const onDelete = () => {
    router.back();
    removeGroups([group.id]).catch((err: any) => {
      console.error('[edit] delete failed', err?.message ?? err);
      Alert.alert('Could not delete alarm', String(err?.message ?? err));
    });
  };

  const onAddRingtone = async () => {
    const r = await importRingtone();
    if (r) setRingtoneId(r.id);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronLeft size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{single ? 'Alarm' : 'Range'}</Text>
        <Pressable onPress={onSave} hitSlop={10}>
          <Text style={styles.save}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <View style={styles.pickerSection}>
          {!single && (
            <View style={styles.groupLabels}>
              <Text style={styles.groupLabel}>START</Text>
              <Text style={styles.groupLabel}>END</Text>
            </View>
          )}
          <View style={styles.pickerRow}>
            <View style={styles.rowHighlight} pointerEvents="none" />
            <WheelTimePicker
              value={is24 ? startH : to12h(startH).hour12}
              onChange={(v) => setStartH(is24 ? v : to24h(v, startH >= 12))}
              min={is24 ? 0 : 1}
              max={is24 ? 23 : 12}
              label="H"
              hideHighlight
            />
            <Text style={styles.colon}>:</Text>
            <WheelTimePicker value={startM} onChange={setStartM} min={0} max={59} label="M" hideHighlight />
            {!single && (
              <>
                <Text style={styles.dash}>—</Text>
                <WheelTimePicker
                  value={is24 ? endH : to12h(endH).hour12}
                  onChange={(v) => setEndH(is24 ? v : to24h(v, endH >= 12))}
                  min={is24 ? 0 : 1}
                  max={is24 ? 23 : 12}
                  label="H"
                  hideHighlight
                />
                <Text style={styles.colon}>:</Text>
                <WheelTimePicker value={endM} onChange={setEndM} min={0} max={59} label="M" hideHighlight />
              </>
            )}
          </View>
          {!is24 && (
            <View style={styles.amPmRow}>
              <AmPmToggle
                isPm={startH >= 12}
                label={!single ? 'START' : ''}
                onChange={(pm) => setStartH(to24h(to12h(startH).hour12, pm))}
              />
              {!single && (
                <AmPmToggle
                  isPm={endH >= 12}
                  label="END"
                  onChange={(pm) => setEndH(to24h(to12h(endH).hour12, pm))}
                />
              )}
            </View>
          )}
          {!single && (
            <View style={styles.stepInline}>
              <View style={styles.stepLabelCol}>
                <Text style={styles.fieldLabel}>STEP</Text>
                <Text style={styles.stepSubLabel}>minutes</Text>
              </View>
              <WheelTimePicker value={step} onChange={setStep} min={1} max={120} />
              <View style={styles.stepCountCol}>
                <Text style={styles.previewCount}>{previewCount}</Text>
                <Text style={styles.previewCountSub}>alarms</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Label</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Wake up, Standup, Med reminder…"
            placeholderTextColor={colors.textDim}
            style={styles.input}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Repeat</Text>
          <WeekdaySelector value={repeatDays} onChange={setRepeatDays} />
          <View style={styles.quickRow}>
            <QuickChip label="Once" active={repeatDays === 0} onPress={() => setRepeatDays(0)} />
            <QuickChip label="Weekdays" active={repeatDays === DAY_MASK.WEEKDAYS} onPress={() => setRepeatDays(DAY_MASK.WEEKDAYS)} />
            <QuickChip label="Weekends" active={repeatDays === DAY_MASK.WEEKEND} onPress={() => setRepeatDays(DAY_MASK.WEEKEND)} />
            <QuickChip label="Every day" active={repeatDays === DAY_MASK.EVERY_DAY} onPress={() => setRepeatDays(DAY_MASK.EVERY_DAY)} />
          </View>
        </View>

        <Pressable style={styles.card} onPress={() => setRingtoneOpen(true)}>
          <Text style={styles.fieldLabel}>Ringtone</Text>
          <View style={styles.ringRow}>
            <Music2 size={18} color={colors.accent} />
            <Text style={styles.ringName}>
              {ringtones.find(r => r.id === ringtoneId)?.name ?? 'Default alarm'}
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.card}
          onPress={() => router.push(`/(tabs)/alarms/background/${group.id}`)}
        >
          <Text style={styles.fieldLabel}>Background</Text>
          <View style={styles.ringRow}>
            <ImageIcon size={18} color={colors.accent} />
            <Text style={styles.ringName}>
              {(group.backgroundTopics?.length ?? 0) + (group.backgroundCustomImages?.length ?? 0) === 0
                ? 'None — dark default'
                : `${group.backgroundTopics?.length ?? 0} categories · ${group.backgroundCustomImages?.length ?? 0} custom`}
            </Text>
          </View>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Snooze</Text>
          <View style={styles.snoozeRow}>
            <Text style={styles.snoozeLabel}>Every</Text>
            <NumberStepper value={snoozeMin} min={1} max={30} onChange={setSnoozeMin} suffix="min" />
            <Text style={styles.snoozeLabel}>·  Max</Text>
            <NumberStepper value={snoozeMax} min={0} max={10} onChange={setSnoozeMax} suffix={snoozeMax === 0 ? '∞' : ''} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Dismiss challenge</Text>
          <View style={styles.challengeRow}>
            <Pressable
              onPress={() => setDismissChallenge('none')}
              style={[styles.challengeBtn, dismissChallenge === 'none' && styles.challengeBtnActive]}
            >
              <Text style={[styles.challengeTxt, dismissChallenge === 'none' && styles.challengeTxtActive]}>None</Text>
            </Pressable>
            <Pressable
              onPress={() => setDismissChallenge('shape')}
              style={[styles.challengeBtn, dismissChallenge === 'shape' && styles.challengeBtnActive]}
            >
              <Text style={[styles.challengeTxt, dismissChallenge === 'shape' && styles.challengeTxtActive]}>Trace shape</Text>
            </Pressable>
          </View>
          {dismissChallenge === 'shape' && (
            <>
              <Text style={styles.challengeHint}>
                Trace today&apos;s shape to unlock the alarm. Shape rotates daily.
              </Text>
              <View style={[styles.rowBetween, { marginTop: 14 }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.ringName}>Also block Snooze</Text>
                  <Text style={styles.challengeHint}>
                    Snooze requires the same trace. Hides notification actions so it can&apos;t be bypassed.
                  </Text>
                </View>
                <Switch
                  value={challengeBlocksSnooze}
                  onValueChange={setChallengeBlocksSnooze}
                  trackColor={{ false: colors.shimmer, true: colors.accentDim }}
                  thumbColor={challengeBlocksSnooze ? colors.accent : '#888'}
                />
              </View>
            </>
          )}
        </View>

        <View style={[styles.card, styles.rowBetween]}>
          <Text style={styles.fieldLabel}>Vibrate</Text>
          <Switch
            value={vibrate}
            onValueChange={setVibrate}
            trackColor={{ false: colors.shimmer, true: colors.accentDim }}
            thumbColor={vibrate ? colors.accent : '#888'}
          />
        </View>

        {!single && (
          <View style={[styles.card, { paddingHorizontal: 0 }]}>
            <Text style={[styles.fieldLabel, { paddingHorizontal: 16 }]}>Instances</Text>
            {instances.map(inst => (
              <View key={inst.id} style={[styles.instRow, inst.skipped && styles.instRowSkipped]}>
                <Text style={[styles.instTime, inst.skipped && styles.instTimeSkipped]}>
                  {formatTime(inst.time, is24)}
                </Text>
                <Switch
                  value={!inst.skipped}
                  onValueChange={(v) => setInstanceSkipped(group.id, inst.id, !v)}
                  trackColor={{ false: colors.shimmer, true: colors.accentDim }}
                  thumbColor={!inst.skipped ? colors.accent : '#888'}
                />
              </View>
            ))}
          </View>
        )}

        <Pressable onPress={onDelete} style={styles.dangerBtn} android_ripple={{ color: colors.cardHover }}>
          <Trash2 size={18} color={colors.danger} />
          <Text style={styles.dangerTxt}>Delete {single ? 'alarm' : `range (${instances.length} alarms)`}</Text>
        </Pressable>
      </ScrollView>

      <RingtonePicker
        visible={ringtoneOpen}
        ringtones={ringtones}
        selectedId={ringtoneId}
        onSelect={setRingtoneId}
        onClose={() => setRingtoneOpen(false)}
        onAdd={onAddRingtone}
      />
    </SafeAreaView>
  );
}

function AmPmToggle({ isPm, label, onChange }: { isPm: boolean; label?: string; onChange: (pm: boolean) => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.amPmGroup}>
      {label ? <Text style={styles.amPmLabel}>{label}</Text> : null}
      <View style={styles.amPmSegment}>
        <Pressable onPress={() => onChange(false)} style={[styles.amPmBtn, !isPm && styles.amPmBtnActive]}>
          <Text style={[styles.amPmTxt, !isPm && styles.amPmTxtActive]}>AM</Text>
        </Pressable>
        <Pressable onPress={() => onChange(true)} style={[styles.amPmBtn, isPm && styles.amPmBtnActive]}>
          <Text style={[styles.amPmTxt, isPm && styles.amPmTxtActive]}>PM</Text>
        </Pressable>
      </View>
    </View>
  );
}

function QuickChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  const chip = useMemo(() => makeChipStyles(colors), [colors]);
  return (
    <Pressable onPress={onPress} style={[chip.qChip, active && chip.qChipActive]}>
      <Text style={[chip.qChipText, active && chip.qChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function NumberStepper({ value, min, max, onChange, suffix }: { value: number; min: number; max: number; onChange: (n: number) => void; suffix?: string }) {
  const colors = useColors();
  const chip = useMemo(() => makeChipStyles(colors), [colors]);
  return (
    <View style={chip.stepperRow}>
      <Pressable onPress={() => onChange(Math.max(min, value - 1))} style={chip.stepBtn}>
        <Text style={chip.stepBtnText}>−</Text>
      </Pressable>
      <Text style={chip.stepperVal}>{value}{suffix ? ` ${suffix}` : ''}</Text>
      <Pressable onPress={() => onChange(Math.min(max, value + 1))} style={chip.stepBtn}>
        <Text style={chip.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

const makeChipStyles = (colors: Palette) => StyleSheet.create({
  qChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.bgElevated },
  qChipActive: { backgroundColor: colors.accent },
  qChipText: { color: colors.textMuted, fontWeight: '600' },
  qChipTextActive: { color: colors.accentOn },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgElevated },
  stepBtnText: { color: colors.text, fontSize: 18, fontWeight: '700' },
  stepperVal: { color: colors.text, fontWeight: '600', minWidth: 56, textAlign: 'center' },
});

const makeStyles = (colors: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: '600' },
  save: { color: colors.accent, fontWeight: '700', fontSize: 16 },
  pickerSection: { backgroundColor: colors.card, borderRadius: 20, marginHorizontal: 12, marginTop: 12, marginBottom: 8, paddingVertical: 14, paddingHorizontal: 6 },
  groupLabels: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 4 },
  groupLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 1, fontWeight: '600', flex: 1, textAlign: 'center' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative' },
  rowHighlight: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 20 + 1.95 * 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.cardHover,
  },
  colon: { color: colors.text, fontSize: 22, fontWeight: '700' },
  dash: { fontSize: 18, color: colors.textDim, marginHorizontal: 8 },
  amPmRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14, gap: 12 },
  amPmGroup: { alignItems: 'center', gap: 4 },
  amPmLabel: { color: colors.textMuted, fontSize: 10, letterSpacing: 1, fontWeight: '600' },
  amPmSegment: { flexDirection: 'row', backgroundColor: colors.bgElevated, borderRadius: 10, padding: 2 },
  amPmBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  amPmBtnActive: { backgroundColor: colors.accent },
  amPmTxt: { color: colors.textMuted, fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },
  amPmTxtActive: { color: colors.accentOn },
  stepInline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16, paddingHorizontal: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  stepLabelCol: { flex: 1 },
  stepSubLabel: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  stepCountCol: { flex: 1, alignItems: 'flex-end' },
  previewCount: { color: colors.accent, fontWeight: '700', fontSize: 24, fontVariant: ['tabular-nums'] },
  previewCountSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  card: { backgroundColor: colors.card, borderRadius: 18, marginHorizontal: 16, marginVertical: 6, padding: 16 },
  fieldLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 10, letterSpacing: 1 },
  input: { color: colors.text, fontSize: 16 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ringName: { color: colors.text, fontSize: 16 },
  snoozeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  snoozeLabel: { color: colors.textMuted, fontSize: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  challengeRow: { flexDirection: 'row', backgroundColor: colors.bgElevated, borderRadius: 12, padding: 3 },
  challengeBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  challengeBtnActive: { backgroundColor: colors.accent },
  challengeTxt: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  challengeTxtActive: { color: colors.accentOn },
  challengeHint: { color: colors.textDim, fontSize: 12, marginTop: 10 },
  cardPaused: { borderWidth: 1, borderColor: colors.warn },
  pauseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pauseHint: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  pauseIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardHover },
  pauseIconActive: { backgroundColor: colors.warn },
  instRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  instRowSkipped: { opacity: 0.4 },
  instTime: { color: colors.text, fontSize: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
  instTimeSkipped: { textDecorationLine: 'line-through' },
  instTag: { color: colors.textDim, fontSize: 12 },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(242,106,126,0.12)',
  },
  dangerTxt: { color: colors.danger, fontWeight: '600' },
});
