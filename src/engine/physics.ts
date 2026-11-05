import { CursorShape } from './types';

export const CURSOR_HOTSPOTS: Record<CursorShape, [number, number]> = {
  arrow: [5, 3.5],
  dup: [5, 3.5],
  pen: [3, 3],
  'pen-add': [3, 3],
  'pen-close': [3, 3],
  cross: [12, 12],
  ibeam: [12, 12],
  ew: [12, 12],
  ns: [12, 12],
};

export const AGENT_NAMES = [
  'Ada',
  'Linus',
  'Grace',
  'Alan',
  'Margaret',
  'Ken',
  'Barbara',
  'Dennis',
  'Radia',
  'Guido',
  'Frances',
  'Bjarne',
  'Hedy',
  'Tim',
  'Katherine',
  'Edsger',
  'Joan',
  'Donald',
  'Sophie',
  'Niklaus',
  'Anita',
  'Brian',
  'Mary',
  'Rob',
  'Ida',
  'Yukihiro',
  'Shafi',
  'Leslie',
  'Jean',
  'Vint',
  'Lynn',
  'Bram',
];

export const FIGMA_COLORS = [
  '#F24E1E',
  '#A259FF',
  '#1ABCFE',
  '#0ACF83',
  '#FF7262',
  '#FFC700',
  '#9747FF',
  '#E8467C',
  '#14AE5C',
  '#0D99FF',
  '#FF8A00',
  '#00B5CE',
];

export const randomRange = (min: number, max: number): number => {
  return min + Math.random() * (max - min);
};

export const clamp = (val: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, val));
};

export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};
