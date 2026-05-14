import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Trash2, Edit3, Moon, Power, X } from 'lucide-react-native';
import { useColors, type Palette } from '@/constants/colors';

type Props = {
  count: number;
  onCancel: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onPauseToday: () => void;
};

export function BatchActionBar({ count, onCancel, onDelete, onEdit, onToggle, onPauseToday }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (count === 0) return null;
  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.bar}>
      <Pressable onPress={onCancel} hitSlop={10} style={styles.iconBtn}>
        <X size={20} color={colors.text} />
      </Pressable>
      <Text style={styles.count}>{count} selected</Text>
      <View style={{ flex: 1 }} />
      <Pressable onPress={onToggle} style={styles.iconBtn} hitSlop={10}>
        <Power size={20} color={colors.text} />
      </Pressable>
      <Pressable onPress={onPauseToday} style={styles.iconBtn} hitSlop={10}>
        <Moon size={20} color={colors.warn} />
      </Pressable>
      <Pressable onPress={onEdit} style={styles.iconBtn} hitSlop={10}>
        <Edit3 size={20} color={colors.text} />
      </Pressable>
      <Pressable onPress={onDelete} style={styles.iconBtn} hitSlop={10}>
        <Trash2 size={20} color={colors.danger} />
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 96,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.bgElevated,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
    elevation: 8,
  },
  iconBtn: { padding: 6 },
  count: { color: colors.text, fontWeight: '600' },
});
