import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { themeColorsApi } from '../api/themeColors';
import { ThemeColors, DEFAULT_THEME_COLORS, SHADE_LEVELS, ColorPalette } from '../types/theme';
import { hexToRgb, hexToHsl, hslToRgb } from '../utils/colorConversion';

// Convert RGB to full color string for CSS variable (Tailwind v4 format)
function rgbString(r: number, g: number, b: number): string {
  return `rgb(${r}, ${g}, ${b})`;
}

// Convert hex to HSL string for shadcn CSS variables
function hslString(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  return `hsl(${h} ${s}% ${l}%)`;
}

// Generate color palette from base color (returns full rgb() strings)
function generatePalette(baseHex: string): ColorPalette {
  const { h, s } = hexToHsl(baseHex);

  // Lightness values for each shade level (from light to dark)
  const lightnessMap: Record<number, number> = {
    50: 97,
    100: 94,
    200: 86,
    300: 76,
    400: 64,
    500: 50,
    600: 42,
    700: 34,
    800: 26,
    900: 18,
    950: 10,
  };

  const palette: Partial<ColorPalette> = {};

  for (const shade of SHADE_LEVELS) {
    const lightness = lightnessMap[shade];
    // Adjust saturation slightly for very light/dark shades
    const adjustedS = shade <= 100 ? s * 0.7 : shade >= 900 ? s * 0.8 : s;
    const { r, g, b } = hslToRgb(h, adjustedS, lightness);
    palette[shade] = rgbString(r, g, b);
  }

  return palette as ColorPalette;
}

// Interpolate between two RGB colors
function interpolateRgb(
  rgb1: { r: number; g: number; b: number },
  rgb2: { r: number; g: number; b: number },
  factor: number,
): string {
  return rgbString(
    Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor),
    Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor),
    Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor),
  );
}

