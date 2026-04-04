import { useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { themeColorsApi } from '../api/themeColors';
import { DEFAULT_THEME_COLORS } from '../types/theme';
import { usePlatform } from '@/platform';
import { useTheme } from '../hooks/useTheme';

interface ThemeColorsProviderProps {
  children: React.ReactNode;
}

/**
 * ThemeColorsProvider — fetches brand colors from API and syncs
 * Telegram header/bottom bar only.
 *
 * CSS theme vars (--background, --primary, etc.) are now managed exclusively
 * by theme-engine.ts + useThemeInit hook. This provider no longer writes to them.
 */
export function ThemeColorsProvider({ children }: ThemeColorsProviderProps) {
  const { data: colors } = useQuery({
    queryKey: ['theme-colors'],
    queryFn: themeColorsApi.getColors,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { theme: platformTheme, capabilities } = usePlatform();
  const { isDark } = useTheme();

  // Sync Telegram header and bottom bar colors with theme
  const syncTelegramColors = useCallback(() => {
    if (!capabilities.hasThemeSync) return;

    const themeColors = colors || DEFAULT_THEME_COLORS;
    const headerColor = isDark ? themeColors.darkSurface : themeColors.lightSurface;

    platformTheme.setHeaderColor(headerColor);
    platformTheme.setBottomBarColor(headerColor);
  }, [capabilities.hasThemeSync, colors, isDark, platformTheme]);

  useEffect(() => {
    syncTelegramColors();
  }, [syncTelegramColors]);

  return <>{children}</>;
}
