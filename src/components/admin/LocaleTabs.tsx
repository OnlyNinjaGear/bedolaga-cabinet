import { useTranslation } from 'react-i18next';
import {
  SUPPORTED_LOCALES,
  LOCALE_META,
  type SupportedLocale,
  type LocaleDict,
} from '../../api/landings';
import { cn } from '../../lib/utils';
import { Button } from '@/components/ui/button';

interface LocaleTabsProps {
  activeLocale: SupportedLocale;
  onChange: (locale: SupportedLocale) => void;
  /** Pass locale dicts to show a green dot indicator when content exists */
  contentIndicators?: LocaleDict[];
  className?: string;
}

/**
 * Horizontal locale tab bar for the admin landing editor.
 * Shows a green dot on tabs that have content filled in.
 */
export function LocaleTabs({
  activeLocale,
  onChange,
  contentIndicators,
  className,
}: LocaleTabsProps) {
  const { t } = useTranslation();

  const hasContent = (locale: SupportedLocale): boolean => {
    if (!contentIndicators || contentIndicators.length === 0) return false;
    return contentIndicators.some((dict) => {
      const value = dict[locale];
      return typeof value === 'string' && value.trim().length > 0;
    });
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-1.5">
        {SUPPORTED_LOCALES.map((locale) => {
          const meta = LOCALE_META[locale];
          const isActive = locale === activeLocale;
          const filled = hasContent(locale);
          const isRtl = meta.rtl;

          return (
            <Button
              key={locale}
              type="button"
              onClick={() => onChange(locale)}
              dir={isRtl ? 'rtl' : 'ltr'}
              variant="ghost"
              size="sm"
              className={cn(
                'relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                isActive
                  ? 'bg-primary/15 text-primary ring-ring/30 ring-1'
                  : 'bg-card/50 text-muted-foreground hover:bg-muted/50 hover:text-muted-foreground',
              )}
              aria-label={`${t('admin.landings.localeTab')}: ${meta.name}`}
              aria-pressed={isActive}
            >
              <span>{meta.flag}</span>
              <span>{meta.name}</span>
              {filled && !isActive && (
                <span className="bg-success-500 absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full" />
              )}
            </Button>
          );
        })}
      </div>
      <p className="text-muted-foreground text-xs">{t('admin.landings.localeHint')}</p>
    </div>
  );
}