// Apply theme colors as CSS variables
export function applyThemeColors(colors: ThemeColors): void {
  const root = document.documentElement;

  // Generate palettes from status colors
  const accentPalette = generatePalette(colors.accent);
  const successPalette = generatePalette(colors.success);
  const warningPalette = generatePalette(colors.warning);
  const errorPalette = generatePalette(colors.error);

  // Convert hex colors to RGB
  const darkBgRgb = hexToRgb(colors.darkBackground);
  const darkSurfaceRgb = hexToRgb(colors.darkSurface);
  const darkTextRgb = hexToRgb(colors.darkText);
  const darkTextSecRgb = hexToRgb(colors.darkTextSecondary);

  // Apply dark palette with actual user colors:
  // Text colors (light shades): 50-100 = primary text, 200-300 = mixed, 400 = secondary text
  root.style.setProperty('--color-dark-50', rgbString(darkTextRgb.r, darkTextRgb.g, darkTextRgb.b));
  root.style.setProperty(
    '--color-dark-100',
    rgbString(darkTextRgb.r, darkTextRgb.g, darkTextRgb.b),
  );
  root.style.setProperty('--color-dark-200', interpolateRgb(darkTextRgb, darkTextSecRgb, 0.33));
  root.style.setProperty('--color-dark-300', interpolateRgb(darkTextRgb, darkTextSecRgb, 0.66));
  root.style.setProperty(
    '--color-dark-400',
    rgbString(darkTextSecRgb.r, darkTextSecRgb.g, darkTextSecRgb.b),
  );

  // Transition colors (500-700): interpolate between secondary text and surface
  root.style.setProperty('--color-dark-500', interpolateRgb(darkTextSecRgb, darkSurfaceRgb, 0.4));
  root.style.setProperty('--color-dark-600', interpolateRgb(darkTextSecRgb, darkSurfaceRgb, 0.6));
  root.style.setProperty('--color-dark-700', interpolateRgb(darkTextSecRgb, darkSurfaceRgb, 0.8));

  // Surface/card colors (800-850): surface color
  root.style.setProperty(
    '--color-dark-800',
    rgbString(darkSurfaceRgb.r, darkSurfaceRgb.g, darkSurfaceRgb.b),
  );
  root.style.setProperty('--color-dark-850', interpolateRgb(darkSurfaceRgb, darkBgRgb, 0.5));

  // Background colors (900-950): background color
  root.style.setProperty('--color-dark-900', interpolateRgb(darkSurfaceRgb, darkBgRgb, 0.7));
  root.style.setProperty('--color-dark-950', rgbString(darkBgRgb.r, darkBgRgb.g, darkBgRgb.b));

  const lightBgRgb = hexToRgb(colors.lightBackground);
  const lightSurfaceRgb = hexToRgb(colors.lightSurface);
  const lightTextRgb = hexToRgb(colors.lightText);
  const lightTextSecRgb = hexToRgb(colors.lightTextSecondary);

  // Apply champagne palette with actual user colors:
  root.style.setProperty(
    '--color-champagne-50',
    rgbString(lightSurfaceRgb.r, lightSurfaceRgb.g, lightSurfaceRgb.b),
  );
  root.style.setProperty('--color-champagne-100', interpolateRgb(lightSurfaceRgb, lightBgRgb, 0.3));
  root.style.setProperty(
    '--color-champagne-200',
    rgbString(lightBgRgb.r, lightBgRgb.g, lightBgRgb.b),
  );
  root.style.setProperty('--color-champagne-300', interpolateRgb(lightBgRgb, lightTextSecRgb, 0.2));
  root.style.setProperty('--color-champagne-400', interpolateRgb(lightBgRgb, lightTextSecRgb, 0.4));
  root.style.setProperty('--color-champagne-500', interpolateRgb(lightBgRgb, lightTextSecRgb, 0.6));
  root.style.setProperty(
    '--color-champagne-600',
    rgbString(lightTextSecRgb.r, lightTextSecRgb.g, lightTextSecRgb.b),
  );
  root.style.setProperty(
    '--color-champagne-700',
    interpolateRgb(lightTextSecRgb, lightTextRgb, 0.33),
  );
  root.style.setProperty(
    '--color-champagne-800',
    interpolateRgb(lightTextSecRgb, lightTextRgb, 0.66),
  );
  root.style.setProperty(
    '--color-champagne-900',
    rgbString(lightTextRgb.r, lightTextRgb.g, lightTextRgb.b),
  );
  root.style.setProperty(
    '--color-champagne-950',
    rgbString(lightTextRgb.r, lightTextRgb.g, lightTextRgb.b),
  );

  // Apply palette shades
  for (const shade of SHADE_LEVELS) {
    root.style.setProperty(`--color-accent-${shade}`, accentPalette[shade]);
    root.style.setProperty(`--color-success-${shade}`, successPalette[shade]);
    root.style.setProperty(`--color-warning-${shade}`, warningPalette[shade]);
    root.style.setProperty(`--color-error-${shade}`, errorPalette[shade]);
  }

  // Apply semantic colors (hex for direct use)
  root.style.setProperty('--color-dark-bg', colors.darkBackground);
  root.style.setProperty('--color-dark-surface', colors.darkSurface);
  root.style.setProperty('--color-dark-text', colors.darkText);
  root.style.setProperty('--color-dark-text-secondary', colors.darkTextSecondary);
  root.style.setProperty('--color-light-bg', colors.lightBackground);
  root.style.setProperty('--color-light-surface', colors.lightSurface);
  root.style.setProperty('--color-light-text', colors.lightText);
  root.style.setProperty('--color-light-text-secondary', colors.lightTextSecondary);

  // shadcn semantic vars (--background, --foreground, --card, etc.) are managed
  // exclusively by ThemeConstructor + the index.html init script.
  // We must NOT overwrite them here — doing so breaks light/dark mode switching.
  //
  // We only re-apply the brand accent as --primary if ThemeConstructor hasn't
  // stored a custom theme-vars entry (i.e. no user customisation yet).
  const hasCustomTheme = !!localStorage.getItem('theme-vars');
  if (!hasCustomTheme) {
    const isDark = root.classList.contains('dark');
    const bg = isDark ? colors.darkBackground : colors.lightBackground;
    const fg = isDark ? colors.darkText : colors.lightText;
    const surface = isDark ? colors.darkSurface : colors.lightSurface;
    const fgSec = isDark ? colors.darkTextSecondary : colors.lightTextSecondary;

    root.style.setProperty('--background', hslString(bg));
    root.style.setProperty('--foreground', hslString(fg));
    root.style.setProperty('--card', hslString(surface));
    root.style.setProperty('--card-foreground', hslString(fg));
    root.style.setProperty('--popover', hslString(surface));
    root.style.setProperty('--popover-foreground', hslString(fg));
    root.style.setProperty('--primary', hslString(colors.accent));
    root.style.setProperty('--primary-foreground', 'hsl(0 0% 100%)');
    root.style.setProperty('--secondary', hslString(surface));
    root.style.setProperty('--secondary-foreground', hslString(fg));
    root.style.setProperty('--muted', hslString(surface));
    root.style.setProperty('--muted-foreground', hslString(fgSec));
    root.style.setProperty('--destructive', hslString(colors.error));
    root.style.setProperty('--border', hslString(surface));
    root.style.setProperty('--input', hslString(surface));
    root.style.setProperty('--ring', hslString(colors.accent));
    root.style.setProperty('--sidebar-background', hslString(bg));
    root.style.setProperty('--sidebar-foreground', hslString(fg));
    root.style.setProperty('--sidebar-primary', hslString(colors.accent));
    root.style.setProperty('--sidebar-primary-foreground', 'hsl(0 0% 100%)');
    root.style.setProperty('--sidebar-accent', hslString(surface));
    root.style.setProperty('--sidebar-accent-foreground', hslString(fg));
    root.style.setProperty('--sidebar-border', hslString(surface));
    root.style.setProperty('--sidebar-ring', hslString(colors.accent));
  }
}

export function useThemeColors() {
  const queryClient = useQueryClient();

  const {
    data: colors,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['theme-colors'],
    queryFn: themeColorsApi.getColors,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Apply colors when loaded or changed
  useEffect(() => {
    const colorsToApply = colors || DEFAULT_THEME_COLORS;
    applyThemeColors(colorsToApply);
  }, [colors]);

  const invalidateColors = () => {
    queryClient.invalidateQueries({ queryKey: ['theme-colors'] });
  };

  return {
    colors: colors || DEFAULT_THEME_COLORS,
    isLoading,
    error,
    invalidateColors,
  };
}
