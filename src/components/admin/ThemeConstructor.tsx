import { useState, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { BASE_COLORS, THEME_COLORS, RADIUS_OPTIONS } from '@/data/shadcn-themes';
import {
  saveAdminTheme,
  loadAdminTheme,
  applyThemeConfig,
  buildVars,
  type ThemeConfig,
} from '@/lib/theme-engine';
import { Button } from '@/components/ui/button';

const CUSTOM_PRESETS_KEY = 'theme-constructor-presets';

// Amplified mid-tone preview colors for base neutrals.
const BASE_PREVIEW_COLORS: Record<string, string> = {
  neutral: 'oklch(0.55 0 0)',
  stone: 'oklch(0.55 0.07 58)',
  zinc: 'oklch(0.55 0.07 286)',
  mauve: 'oklch(0.55 0.12 323)',
  olive: 'oklch(0.55 0.12 107)',
  mist: 'oklch(0.55 0.09 213)',
  taupe: 'oklch(0.55 0.08 43)',
};

const PREVIEW_VAR_KEYS = [
  'background',
  'foreground',
  'primary',
  'secondary',
  'muted',
  'accent',
  'border',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
] as const;

interface CustomPreset extends ThemeConfig {
  id: string;
  name: string;
}

// Singleton canvas for oklch→hex conversion
const _canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
if (_canvas) {
  _canvas.width = _canvas.height = 1;
}
const _ctx = _canvas?.getContext('2d') ?? null;

function oklchToHex(oklch: string): string {
  if (!_ctx || !_canvas) return '#888888';
  try {
    _ctx.clearRect(0, 0, 1, 1);
    _ctx.fillStyle = oklch;
    _ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = _ctx.getImageData(0, 0, 1, 1).data;
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  } catch {
    return '#888888';
  }
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function ThemeConstructor() {
  // Load initial state from admin theme config (site default)
  const [sel, setSel] = useState<ThemeConfig>(() => loadAdminTheme());
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() =>
    loadJson<CustomPreset[]>(CUSTOM_PRESETS_KEY, []),
  );
  const [presetFormName, setPresetFormName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const pickerRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const isDark =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const previewVars = useMemo(() => buildVars(sel, isDark), [sel, isDark]);

  // Apply theme to DOM immediately as preview
  useEffect(() => {
    applyThemeConfig(sel);
  }, [sel]);

  // Re-apply when dark/light class toggles
  const selRef = useRef(sel);
  selRef.current = sel;
  useEffect(() => {
    const observer = new MutationObserver(() => {
      applyThemeConfig(selRef.current);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Persist custom presets whenever they change
  useEffect(() => {
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(customPresets));
  }, [customPresets]);

  const hasOverrides = Object.keys(sel.overrides).length > 0;

  function handleSaveAsDefault() {
    saveAdminTheme(sel);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      {customPresets.length > 0 && (
        <div>
          <h4 className="text-muted-foreground mb-3 text-sm font-medium">Мои пресеты</h4>
          <div className="flex flex-wrap gap-2">
            {customPresets.map((preset) => (
              <div
                key={preset.id}
                className="border-border bg-card flex items-center gap-1 rounded-lg border px-2.5 py-1"
              >
                <Button
                  onClick={() =>
                    setSel({
                      baseColor: preset.baseColor,
                      themeColor: preset.themeColor,
                      radius: preset.radius,
                      overrides: preset.overrides,
                    })
                  }
                  variant="ghost"
                  className="text-foreground hover:text-primary h-auto p-0 text-xs font-medium"
                >
                  {preset.name}
                </Button>
                <Button
                  onClick={() => setCustomPresets((p) => p.filter((x) => x.id !== preset.id))}
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive ml-1 h-auto p-0"
                  aria-label="Удалить"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Base Color */}
      <div>
        <h4 className="text-muted-foreground mb-3 text-sm font-medium">Base Color</h4>
        <div className="flex flex-wrap gap-3">
          {BASE_COLORS.map((color) => (
            <Button
              key={color.name}
              onClick={() => setSel((s) => ({ ...s, baseColor: color.name }))}
              variant="ghost"
              className={cn(
                'flex h-auto flex-col items-center gap-1.5 rounded-lg p-2 transition-all',
                sel.baseColor === color.name
                  ? 'bg-accent ring-primary ring-2'
                  : 'hover:bg-accent/50',
              )}
            >
              <div
                className={cn(
                  'border-border/50 h-8 w-8 rounded-full border shadow-sm',
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
        <h4 className="text-muted-foreground mb-3 text-sm font-medium">Theme Color</h4>
        <div className="flex flex-wrap gap-3">
          {THEME_COLORS.map((color) => (
            <Button
              key={color.name}
              onClick={() =>
                setSel((s) => {
                  const { primary: _, ...rest } = s.overrides;
                  return { ...s, themeColor: color.name, overrides: rest };
                })
              }
              variant="ghost"
              className={cn(
                'flex h-auto flex-col items-center gap-1.5 rounded-lg p-2 transition-all',
                sel.themeColor === color.name && !sel.overrides['primary']
                  ? 'bg-accent ring-primary ring-2'
                  : 'hover:bg-accent/50',
              )}
            >
              <div
                className={cn(
                  'border-border/50 h-8 w-8 rounded-full border shadow-sm',
                  sel.themeColor === color.name &&
                    !sel.overrides['primary'] &&
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
        <h4 className="text-muted-foreground mb-3 text-sm font-medium">Radius</h4>
        <div className="flex flex-wrap gap-3">
          {RADIUS_OPTIONS.map((opt) => (
            <Button
              key={opt.name}
              onClick={() => setSel((s) => ({ ...s, radius: opt.value }))}
              variant="ghost"
              className={cn(
                'flex h-auto flex-col items-center gap-1.5 rounded-lg p-2 transition-all',
                sel.radius === opt.value ? 'bg-accent ring-primary ring-2' : 'hover:bg-accent/50',
              )}
            >
              <div
                className="border-primary bg-background h-10 w-14 border-2"
                style={{ borderRadius: opt.value }}
              />
              <span className="text-foreground text-xs">{opt.name}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* 12-var color grid */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-muted-foreground text-sm font-medium">
            Цвета (кликни для изменения)
          </h4>
          {hasOverrides && (
            <Button
              onClick={() => setSel((s) => ({ ...s, overrides: {} }))}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground h-auto p-0 text-xs"
            >
              Сбросить всё
            </Button>
          )}
        </div>
        <div className="grid grid-cols-6 gap-3">
          {PREVIEW_VAR_KEYS.map((key) => {
            const cssValue = previewVars[key] ?? 'oklch(0.5 0 0)';
            const hexValue = sel.overrides[key] ?? oklchToHex(cssValue);
            const isOverridden = !!sel.overrides[key];

            return (
              <div key={key} className="flex flex-col items-center gap-1.5">
                <Button
                  variant="ghost"
                  className={cn(
                    'relative h-14 w-full rounded-xl border p-0 shadow-sm transition-all hover:scale-105 hover:shadow-md',
                    isOverridden ? 'border-primary ring-primary ring-1' : 'border-border/50',
                  )}
                  style={{ backgroundColor: cssValue }}
                  onClick={() => pickerRefs.current[key]?.click()}
                  title={`--${key}: ${cssValue}`}
                >
                  {isOverridden && (
                    <span
                      className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSel((s) => {
                          const { [key]: _, ...rest } = s.overrides;
                          return { ...s, overrides: rest };
                        });
                      }}
                      title="Сбросить"
                    >
                      ×
                    </span>
                  )}
                </Button>
                <input
                  ref={(el) => {
                    pickerRefs.current[key] = el;
                  }}
                  type="color"
                  value={hexValue.startsWith('#') ? hexValue : '#888888'}
                  onChange={(e) =>
                    setSel((s) => ({ ...s, overrides: { ...s.overrides, [key]: e.target.value } }))
                  }
                  className="sr-only"
                  tabIndex={-1}
                />
                <span className="text-muted-foreground max-w-full truncate text-center font-mono text-[10px]">
                  {`--${key}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Live component preview */}
        <div className="border-border bg-card mt-4 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3">
          <button
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90"
            style={{
              backgroundColor: previewVars['primary'],
              color: previewVars['primary-foreground'],
            }}
          >
            Primary
          </button>
          <button
            className="rounded-md border px-3 py-1.5 text-sm font-medium"
            style={{
              backgroundColor: previewVars['secondary'],
              color: previewVars['secondary-foreground'],
              borderColor: previewVars['border'],
            }}
          >
            Secondary
          </button>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: previewVars['accent'],
              color: previewVars['accent-foreground'],
            }}
          >
            Badge
          </span>
          <span className="text-sm" style={{ color: previewVars['muted-foreground'] }}>
            Muted text
          </span>
          <div
            className="h-4 w-16 rounded-full"
            style={{ backgroundColor: previewVars['chart-1'] }}
          />
          <div
            className="h-4 w-10 rounded-full"
            style={{ backgroundColor: previewVars['chart-2'] }}
          />
        </div>
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Save as site default */}
        <Button
          onClick={handleSaveAsDefault}
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium transition-all',
            saved ? 'bg-green-500/20 text-green-600 hover:bg-green-500/20 dark:text-green-400' : '',
          )}
          variant={saved ? 'ghost' : 'default'}
        >
          {saved ? '✓ Применено для всех' : 'Применить как дефолтную'}
        </Button>

        {/* Save as personal preset */}
        {presetFormName !== null ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={presetFormName}
              onChange={(e) => setPresetFormName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && presetFormName.trim()) {
                  setCustomPresets((p) => [
                    ...p,
                    { id: Date.now().toString(), name: presetFormName.trim(), ...sel },
                  ]);
                  setPresetFormName(null);
                }
                if (e.key === 'Escape') setPresetFormName(null);
              }}
              placeholder="Название пресета..."
              className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary flex-1 rounded-md border px-3 py-1.5 text-sm focus:ring-2 focus:outline-none"
              autoFocus
            />
            <Button
              onClick={() => {
                if (!presetFormName.trim()) return;
                setCustomPresets((p) => [
                  ...p,
                  { id: Date.now().toString(), name: presetFormName.trim(), ...sel },
                ]);
                setPresetFormName(null);
              }}
              size="sm"
            >
              Сохранить
            </Button>
            <Button onClick={() => setPresetFormName(null)} variant="ghost" size="sm">
              Отмена
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setPresetFormName('')}
            variant="outline"
            className="rounded-md border-dashed"
          >
            + Сохранить как пресет
          </Button>
        )}
      </div>
    </div>
  );
}
