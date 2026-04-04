/**
 * Theme Engine — single source of truth for the theme system.
 *
 * Priority (highest → lowest):
 *   1. User personal theme  (localStorage: USER_THEME_KEY)
 *   2. Admin default theme  (localStorage: ADMIN_THEME_KEY)
 *   3. CSS defaults in globals.css
 *
 * Dark / light mode is a separate orthogonal concern (localStorage: 'cabinet-theme').
 * The engine applies the correct CSS vars for the current mode on every call.
 */

import { BASE_COLORS, THEME_COLORS, combineTheme } from '@/data/shadcn-themes';

export const ADMIN_THEME_KEY = 'admin-theme-config';
export const USER_THEME_KEY = 'user-theme-config';

// Dispatched when admin saves a new default so all open tabs re-apply
export const ADMIN_THEME_CHANGED_EVENT = 'adminThemeChanged';

export interface ThemeConfig {
  baseColor: string; // e.g. 'zinc'
  themeColor: string; // e.g. 'blue'
  radius: string; // e.g. '0.625rem'
  overrides: Record<string, string>; // key → hex
}

export const DEFAULT_CONFIG: ThemeConfig = {
  baseColor: 'zinc',
  themeColor: 'blue',
  radius: '0.625rem',
  overrides: {},
};

// ─── Storage helpers ────────────────────────────────────────────────────────

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...(fallback as object), ...JSON.parse(raw) } as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function saveAdminTheme(config: ThemeConfig) {
  save(ADMIN_THEME_KEY, config);
  window.dispatchEvent(new CustomEvent(ADMIN_THEME_CHANGED_EVENT, { detail: config }));
}

export function saveUserTheme(config: ThemeConfig) {
  save(USER_THEME_KEY, config);
}

export function clearUserTheme() {
  localStorage.removeItem(USER_THEME_KEY);
}

export function loadAdminTheme(): ThemeConfig {
  return load<ThemeConfig>(ADMIN_THEME_KEY, DEFAULT_CONFIG);
}

export function loadUserTheme(): ThemeConfig | null {
  try {
    const raw = localStorage.getItem(USER_THEME_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) } as ThemeConfig;
  } catch {
    /* ignore */
  }
  return null;
}

/** Returns the theme that should be active: user override > admin default */
export function getActiveThemeConfig(): ThemeConfig {
  return loadUserTheme() ?? loadAdminTheme();
}

// ─── CSS var building ────────────────────────────────────────────────────────

import { hexToRgb } from '@/utils/colorConversion';

function hexToCss(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${r} ${g} ${b})`;
}

function autoFg(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? 'oklch(0.15 0 0)' : 'oklch(0.98 0 0)';
}

export function buildVars(config: ThemeConfig, isDark: boolean): Record<string, string> {
  const base = BASE_COLORS.find((c) => c.name === config.baseColor) ?? BASE_COLORS[0];
  const theme = THEME_COLORS.find((c) => c.name === config.themeColor) ?? THEME_COLORS[0];
  const combined = combineTheme(base, theme);
  const vars: Record<string, string> = { ...(isDark ? combined.dark : combined.light) };

  for (const [key, hex] of Object.entries(config.overrides)) {
    if (!hex) continue;
    vars[key] = hexToCss(hex);
    if (key === 'primary') {
      vars['primary-foreground'] = autoFg(hex);
      vars['ring'] = hexToCss(hex);
      vars['sidebar-primary'] = hexToCss(hex);
      vars['sidebar-primary-foreground'] = autoFg(hex);
    }
  }

  return vars;
}

// ─── DOM application ─────────────────────────────────────────────────────────

export function applyThemeConfig(config: ThemeConfig) {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  const vars = buildVars(config, isDark);

  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(`--${k}`, v);
  }
  root.style.setProperty('--radius', config.radius);

  // Persist pre-computed vars so the index.html init script can apply them
  // on next page load without importing any modules.
  try {
    localStorage.setItem(
      'theme-vars',
      JSON.stringify({
        dark: buildVars(config, true),
        light: buildVars(config, false),
        radius: config.radius,
      }),
    );
  } catch {
    /* quota */
  }
}

/** Apply whichever theme is currently active (user > admin). */
export function applyActiveTheme() {
  applyThemeConfig(getActiveThemeConfig());
}
