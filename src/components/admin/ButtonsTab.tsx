import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  buttonStylesApi,
  ButtonStylesConfig,
  DEFAULT_BUTTON_STYLES,
  BUTTON_SECTIONS,
  ButtonSection,
  BOT_LOCALES,
} from '../../api/buttonStyles';
import { Toggle } from './Toggle';
import { useNotify } from '../../platform/hooks/useNotify';
import { Button } from '@/components/ui/button';

type StyleValue = 'primary' | 'success' | 'danger' | 'default';

const STYLE_OPTIONS: { value: StyleValue; colorClass: string }[] = [
  { value: 'default', colorClass: 'bg-muted' },
  { value: 'primary', colorClass: 'bg-primary' },
  { value: 'success', colorClass: 'bg-success-500' },
  { value: 'danger', colorClass: 'bg-destructive' },
];

function labelsEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  for (const locale of BOT_LOCALES) {
    if ((a[locale] || '') !== (b[locale] || '')) return false;
  }
  return true;
}

function stylesEqual(a: ButtonStylesConfig, b: ButtonStylesConfig): boolean {
  for (const section of BUTTON_SECTIONS) {
    if (a[section].style !== b[section].style) return false;
    if (a[section].icon_custom_emoji_id !== b[section].icon_custom_emoji_id) return false;
    if (a[section].enabled !== b[section].enabled) return false;
    if (!labelsEqual(a[section].labels, b[section].labels)) return false;
  }
  return true;
}

