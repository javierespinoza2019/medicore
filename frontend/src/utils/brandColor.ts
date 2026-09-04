/**
 * White-label: convierte `primaryColorToken` del tenant en escala `--primary-*`
 * (componentes OKLCH L C H, como en `index.css` / Tailwind).
 *
 * Formatos aceptados (máx. ~64 chars en BD):
 * - Hex: `#0EA5E9`, `#0ea5e9`, `#0E9`
 * - Tripleta OKLCH: `0.55 0.195 250`
 * - Función: `oklch(0.55 0.195 250)`
 */

export type OklchComponents = { l: number; c: number; h: number };

export type PrimaryScale = Record<
  '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950',
  string
>;

const STEPS: Array<{ key: keyof PrimaryScale; lDelta: number; cFactor: number }> = [
  { key: '50', lDelta: 0.42, cFactor: 0.06 },
  { key: '100', lDelta: 0.37, cFactor: 0.18 },
  { key: '200', lDelta: 0.30, cFactor: 0.36 },
  { key: '300', lDelta: 0.21, cFactor: 0.59 },
  { key: '400', lDelta: 0.10, cFactor: 0.82 },
  { key: '500', lDelta: 0, cFactor: 1 },
  { key: '600', lDelta: -0.07, cFactor: 0.95 },
  { key: '700', lDelta: -0.15, cFactor: 0.85 },
  { key: '800', lDelta: -0.23, cFactor: 0.69 },
  { key: '900', lDelta: -0.31, cFactor: 0.51 },
  { key: '950', lDelta: -0.39, cFactor: 0.33 },
];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function formatOklch({ l, c, h }: OklchComponents): string {
  return `${round(l, 3)} ${round(c, 3)} ${round(h, 1)}`;
}

function round(n: number, digits: number): number {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

function srgbToLinear(channel: number): number {
  const x = channel / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

/** Hex → OKLCH aproximado (CSS Color 4 / Björn Ottosson). */
export function hexToOklch(hex: string): OklchComponents | null {
  const raw = hex.trim().replace(/^#/, '');
  let r = 0;
  let g = 0;
  let b = 0;
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    r = parseInt(raw[0] + raw[0], 16);
    g = parseInt(raw[1] + raw[1], 16);
    b = parseInt(raw[2] + raw[2], 16);
  } else if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    r = parseInt(raw.slice(0, 2), 16);
    g = parseInt(raw.slice(2, 4), 16);
    b = parseInt(raw.slice(4, 6), 16);
  } else {
    return null;
  }

  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bOk = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const C = Math.sqrt(a * a + bOk * bOk);
  let H = (Math.atan2(bOk, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return { l: clamp(L, 0.05, 0.99), c: clamp(C, 0, 0.4), h: H };
}

export function parseBrandToken(token: string | null | undefined): OklchComponents | null {
  if (!token || !token.trim()) return null;
  const t = token.trim();

  if (t.startsWith('#') || /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(t)) {
    return hexToOklch(t.startsWith('#') ? t : `#${t}`);
  }

  const oklchFn = t.match(
    /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+)?\s*\)$/i,
  );
  if (oklchFn) {
    return {
      l: clamp(Number(oklchFn[1]), 0.05, 0.99),
      c: clamp(Number(oklchFn[2]), 0, 0.4),
      h: ((Number(oklchFn[3]) % 360) + 360) % 360,
    };
  }

  const parts = t.split(/[\s,]+/).filter(Boolean);
  if (parts.length === 3 && parts.every((p) => !Number.isNaN(Number(p)))) {
    return {
      l: clamp(Number(parts[0]), 0.05, 0.99),
      c: clamp(Number(parts[1]), 0, 0.4),
      h: ((Number(parts[2]) % 360) + 360) % 360,
    };
  }

  return null;
}

export function buildPrimaryScale(token: string | null | undefined): PrimaryScale | null {
  const base = parseBrandToken(token);
  if (!base) return null;

  const scale = {} as PrimaryScale;
  for (const step of STEPS) {
    const l = clamp(base.l + step.lDelta, 0.05, 0.99);
    const c = clamp(base.c * step.cFactor, 0, 0.4);
    scale[step.key] = formatOklch({ l, c, h: base.h });
  }
  return scale;
}

export const BRAND_CHANGED_EVENT = 'medicore:brand-changed';

export function notifyBrandChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(BRAND_CHANGED_EVENT));
}

export function applyPrimaryScaleToElement(
  el: HTMLElement,
  scale: PrimaryScale | null,
): void {
  const keys: Array<keyof PrimaryScale> = [
    '50',
    '100',
    '200',
    '300',
    '400',
    '500',
    '600',
    '700',
    '800',
    '900',
    '950',
  ];
  for (const k of keys) {
    if (scale) el.style.setProperty(`--primary-${k}`, scale[k]);
    else el.style.removeProperty(`--primary-${k}`);
  }
}

/** Vista previa hex aproximada desde OKLCH (solo UI; no es conversión exacta). */
export function oklchToCssColor({ l, c, h }: OklchComponents): string {
  return `oklch(${formatOklch({ l, c, h })})`;
}
