import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { backgroundRegistry } from '@/components/ui/backgrounds/registry';
import { BackgroundPreview } from '@/components/backgrounds/BackgroundPreview';
import type {
  AnimationConfig,
  BackgroundType,
  SettingDefinition,
} from '@/components/ui/backgrounds/types';
import { Toggle } from './Toggle';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function SettingField({
  def,
  value,
  onChange,
  t,
}: {
  def: SettingDefinition;
  value: unknown;
  onChange: (val: unknown) => void;
  t: (key: string) => string;
}) {
  if (def.type === 'number') {
    const numVal = (value as number) ?? (def.default as number);
    const displayVal = numVal < 0.01 ? numVal.toExponential(1) : String(numVal);
    return (
      <div className="flex items-center justify-between gap-4">
        <label className="text-muted-foreground text-sm">{t(def.label)}</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={def.min}
            max={def.max}
            step={def.step}
            value={numVal}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="accent-primary w-24"
          />
          <span className="text-muted-foreground w-16 text-right text-xs tabular-nums">
            {displayVal}
          </span>
        </div>
      </div>
    );
  }

  if (def.type === 'color') {
    const colorVal = (value as string) ?? (def.default as string);
    const hexForInput = /^#[0-9a-fA-F]{3,8}$/.test(colorVal) ? colorVal : '#818cf8';
    return (
      <div className="flex items-center justify-between gap-4">
        <label className="text-muted-foreground text-sm">{t(def.label)}</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={hexForInput}
            onChange={(e) => onChange(e.target.value)}
            className="border-border h-7 w-10 cursor-pointer rounded border bg-transparent"
          />
          <span className="text-muted-foreground w-16 text-right text-xs">{colorVal}</span>
        </div>
      </div>
    );
  }

  if (def.type === 'boolean') {
    const boolVal = (value as boolean) ?? (def.default as boolean);
    return (
      <div className="flex items-center justify-between gap-4">
        <label className="text-muted-foreground text-sm">{t(def.label)}</label>
        <Toggle checked={boolVal} onChange={() => onChange(!boolVal)} />
      </div>
    );
  }

  if (def.type === 'select' && def.options) {
    const selectVal = (value as string) ?? (def.default as string);
    return (
      <div className="flex items-center justify-between gap-4">
        <label className="text-muted-foreground text-sm">{t(def.label)}</label>
        <Select value={selectVal} onValueChange={(v) => onChange(v)}>
          <SelectTrigger className="border-border bg-muted text-foreground rounded-lg border px-3 py-1.5 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {def.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label.startsWith('admin.') ? t(opt.label) : opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return null;
}

interface BackgroundConfigEditorProps {
  value: AnimationConfig;
  onChange: (config: AnimationConfig) => void;
}

export function BackgroundConfigEditor({ value: config, onChange }: BackgroundConfigEditorProps) {
  const { t } = useTranslation();

  const updateConfig = (patch: Partial<AnimationConfig>) => {
    onChange({ ...config, ...patch });
  };

  const updateSetting = (key: string, val: unknown) => {
    onChange({ ...config, settings: { ...config.settings, [key]: val } });
  };

  const handleTypeChange = (type: BackgroundType) => {
    const def = backgroundRegistry.find((d) => d.type === type);
    const defaults: Record<string, unknown> = {};
    if (def) {
      for (const s of def.settings) {
        defaults[s.key] = s.default;
      }
    }
    onChange({ ...config, type, settings: defaults });
  };

  const currentDef = useMemo(
    () => backgroundRegistry.find((d) => d.type === config.type),
    [config.type],
  );

  const categories = useMemo(() => {
    const cats = new Map<string, typeof backgroundRegistry>();
    for (const def of backgroundRegistry) {
      const list = cats.get(def.category) ?? [];
      list.push(def);
      cats.set(def.category, list);
    }
    return cats;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header with enable toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-foreground text-lg font-semibold">{t('admin.backgrounds.title')}</h3>
          <p className="text-muted-foreground text-sm">{t('admin.backgrounds.description')}</p>
        </div>
        <Toggle
          checked={config.enabled}
          onChange={() => updateConfig({ enabled: !config.enabled })}
        />
      </div>

      {config.enabled && (
        <>
          {/* Preview */}
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.backgrounds.preview')}
            </label>
            <BackgroundPreview
              type={config.type}
              settings={config.settings}
              opacity={config.opacity}
              blur={config.blur}
              className="h-48"
            />
          </div>

          {/* Type selector gallery */}
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.backgrounds.selectType')}
            </label>

            {/* None option */}
            <Button
              variant="ghost"
              onClick={() => handleTypeChange('none')}
              className={cn(
                'mb-3 h-auto w-full justify-start rounded-xl border p-3 text-left',
                config.type === 'none'
                  ? 'border-primary bg-primary/10 hover:bg-primary/10'
                  : 'border-border/50 bg-card/30 hover:border-border hover:bg-card/30',
              )}
            >
              <span className="text-foreground text-sm font-medium">
                {t('admin.backgrounds.none')}
              </span>
              <span className="text-muted-foreground ml-2 text-xs">
                {t('admin.backgrounds.noneDesc')}
              </span>
            </Button>

            {/* Background types by category */}
            <div className="space-y-4">
              {Array.from(categories.entries()).map(([category, defs]) => (
                <div key={category}>
                  <span className="text-muted-foreground mb-2 block text-xs font-medium tracking-wider uppercase">
                    {t(`admin.backgrounds.category${category.toUpperCase()}`)}
                  </span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {defs.map((def) => (
                      <Button
                        key={def.type}
                        variant="ghost"
                        onClick={() => handleTypeChange(def.type)}
                        className={cn(
                          'h-auto flex-col items-start rounded-xl border p-3 text-left',
                          config.type === def.type
                            ? 'border-primary bg-primary/10 hover:bg-primary/10'
                            : 'border-border/50 bg-card/30 hover:border-border hover:bg-card/30',
                        )}
                      >
                        <span className="text-foreground block text-sm font-medium">
                          {t(def.labelKey)}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {t(def.descriptionKey)}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Per-type settings */}
          {currentDef && currentDef.settings.length > 0 && (
            <div className="border-border/50 bg-card/30 rounded-xl border p-4">
              <h4 className="text-foreground mb-3 text-sm font-medium">
                {t('admin.backgrounds.settings')}
              </h4>
              <div className="space-y-3">
                {currentDef.settings.map((def) => (
                  <SettingField
                    key={def.key}
                    def={def}
                    value={config.settings[def.key]}
                    onChange={(val) => updateSetting(def.key, val)}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Global settings */}
          <div className="border-border/50 bg-card/30 rounded-xl border p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <label className="text-muted-foreground text-sm">
                  {t('admin.backgrounds.globalOpacity')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={config.opacity}
                    onChange={(e) => updateConfig({ opacity: parseFloat(e.target.value) })}
                    className="accent-primary w-24"
                  />
                  <span className="text-muted-foreground w-14 text-right text-xs tabular-nums">
                    {config.opacity}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="text-muted-foreground text-sm">
                  {t('admin.backgrounds.globalBlur')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={1}
                    value={config.blur}
                    onChange={(e) => updateConfig({ blur: Number(e.target.value) })}
                    className="accent-primary w-24"
                  />
                  <span className="text-muted-foreground w-14 text-right text-xs tabular-nums">
                    {config.blur}px
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="text-muted-foreground text-sm">
                    {t('admin.backgrounds.reducedOnMobile')}
                  </label>
                  <p className="text-muted-foreground text-xs">
                    {t('admin.backgrounds.reducedOnMobileDesc')}
                  </p>
                </div>
                <Toggle
                  checked={config.reducedOnMobile}
                  onChange={() => updateConfig({ reducedOnMobile: !config.reducedOnMobile })}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
