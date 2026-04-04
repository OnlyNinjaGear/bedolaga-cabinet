import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BASE_COLORS, THEME_COLORS, RADIUS_OPTIONS } from '@/data/shadcn-themes';
import {
  saveUserTheme,
  clearUserTheme,
  loadUserTheme,
  loadAdminTheme,
  applyActiveTheme,
  applyThemeConfig,
  type ThemeConfig,
} from '@/lib/theme-engine';

// Amplified mid-tone colors for base neutral circles
const BASE_PREVIEW_COLORS: Record<string, string> = {
  neutral: 'oklch(0.55 0 0)',
  stone: 'oklch(0.55 0.07 58)',
  zinc: 'oklch(0.55 0.07 286)',
  mauve: 'oklch(0.55 0.12 323)',
  olive: 'oklch(0.55 0.12 107)',
  mist: 'oklch(0.55 0.09 213)',
  taupe: 'oklch(0.55 0.08 43)',
};

export function UserThemePicker() {
  const hasUserTheme = !!loadUserTheme();
  const [sel, setSel] = useState<ThemeConfig>(() => loadUserTheme() ?? loadAdminTheme());
  const [saved, setSaved] = useState(false);
  const [isCustom, setIsCustom] = useState(hasUserTheme);

  // Apply theme preview immediately as user makes changes
  const selRef = useRef(sel);
  selRef.current = sel;

  useEffect(() => {
    if (isCustom) {
      applyThemeConfig(sel);
    }
  }, [sel, isCustom]);

  // Re-apply when dark/light class toggles
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (isCustom) {
        applyThemeConfig(selRef.current);
      } else {
        applyActiveTheme();
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [isCustom]);

  function handleSave() {
    saveUserTheme(sel);
    setIsCustom(true);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    clearUserTheme();
    setIsCustom(false);
    const adminTheme = loadAdminTheme();
    setSel(adminTheme);
    applyActiveTheme();
  }

  return (
    <div className="space-y-5">
      {isCustom && (
        <div className="border-primary/30 bg-primary/10 text-primary flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <span className="flex-1">У вас настроена персональная тема</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground hover:text-foreground h-auto p-0 text-xs underline"
          >
            Сбросить
          </Button>
        </div>
      )}

      {/* Base Color */}
      <div>
        <h4 className="text-muted-foreground mb-3 text-sm font-medium">Base Color</h4>
        <div className="flex flex-wrap gap-3">
          {BASE_COLORS.map((color) => (
            <Button
              key={color.name}
              variant="ghost"
              onClick={() => setSel((s) => ({ ...s, baseColor: color.name }))}
              className={cn(
                'flex h-auto flex-col items-center gap-1.5 rounded-lg p-2',
                sel.baseColor === color.name
                  ? 'bg-accent ring-primary hover:bg-accent ring-2'
                  : 'hover:bg-accent/50',
              )}
            >
              <div
                className={cn(
                  'border-border/50 h-7 w-7 rounded-full border shadow-sm',
                  sel.baseColor === color.name &&
                    'ring-primary ring-offset-background ring-2 ring-offset-2',
                )}
                style={{
                  backgroundColor: BASE_PREVIEW_COLORS[color.name] ?? color.cssVars.dark.background,
                }}
              />
              <span className="text-foreground text-xs">{color.title}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Theme Color */}
      <div>
        <h4 className="text-muted-foreground mb-3 text-sm font-medium">Акцентный цвет</h4>
        <div className="flex flex-wrap gap-3">
          {THEME_COLORS.map((color) => (
            <Button
              key={color.name}
              variant="ghost"
              onClick={() => setSel((s) => ({ ...s, themeColor: color.name }))}
              className={cn(
                'flex h-auto flex-col items-center gap-1.5 rounded-lg p-2',
                sel.themeColor === color.name
                  ? 'bg-accent ring-primary hover:bg-accent ring-2'
                  : 'hover:bg-accent/50',
              )}
            >
              <div
                className={cn(
                  'border-border/50 h-7 w-7 rounded-full border shadow-sm',
                  sel.themeColor === color.name &&
                    'ring-primary ring-offset-background ring-2 ring-offset-2',
                )}
                style={{ backgroundColor: color.cssVars.light.primary }}
              />
              <span className="text-foreground text-xs">{color.title}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Radius */}
      <div>
        <h4 className="text-muted-foreground mb-3 text-sm font-medium">Скругление</h4>
        <div className="flex flex-wrap gap-3">
          {RADIUS_OPTIONS.map((opt) => (
            <Button
              key={opt.name}
              variant="ghost"
              onClick={() => setSel((s) => ({ ...s, radius: opt.value }))}
              className={cn(
                'flex h-auto flex-col items-center gap-1.5 rounded-lg p-2',
                sel.radius === opt.value
                  ? 'bg-accent ring-primary hover:bg-accent ring-2'
                  : 'hover:bg-accent/50',
              )}
            >
              <div
                className="border-primary bg-background h-8 w-12 border-2"
                style={{ borderRadius: opt.value }}
              />
              <span className="text-foreground text-xs">{opt.name}</span>
            </Button>
          ))}
        </div>
      </div>

      <Button
        onClick={handleSave}
        variant={saved ? 'ghost' : 'default'}
        className={cn(
          saved && 'bg-green-500/20 text-green-600 hover:bg-green-500/20 dark:text-green-400',
        )}
      >
        {saved ? '✓ Сохранено' : 'Применить тему'}
      </Button>
    </div>
  );
}
