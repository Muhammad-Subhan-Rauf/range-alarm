/**
 * Predefined background topics. The `query` is sent to Pexels as a search
 * string. The `label` is what the user picks from in Settings. Adding a
 * topic = add one entry here.
 */
export type BackgroundTopic = {
  id: string;
  label: string;
  query: string;
  emoji?: string;
};

export const BACKGROUND_TOPICS: BackgroundTopic[] = [
  { id: 'nature',       label: 'Nature',          query: 'nature landscape',       emoji: '🌿' },
  { id: 'mountains',    label: 'Mountains',       query: 'mountain landscape',     emoji: '🏔️' },
  { id: 'ocean',        label: 'Ocean',           query: 'ocean sea waves',        emoji: '🌊' },
  { id: 'sunrise',      label: 'Sunrise / Sunset', query: 'sunrise sunset sky',    emoji: '🌅' },
  { id: 'forest',       label: 'Forest',          query: 'forest woods trees',     emoji: '🌲' },
  { id: 'space',        label: 'Space',           query: 'space galaxy stars',     emoji: '🌌' },
  { id: 'minimal',      label: 'Minimal',         query: 'minimalist abstract',    emoji: '◻️' },
  { id: 'abstract',     label: 'Abstract',        query: 'abstract pattern',       emoji: '🎨' },
  { id: 'cars',         label: 'Cars',            query: 'sports car automotive',  emoji: '🚗' },
  { id: 'motorbikes',   label: 'Motorbikes',      query: 'motorcycle motorbike',   emoji: '🏍️' },
  { id: 'bikes',        label: 'Bikes',           query: 'bicycle cycling',        emoji: '🚴' },
  { id: 'pcs',          label: 'PC Setups',       query: 'computer desk setup',    emoji: '💻' },
  { id: 'coffee',       label: 'Coffee',          query: 'coffee cafe',            emoji: '☕' },
  { id: 'architecture', label: 'Architecture',    query: 'modern architecture',    emoji: '🏛️' },
  { id: 'animals',      label: 'Animals',         query: 'wildlife animals',       emoji: '🦊' },
  { id: 'sports',       label: 'Sports',          query: 'sports action',          emoji: '🏃' },
  { id: 'city',         label: 'City',            query: 'city skyline night',     emoji: '🌃' },
  { id: 'travel',       label: 'Travel',          query: 'travel destination',     emoji: '✈️' },
];

export const findTopic = (id: string): BackgroundTopic | undefined =>
  BACKGROUND_TOPICS.find(t => t.id === id);