export function ButtonsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const notify = useNotify();

  const { data: serverStyles } = useQuery({
    queryKey: ['button-styles'],
    queryFn: buttonStylesApi.getStyles,
  });

  const [draftStyles, setDraftStyles] = useState<ButtonStylesConfig>(DEFAULT_BUTTON_STYLES);
  const [expandedLabels, setExpandedLabels] = useState<Set<string>>(new Set());
  const savedStylesRef = useRef<ButtonStylesConfig>(DEFAULT_BUTTON_STYLES);
  const draftStylesRef = useRef(draftStyles);
  draftStylesRef.current = draftStyles;

  useEffect(() => {
    if (serverStyles) {
      if (
        stylesEqual(savedStylesRef.current, draftStylesRef.current) ||
        stylesEqual(savedStylesRef.current, DEFAULT_BUTTON_STYLES)
      ) {
        setDraftStyles(serverStyles);
        savedStylesRef.current = serverStyles;
      }
    }
  }, [serverStyles]);

  const hasUnsavedChanges = !stylesEqual(draftStyles, savedStylesRef.current);

  const updateMutation = useMutation({
    mutationFn: buttonStylesApi.updateStyles,
    onSuccess: (data) => {
      savedStylesRef.current = data;
      setDraftStyles(data);
      queryClient.setQueryData(['button-styles'], data);
    },
    onError: () => {
      notify.error(t('common.error'));
    },
  });

  const resetMutation = useMutation({
    mutationFn: buttonStylesApi.resetStyles,
    onSuccess: (data) => {
      savedStylesRef.current = data;
      setDraftStyles(data);
      queryClient.setQueryData(['button-styles'], data);
    },
    onError: () => {
      notify.error(t('common.error'));
    },
  });

  const updateSection = useCallback(
    (section: ButtonSection, field: 'style' | 'icon_custom_emoji_id', value: string) => {
      setDraftStyles((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    },
    [],
  );

  const toggleEnabled = useCallback((section: ButtonSection) => {
    setDraftStyles((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        enabled: !prev[section].enabled,
      },
    }));
  }, []);

  const updateLabel = useCallback((section: ButtonSection, locale: string, value: string) => {
    setDraftStyles((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        labels: {
          ...prev[section].labels,
          [locale]: value,
        },
      },
    }));
  }, []);

  const toggleLabelsExpanded = useCallback((section: string) => {
    setExpandedLabels((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const handleCancel = useCallback(() => {
    setDraftStyles(savedStylesRef.current);
  }, []);

  const handleSave = useCallback(() => {
    const update: Record<string, Record<string, unknown>> = {};
    for (const section of BUTTON_SECTIONS) {
      const draft = draftStyles[section];
      const saved = savedStylesRef.current[section];
      const sectionUpdate: Record<string, unknown> = {};
      let changed = false;

      if (draft.style !== saved.style) {
        sectionUpdate.style = draft.style;
        changed = true;
      }
      if (draft.icon_custom_emoji_id !== saved.icon_custom_emoji_id) {
        sectionUpdate.icon_custom_emoji_id = draft.icon_custom_emoji_id;
        changed = true;
      }
      if (draft.enabled !== saved.enabled) {
        sectionUpdate.enabled = draft.enabled;
        changed = true;
      }
      if (!labelsEqual(draft.labels, saved.labels)) {
        const cleanLabels: Record<string, string> = {};
        for (const locale of BOT_LOCALES) {
          cleanLabels[locale] = (draft.labels[locale] || '').trim();
        }
        sectionUpdate.labels = cleanLabels;
        changed = true;
      }

      if (changed) {
        update[section] = sectionUpdate;
      }
    }
    if (Object.keys(update).length > 0) {
      updateMutation.mutate(update);
    }
  }, [draftStyles, updateMutation]);

  return (
    <div className="space-y-6">
      {/* Section cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {BUTTON_SECTIONS.map((section) => {
          const cfg = draftStyles[section];
          const isExpanded = expandedLabels.has(section);
          const hasCustomLabels = BOT_LOCALES.some((l) => (cfg.labels[l] || '').trim());

          return (
            <div
              key={section}
              className={`bg-card/50 overflow-hidden rounded-2xl border p-4 transition-colors sm:p-5 ${
                cfg.enabled ? 'border-border/50' : 'border-border/30 opacity-60'
              }`}
            >
              {/* Header */}
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-foreground truncate text-sm font-semibold">
                      {t(`admin.buttons.sections.${section}`)}
                    </h4>
                    {!cfg.enabled && (
                      <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium">
                        {t('admin.buttons.hidden')}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {t(`admin.buttons.descriptions.${section}`)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {/* Live preview chip */}
                  <div
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap ${
                      cfg.style === 'default'
                        ? 'bg-muted text-muted-foreground'
                        : cfg.style === 'success'
                          ? 'bg-success-500 text-primary-foreground'
                          : cfg.style === 'danger'
                            ? 'bg-destructive text-primary-foreground'
                            : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {t(`admin.buttons.styles.${cfg.style}`)}
                  </div>
                  {/* Enabled toggle */}
                  <Toggle checked={cfg.enabled} onChange={() => toggleEnabled(section)} />
                </div>
              </div>

              {/* Color selector chips */}
              <div className="mb-3">
                <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                  {t('admin.buttons.color')}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {STYLE_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      onClick={() => updateSection(section, 'style', opt.value)}
                      variant={cfg.style === opt.value ? 'outline' : 'ghost'}
                      size="sm"
                      className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-all ${
                        cfg.style === opt.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/50 text-muted-foreground hover:border-border'
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${opt.colorClass}`} />
                      {t(`admin.buttons.styles.${opt.value}`)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Emoji ID input */}
              <div className="mb-3">
                <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                  {t('admin.buttons.emojiId')}
                </label>
                <input
                  type="text"
                  value={cfg.icon_custom_emoji_id}
                  onChange={(e) => updateSection(section, 'icon_custom_emoji_id', e.target.value)}
                  placeholder={t('admin.buttons.emojiPlaceholder')}
                  className="border-border bg-muted/50 text-foreground placeholder-muted-foreground focus:border-primary w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none"
                />
              </div>

              {/* Custom labels */}
              <div>
                <Button
                  onClick={() => toggleLabelsExpanded(section)}
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground flex h-auto w-full items-center justify-between p-0 text-xs font-medium transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    {t('admin.buttons.customLabels')}
                    {hasCustomLabels && <span className="bg-primary h-1.5 w-1.5 rounded-full" />}
                  </span>
                  <svg
                    className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
                {isExpanded && (
                  <div className="mt-2 space-y-2">
                    {BOT_LOCALES.map((locale) => (
                      <div key={locale} className="flex items-center gap-2">
                        <span className="text-muted-foreground w-7 shrink-0 text-center text-[10px] font-semibold uppercase">
                          {locale}
                        </span>
                        <input
                          type="text"
                          value={cfg.labels[locale] || ''}
                          onChange={(e) => updateLabel(section, locale, e.target.value)}
                          placeholder={t('admin.buttons.labelPlaceholder')}
                          maxLength={100}
                          className="border-border bg-muted/50 text-foreground placeholder-muted-foreground focus:border-primary w-full rounded-lg border px-3 py-1.5 text-sm transition-colors focus:outline-none"
                        />
                      </div>
                    ))}
                    <p className="text-muted-foreground text-[10px]">
                      {t('admin.buttons.labelsHint')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save / Cancel */}
      {hasUnsavedChanges && (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="rounded-xl">
            {updateMutation.isPending ? t('common.saving') : t('common.save')}
          </Button>
          <Button
            onClick={handleCancel}
            disabled={updateMutation.isPending}
            variant="ghost"
            className="rounded-xl"
          >
            {t('common.cancel')}
          </Button>
        </div>
      )}

      {/* Reset */}
      <div className="flex justify-end">
        <Button
          onClick={() => {
            if (window.confirm(t('admin.buttons.resetConfirm'))) {
              resetMutation.mutate();
            }
          }}
          disabled={resetMutation.isPending}
          variant="ghost"
          className="rounded-xl"
        >
          {t('admin.buttons.resetAll')}
        </Button>
      </div>
    </div>
  );
}
