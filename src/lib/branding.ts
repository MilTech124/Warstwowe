const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const DEFAULT_BRAND_PRIMARY = "#087f72";
export const DEFAULT_BRAND_ACCENT = "#e9a23b";

/**
 * Branding colours are tenant-controlled and get interpolated into a `<style>`
 * tag, so they must be validated at render time — not only on write. The
 * settings API enforces this regex today, but documents predating that check
 * still exist.
 */
export function safeHexColor(value: string | null | undefined, fallback: string) {
  return HEX_COLOR.test(value ?? "") ? (value as string) : fallback;
}

function channel(component: number) {
  const ratio = component / 255;
  return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string) {
  const value = safeHexColor(hex, DEFAULT_BRAND_PRIMARY).slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Picks readable text for a brand-coloured surface. A tenant may well choose
 * `#ffff00`, and a fixed near-white foreground would be unreadable on it.
 */
export function contrastingForeground(hex: string) {
  return relativeLuminance(hex) > 0.45 ? "#15221f" : "#ffffff";
}

export interface PanelTheme {
  primary: string;
  accent: string;
  primaryForeground: string;
}

export function resolvePanelTheme(branding?: {
  primaryColor?: string | null;
  accentColor?: string | null;
}): PanelTheme {
  const primary = safeHexColor(branding?.primaryColor, DEFAULT_BRAND_PRIMARY);
  return {
    primary,
    accent: safeHexColor(branding?.accentColor, DEFAULT_BRAND_ACCENT),
    primaryForeground: contrastingForeground(primary),
  };
}

/**
 * Emits the tenant theme at document level. Radix and Sonner portal into
 * <body>, so the variables cannot live on the panel root alone.
 */
export function panelThemeCss(theme: PanelTheme) {
  return `:root{--brand-primary:${theme.primary};--brand-accent:${theme.accent};--brand-primary-foreground:${theme.primaryForeground}}`;
}
