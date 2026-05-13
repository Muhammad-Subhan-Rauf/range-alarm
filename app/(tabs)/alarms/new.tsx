import React, { useMemo, useState } from 'react';

import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Music2 } from 'lucide-react-native';
import { WheelTimePicker } from '@/components/WheelTimePicker';
import { WeekdaySelector } from '@/components/WeekdaySelector';
import { RingtonePicker } from '@/components/RingtonePicker';
import { useAlarmStore } from '@/stores/useAlarmStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useColors, type Palette } from '@/constants/colors';
import { expandGroup, formatTime, to12h, to24h } from '@/services/timeUtils';
import { useTimeFormat } from '@/hooks/useTimeFormat';
import type { AlarmGroup } from '@/types';
import { DAY_MASK } from '@/types';

export default function NewAlarmScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const saveGroup = useAlarmStore(s => s.saveGroup);
  const ringtones = useAlarmStore(s => s.ringtones);
  const importRingtone = useAlarmStore(s => s.importRingtone);
  const settings = useSettingsStore();
  const { is24 } = useTimeFormat();

  const [label, setLabel] = useState('');
  const [isRange, setIsRange] = useState(false);
  const [startH, setStartH] = useState(8);
  const [startM, setStartM] = useState(30);
  const [endH, setEndH] = useState(10);
  const [endM, setEndM] = useState(30);
  const [step, setStep] = useState(5);
  const [repeatDays, setRepeatDays] = useState<number>(0);
  const [ringtoneId, setRingtoneId] = useState<string>(settings.defaultRingtoneId);
  const [snoozeMin, setSnoozeMin] = useState<number>(Math.round(settings.defaultSnoozeMs / 60_000));
  const [snoozeMax, setSnoozeMax] = useState<number>(settings.defaultSnoozeMaxRepeats);
  const [vibrate, setVibrate] = useState<boolean>(settings.defaultVibrate);
  const [ringtoneOpen, setRingtoneOpen] = useState(false);

  const previewGroup: AlarmGroup = useMemo(() => ({
    id: 'preview',
    label,
    start: { hour: startH, minute: startM },
    end: { hour: isRange ? endH : startH, minute: isRange ? endM : startM },
    stepMinutes: isRange ? step : 0,
    repeatDays,
    ringtoneId,
    snoozeMs: snoozeMin * 60_000,
    snoozeMaxRepeats: snoozeMax,
    vibrate,
    enabled: true,
    backgroundTopics: [],
    backgroundCustomImages: [],
    createdAt: 0,
    updatedAt: 0,
  }), [label, startH, startM, endH, endM, isRange, step, repeatDays, ringtoneId, snoozeMin, snoozeMax, vibrate]);

  const count = useMemo(() => expandGroup(previewGroup).length, [previewGroup]);

  const onSave = async () => {
    const now = Date.now();
    const id = `grp_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const group: AlarmGroup = { ...previewGroup, id, createdAt: now, updatedAt: now };
    await saveGroup(group);
    router.back();
  };

  const onPickRingtone = (id: string) => setRingtoneId(id);
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
        <Text style={styles.title}>{isRange ? 'New range' : 'New alarm'}</Text>
        <Pressable onPress={onSave} hitSlop={10}>
          <Text style={styles.save}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={styles.modeRow}>
          <ModeTab label="Single" active={!isRange} onPress={() => setIsRange(false)} />
          <ModeTab label="Range" active={isRange} onPress={() => setIsRange(true)} />
        </View>

        <View style={styles.pickerSection}>
          {isRange && (
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
            <WheelTimePicker value={startM} onChange={setStartM} min={0} max={59} step={1} label="M" hideHighlight />
            {isRange && (
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
                <WheelTimePicker value={endM} onChange={setEndM} min={0} max={59} step={1} label="M" hideHighlight />
              </>
            )}
          </View>
          {!is24 && (
            <View style={styles.amPmRow}>
              <AmPmToggle
                isPm={startH >= 12}
                label={isRange ? 'START' : ''}
                onChange={(pm) => setStartH(to24h(to12h(startH).hour12, pm))}
              />
              {isRange && (
                <AmPmToggle
                  isPm={endH >= 12}
                  label="END"
                  onChange={(pm) => setEndH(to24h(to12h(endH).hour12, pm))}
                />
              )}
            </View>
          )}
        </View>

        {isRange && (
          <View style={styles.stepCard}>
            <View style={styles.stepRowWheel}>
              <View style={styles.stepLabelCol}>
                <Text style={styles.fieldLabel}>STEP</Text>
                <Text style={styles.stepSubLabel}>minutes</Text>
              </View>
              <WheelTimePicker value={step} onChange={setStep} min={1} max={120} />
              <View style={styles.stepCount}>
                <Text style={styles.previewCount}>{count}</Text>
                <Text style={styles.previewCountSub}>alarms</Text>
              </View>
            </View>
          </View>
        )}

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

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Snooze</Text>
          <View style={styles.snoozeRow}>
            <Text style={styles.snoozeLabel}>Every</Text>
            <NumberStepper value={snoozeMin} min={1} max={30} onChange={setSnoozeMin} suffix="min" />
            <Text style={styles.snoozeLabel}>·  Max</Text>
            <NumberStepper value={snoozeMax} min={0} max={10} onChange={setSnoozeMax} suffix={snoozeMax === 0 ? '∞' : ''} />
          </View>
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

        <View style={styles.summary}>
          <Text style={styles.summaryHint}>Preview</Text>
          <Text style={styles.summaryTime}>
            {isRange
              ? `${formatTime(previewGroup.start, is24)} – ${formatTime(previewGroup.end, is24)}`
              : formatTime(previewGroup.start, is24)}
          </Text>
          {isRange && <Text style={styles.summarySub}>{count} alarms, every {step}m</Text>}
        </View>
      </ScrollView>

      <RingtonePicker
        visible={ringtoneOpen}
        ringtones={ringtones}
        selectedId={ringtoneId}
        onSelect={onPickRingtone}
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
        <Pressable
          onPress={() => onChange(false)}
          style={[styles.amPmBtn, !isPm && styles.amPmBtnActive]}
        >
          <Text style={[styles.amPmTxt, !isPm && styles.amPmTxtActive]}>AM</Text>
        </Pressable>
        <Pressable
          onPress={() => onChange(true)}
          style={[styles.amPmBtn, isPm && styles.amPmBtnActive]}
        >
          <Text style={[styles.amPmTxt, isPm && styles.amPmTxtActive]}>PM</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ModeTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable onPress={onPress} style={[styles.modeTab, active && styles.modeTabActive]}>
      <Text style={[styles.modeTabText, active && styles.modeTabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function QuickChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable onPress={onPress} style={[styles.qChip, active && styles.qChipActive]}>
      <Text style={[styles.qChipText, active && styles.qChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function NumberStepper({ value, min, max, onChange, suffix }: { value: number; min: number; max: number; onChange: (n: number) => void; suffix?: string; }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.stepperRow}>
      <Pressable onPress={() => onChange(Math.max(min, value - 1))} style={styles.stepBtn}>
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <Text style={styles.stepperVal}>
        {value}{suffix ? ` ${suffix}` : ''}
      </Text>
      <Pressable onPress={() => onChange(Math.min(max, value + 1))} style={styles.stepBtn}>
        <Text style={styles.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '600' },
  save: { color: colors.accent, fontWeight: '700', fontSize: 16 },
  modeRow: { flexDirection: 'row', marginHorizontal: 20, marginVertical: 8, gap: 8 },
  modeTab: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: colors.card },
  modeTabActive: { backgroundColor: colors.accent },
  modeTabText: { color: colors.textMuted, fontWeight: '600' },
  modeTabTextActive: { color: colors.bg },
  pickerSection: { backgroundColor: colors.card, borderRadius: 20, marginHorizontal: 12, marginVertical: 8, paddingVertical: 14, paddingHorizontal: 6 },
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
  stepCard: { backgroundColor: colors.card, borderRadius: 18, marginHorizontal: 16, marginVertical: 6, paddingVertical: 12, paddingHorizontal: 16 },
  stepRowWheel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  stepLabelCol: { flex: 1 },
  stepSubLabel: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  stepCount: { flex: 1, alignItems: 'flex-end' },
  previewCount: { color: colors.accent, fontWeight: '700', fontSize: 24, fontVariant: ['tabular-nums'] },
  previewCountSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  card: { backgroundColor: colors.card, borderRadius: 18, marginHorizontal: 16, marginVertical: 6, padding: 16 },
  fieldLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 10, letterSpacing: 1 },
  input: { color: colors.text, fontSize: 16, paddingVertical: 4 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  qChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.bgElevated },
  qChipActive: { backgroundColor: colors.accent },
  qChipText: { color: colors.textMuted, fontWeight: '600' },
  qChipTextActive: { color: colors.bg },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ringName: { color: colors.text, fontSize: 16 },
  snoozeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  snoozeLabel: { color: colors.textMuted, fontSize: 14 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgElevated },
  stepBtnText: { color: colors.text, fontSize: 18, fontWeight: '700' },
  stepperVal: { color: colors.text, fontWeight: '600', minWidth: 56, textAlign: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summary: { marginHorizontal: 16, marginTop: 10, alignItems: 'center' },
  summaryHint: { color: colors.textDim, fontSize: 11, letterSpacing: 1 },
  summaryTime: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: 4 },
  summarySub: { color: colors.textMuted, marginTop: 4 },
});
