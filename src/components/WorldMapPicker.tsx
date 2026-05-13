import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { DateTime } from 'luxon';
import { Check, Plus } from 'lucide-react-native';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, Geometry } from 'geojson';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const landTopo = require('world-atlas/land-110m.json') as Topology<{ land: GeometryCollection }>;
import { useColors, type Palette } from '@/constants/colors';
import { TIMEZONE_CITIES, type TimezoneCity } from '@/constants/worldMap';

type Props = {
  /** IANA timezone strings of already-added clocks. */
  addedTimezones: Set<string>;
  onAdd: (city: TimezoneCity) => void;
  /** Live clock tick (ms epoch). */
  now: number;
};

const VB_W = 800;
const VB_H = 400;

// Build the projection + land path once at module load. Both are pure functions
// of the static dataset, so there's no need to recompute per render.
const landCollection = feature(landTopo, landTopo.objects.land) as FeatureCollection<Geometry>;
const projection = geoEquirectangular().fitSize([VB_W, VB_H], landCollection);
const pathGen = geoPath(projection);
const landPath = pathGen(landCollection) ?? '';

function projectPoint(lng: number, lat: number): [number, number] {
  return projection([lng, lat]) ?? [0, 0];
}

export function WorldMapPicker({ addedTimezones, onAdd, now }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [selected, setSelected] = useState<TimezoneCity | null>(null);

  const localOffset = DateTime.local().offset;
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

  // Faint UTC offset bands behind the land for orientation.
  const bandWidth = VB_W / 24;

  return (
    <View style={styles.wrap}>
      <View style={styles.mapBox}>
        <Svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%">
          <G opacity={0.05}>
            {Array.from({ length: 24 }).map((_, i) => (
              <Rect
                key={i}
                x={i * bandWidth}
                y={0}
                width={bandWidth}
                height={VB_H}
                fill={i % 2 === 0 ? colors.text : 'transparent'}
              />
            ))}
          </G>
          <Path d={landPath} fill={colors.cardHover} stroke={colors.border} strokeWidth={0.6} />
          <G>
            {TIMEZONE_CITIES.map(city => {
              const isAdded = addedTimezones.has(city.timezone);
              const isSelected = selected?.id === city.id;
              const [x, y] = projectPoint(city.lng, city.lat);
              return (
                <G key={city.id}>
                  {isAdded && (
                    <Circle cx={x} cy={y} r={10} fill={colors.accent} opacity={0.22} />
                  )}
                  {isSelected && (
                    <Circle cx={x} cy={y} r={11} fill="none" stroke={colors.accent} strokeWidth={2} />
                  )}
                  <Circle
                    cx={x}
                    cy={y}
                    r={5}
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
              onPress={() => onAdd(selected)}
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
