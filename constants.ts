import { TreeConfig } from './types';

export const TREE_CONFIG: TreeConfig = {
  foliageCount: 35000, 
  ornamentCount: 150, // Reduced from 500
  giftCount: 45, // New: Number of gift boxes
  polaroidCount: 24,
  treeHeight: 18,
  treeRadius: 6,
  chaosRadius: 10, // Reduced from 30 to 10 for tighter scatter
};

// If you want to ship static photos, list filenames here from `public/static/photos`.
// Example: ['photo-1.jpg', 'photo-2.png']
// Leave empty to allow user uploads at runtime.
export const STATIC_PHOTO_FILES: string[] = [];

export const COLORS = {
  background: '#050810',
  foliage: '#0f4d22',
  foliageHighlight: '#4ade80',
  ornamentGold: '#ffd700',
  ornamentRed: '#d92626',
  ribbon: '#fcd34d', 
  star: '#fff5b6',
  snow: '#ffffff',
  giftRed: '#ef4444',
  giftGreen: '#22c55e',
  giftBlue: '#3b82f6',
  giftGold: '#eab308'
};

export const EXPLOSION_PALETTE = [
  '#FFD98A', // Warm Gold
  '#FFC1D9', // Soft Pink
  '#CFE9FF', // Sky Blue
  '#CFF5EC', // Mint Cyan
  '#FFFFFF', // Ivory White
];

// Animation durations in seconds
export const DURATIONS = {
  morph: 3.5,
  ribbon: 3.0, 
  star: 0.8, 
  ride: 15.0,
};
