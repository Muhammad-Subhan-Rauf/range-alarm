import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

export type Palette = {
  bg: string;
  bgElevated: string;
  card: string;
  cardHover: string;
  border: string;
  text: string;
  textMuted: string;
  textDim: string;
  accent: string;
  accentDim: string;
  accentOn: string;       // text color to use on top of accent
  warn: string;
  danger: string;
  ring1: string;
  ring2: string;
  shimmer: string;
};

const NEUTRAL_DARK: Palette = {
  bg: '#0E0E10',
  bgElevated: '#16161A',
  card: '#1C1C21',
  cardHover: '#24242B',
  border: '#2A2A33',
  text: '#F1F1F4',
  textMuted: '#A8A8B1',
  textDim: '#6F6F78',
  accent: '#D8C9A8',       // warm sand — pleasant against grey, neutral-warm default
  accentDim: '#6E664F',
  accentOn: '#1A1813',
  warn: '#E8A66F',
  danger: '#E76A7C',
  ring1: '#D8C9A8',
  ring2: '#9C8FFF',
  shimmer: '#33333B',
};

const NEUTRAL_LIGHT: Palette = {
  bg: '#F4F4F6',
  bgElevated: '#FFFFFF',
  card: '#EDEDF0',
  cardHover: '#E0E0E5',
  border: '#D8D8DC',
  text: '#16161A',
  textMuted: '#5B5B66',
  textDim: '#8E8E99',
  accent: '#7A6E4D',
  accentDim: '#C9BE9A',
  accentOn: '#FFFFFF',
  warn: '#C77A36',
  danger: '#C53E54',
  ring1: '#7A6E4D',
  ring2: '#6F62D5',
  shimmer: '#D5D5D9',
};

/** Apply an accent override (e.g. from Material You) on top of a base palette. */
export function withAccent(base: Palette, accent: string | null | undefined, accentOn?: string | null): Palette {
  if (!accent) return base;
  return {
    ...base,
    accent,
    ring1: accent,
    accentOn: accentOn ?? base.accentOn,
  };
}

/**
 * Returns the active palette. Follows the system dark/light setting.
 * The accent can be replaced at runtime via the theme store (e.g. from Material You).
 */
export function useColors(accentOverride?: string | null): Palette {
  const scheme = useColorScheme();
  return useMemo(() => {
    const base = scheme === 'light' ? NEUTRAL_LIGHT : NEUTRAL_DARK;
    return accentOverride ? withAccent(base, accentOverride) : base;
  }, [scheme, accentOverride]);
}

/** Backward-compat: components that haven't migrated yet still import this. Dark palette. */
export const colors = NEUTRAL_DARK;
