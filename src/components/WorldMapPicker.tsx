import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { DateTime } from 'luxon';
import { Check, Plus } from 'lucide-react-native';
import { useColors, type Palette } from '@/constants/colors';
import { CONTINENT_PATHS, TIMEZONE_CITIES, lngToX, latToY, type TimezoneCity } from '@/constants/worldMap';

type Props = {
  /** IANA timezone strings of already-added clocks. */
  addedTimezones: Set<string>;
  /** Called when user taps the "Add" button on a city. */
  onAdd: (city: TimezoneCity) => void;
  /** Live clock to render offsets — passed in so we share the parent's tick. */
  now: number;
};

const VB_W = 360;
const VB_H = 180;

export function WorldMapPicker({ addedTimezones, onAdd, now }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [selected, setSelected] = useState<TimezoneCity | null>(null);

  const localOffset = DateTime.local().offset; // minutes
  const selectedInfo = useMemo(() => {
    if (!selected) return null;
    const dt = DateTime.fromMillis(now).setZone(selected.timezone);
    const diffMin = dt.offset - localOffset;
    const sign = diffMin === 0 ? '' : diffMin > 0 ? '+' : '−';
    const hours = Math.floor(Math.abs(diffMin) / 60);
    const mins = Math.abs(diffMin) % 60;
    const diffLabel = diffMin === 0 ? 'Same as local' : `${sign}${hours}${mins ? `:${mins.toString().padStart(2, '0')}` : ''}h vs local`;
    return {
      time: dt.toFormat('HH:mm'),
      date: dt.toFormat('EEE, dd LLL'),
      diffLabel,
      added: addedTimezones.has(selected.timezone),
    };
  }, [selected, now, localOffset, addedTimezones]);

  return (
    <View style={styles.wrap}>
      <View style={styles.mapBox}>
        <Svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%">
          {/* Faint UTC offset bands for orientation. */}
          <G opacity={0.06}>
            {Array.from({ length: 24 }).map((_, i) => (
              <Rect
                key={i}
                x={i * 15}
                y={0}
                width={15}
                height={VB_H}
                fill={i % 2 === 0 ? colors.text : 'transparent'}
              />
            ))}
          </G>
          {/* Continents */}
          <G>
            {CONTINENT_PATHS.map((d, i) => (
              <Path key={i} d={d} fill={colors.cardHover} stroke={colors.border} strokeWidth={0.4} />
            ))}
          </G>
          {/* City dots */}
          <G>
            {TIMEZONE_CITIES.map(city => {
              const isAdded = addedTimezones.has(city.timezone);
              const isSelected = selected?.id === city.id;
              const x = lngToX(city.lng);
              const y = latToY(city.lat);
              return (
                <G key={city.id}>
                  {/* Halo for added cities */}
                  {isAdded && (
                    <Circle cx={x} cy={y} r={5.5} fill={colors.accent} opacity={0.2} />
                  )}
                  {/* Selection ring */}
                  {isSelected && (
                    <Circle cx={x} cy={y} r={6.5} fill="none" stroke={colors.accent} strokeWidth={1.4} />
                  )}
                  <Circle
                    cx={x}
                    cy={y}
                    r={3}
                    fill={isAdded ? colors.accent : colors.text}
                    onPress={() => setSelected(city)}
                  />
                </G>
              );
            })}
          </G>
        </Svg>
      </View>

      {selected && selectedInfo ? (
        <View style={styles.detail}>
          <View style={styles.detailLeft}>
            <Text style={styles.detailCity}>{selected.label}</Text>
            <Text style={styles.detailMeta}>{selected.timezone}  ·  {selectedInfo.diffLabel}</Text>
            <Text style={styles.detailTime}>{selectedInfo.time}  <Text style={styles.detailDate}>{selectedInfo.date}</Text></Text>
          </View>
          {selectedInfo.added ? (
            <View style={styles.addedPill}>
              <Check size={16} color={colors.accent} />
              <Text style={styles.addedPillText}>Added</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => { onAdd(selected); }}
              style={styles.addBtn}
              android_ripple={{ color: colors.cardHover }}
            >
              <Plus size={18} color={colors.accentOn} />
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.hint}>
          <Text style={styles.hintText}>Tap a dot to pick a timezone</Text>
          <Text style={styles.hintSub}>Highlighted dots are already added</Text>
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { gap: 12, paddingHorizontal: 4 },
  mapBox: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    overflow: 'hidden',
    aspectRatio: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: { alignItems: 'center', paddingVertical: 12 },
  hintText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  hintSub: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  detailLeft: { flex: 1, gap: 4 },
  detailCity: { color: colors.text, fontSize: 17, fontWeight: '700' },
  detailMeta: { color: colors.textDim, fontSize: 12 },
  detailTime: { color: colors.text, fontSize: 22, fontWeight: '600', fontVariant: ['tabular-nums'], marginTop: 4 },
  detailDate: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  addBtnText: { color: colors.accentOn, fontWeight: '700' },
  addedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardHover,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  addedPillText: { color: colors.accent, fontWeight: '700' },
});
