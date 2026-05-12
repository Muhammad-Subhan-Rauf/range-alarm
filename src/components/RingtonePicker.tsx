import React, { useMemo } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Check, Music2, Plus } from 'lucide-react-native';
import { useColors, type Palette } from '@/constants/colors';
import type { Ringtone } from '@/types';

type Props = {
  visible: boolean;
  ringtones: Ringtone[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onAdd: () => void;
};

export function RingtonePicker({ visible, ringtones, selectedId, onSelect, onClose, onAdd }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View entering={SlideInDown.springify().damping(18)} exiting={SlideOutDown.duration(150)} style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Ringtone</Text>
          <FlatList
            data={ringtones}
            keyExtractor={(r) => r.id}
            renderItem={({ item }) => (
              <Pressable onPress={() => { onSelect(item.id); onClose(); }} style={styles.row} android_ripple={{ color: colors.cardHover }}>
                <Music2 size={18} color={colors.textMuted} />
                <Text style={styles.name}>{item.name}</Text>
                {item.id === selectedId ? <Check size={20} color={colors.accent} /> : null}
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
          />
          <Pressable onPress={onAdd} style={styles.addBtn} android_ripple={{ color: colors.cardHover }}>
            <Plus size={18} color={colors.accent} />
            <Text style={styles.addTxt}>Upload ringtone</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
    maxHeight: '70%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  name: { color: colors.text, flex: 1, fontSize: 15 },
  sep: { height: 1, backgroundColor: colors.border },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, marginTop: 8 },
  addTxt: { color: colors.accent, fontWeight: '600' },
});
