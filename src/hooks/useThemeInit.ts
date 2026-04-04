/**
 * useThemeInit — called ONCE from the app root (AppWithNavigator).
 *
 * Responsibilities:
 *  • Apply the active theme on mount
 *  • Re-apply when dark/light class toggles (MutationObserver)
 *  • Re-apply when the admin broadcasts a new default theme
 *  • Re-apply when another tab changes the user/admin theme via storage event
 */

import { useEffect } from 'react';
import {
  applyActiveTheme,
  ADMIN_THEME_CHANGED_EVENT,
  ADMIN_THEME_KEY,
  USER_THEME_KEY,
} from '@/lib/theme-engine';

export function useThemeInit() {
  useEffect(() => {
    // Initial application
    applyActiveTheme();

    // Re-apply on dark ↔ light toggle (useTheme.ts adds/removes .dark class)
    const observer = new MutationObserver(() => applyActiveTheme());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Re-apply when admin broadcasts a new default (same tab)
    const onAdminChanged = () => applyActiveTheme();
    window.addEventListener(ADMIN_THEME_CHANGED_EVENT, onAdminChanged);

    // Re-apply when another tab saves a theme
    const onStorage = (e: StorageEvent) => {
      if (e.key === ADMIN_THEME_KEY || e.key === USER_THEME_KEY) {
        applyActiveTheme();
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      observer.disconnect();
      window.removeEventListener(ADMIN_THEME_CHANGED_EVENT, onAdminChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, []); // runs once — applyActiveTheme always reads fresh from localStorage
}
