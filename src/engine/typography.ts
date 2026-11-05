import { StyleSpec } from './types';

// Palette constants
export const THEME = {
  ink: '#121417',
  muted: '#62666D',
  line: '#D7DADE',
  accent: '#4C5BD4',
  card: '#FFFFFF',
  code: '#131518',
  paper: '#F8F9FA',
  selectBlue: '#0D99FF',
  guideRed: '#F24822',
};

export const getFontFamily = (style: StyleSpec): string => {
  return style.font === 'mono'
    ? '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace'
    : 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif';
};

export const getLineHeightPx = (style: StyleSpec, size = style.size): number => {
  return Math.round(size * style.lh);
};

// Canvas context for text measurement
let measureCtx: CanvasRenderingContext2D | null = null;
const textMeasureCache = new Map<string, { w: number; h: number; lines: number[] }>();

const getMeasureContext = () => {
  if (!measureCtx && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    measureCtx = canvas.getContext('2d');
  }
  return measureCtx;
};

export function measureText(
  text: string,
  style: StyleSpec,
  size: number,
  maxWidth?: number
): { w: number; h: number; lines: number[] } {
  const cacheKey = `${text}|${style.font}|${style.weight}|${size}|${style.ls ?? 0}|${maxWidth ?? -1}`;
  const cached = textMeasureCache.get(cacheKey);
  if (cached) return cached;

  const ctx = getMeasureContext();
  if (!ctx) {
    const approxW = maxWidth ?? text.length * size * 0.6;
    return { w: approxW, h: size * style.lh, lines: [approxW] };
  }

  ctx.font = `${style.weight} ${size}px ${getFontFamily(style)}`;
  if ('letterSpacing' in ctx) {
    (ctx as any).letterSpacing = `${(style.ls ?? 0) * size}px`;
  }

  const lineBreaks = text.split('\n');
  const lineMetrics: number[] = [];

  for (const para of lineBreaks) {
    if (maxWidth == null || style.pre) {
      lineMetrics.push(ctx.measureText(para).width);
      continue;
    }

    const words = para.split(' ');
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (currentLine && ctx.measureText(testLine).width > maxWidth) {
        lineMetrics.push(ctx.measureText(currentLine).width);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    lineMetrics.push(ctx.measureText(currentLine).width);
  }

  const finalWidth = maxWidth ?? Math.max(0, ...lineMetrics);
  const result = {
    w: Math.ceil(finalWidth),
    h: Math.max(1, lineMetrics.length) * getLineHeightPx(style, size),
    lines: lineMetrics,
  };

  textMeasureCache.set(cacheKey, result);
  return result;
}

export const createSansStyle = (
  size: number,
  weight: number,
  lh: number,
  color = THEME.ink,
  ls = 0
): StyleSpec => ({
  font: 'sans',
  size,
  weight,
  lh,
  color,
  ls,
});

export const createMonoStyle = (
  size: number,
  color = THEME.muted,
  weight = 400,
  extra: Partial<StyleSpec> = {}
): StyleSpec => ({
  font: 'mono',
  size,
  weight,
  lh: 1.45,
  color,
  ...extra,
});

export const TYPOGRAPHY = {
  h1: createSansStyle(64, 600, 1.02, THEME.ink, -0.035),
  h2: createSansStyle(40, 600, 1.08, THEME.ink, -0.03),
  h3: createSansStyle(21, 600, 1.25, THEME.ink, -0.012),
  lead: createSansStyle(19, 400, 1.5, THEME.muted, -0.005),
  body: createSansStyle(15.5, 400, 1.55, THEME.muted),
  item: createSansStyle(14.5, 450, 1.4, THEME.ink),
  nav: createSansStyle(14, 500, 1.4, THEME.ink),
  btn: createSansStyle(14.5, 600, 1.4, '#FFFFFF'),
  btnDark: createSansStyle(14.5, 600, 1.4, THEME.ink),
  logo: createSansStyle(19, 650, 1.3, '#43474E', -0.025),
  brand: createSansStyle(18, 650, 1.3, THEME.ink, -0.02),
  stat: createSansStyle(52, 600, 1, THEME.ink, -0.04),
  price: createSansStyle(44, 600, 1.05, THEME.ink, -0.035),
  code: createMonoStyle(13.5, '#E0E2E5', 400, { lh: 1.7, code: true, pre: true }),
  codeDim: createMonoStyle(12, '#81868D'),
  nodeName: createMonoStyle(13, THEME.ink, 500),
  nodeWhite: createMonoStyle(14, '#FFFFFF', 500),
  small: createMonoStyle(12, THEME.muted),
};
