import { useTranslation } from 'react-i18next';
import { SettingDefinition } from '../../api/adminSettings';
import { StarIcon, LockIcon, RefreshIcon } from './icons';
import { SettingInput } from './SettingInput';
import { Toggle } from './Toggle';
import { formatSettingKey, stripHtml } from './utils';
import { Button } from '@/components/ui/button';

interface SettingRowProps {
  setting: SettingDefinition;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onUpdate: (value: string) => void;
  onReset: () => void;
  isUpdating?: boolean;
  isResetting?: boolean;
}

export function SettingRow({
  setting,
  isFavorite,
  onToggleFavorite,
  onUpdate,
  onReset,
  isUpdating,
  isResetting,
}: SettingRowProps) {
  const { t } = useTranslation();

  const formattedKey = formatSettingKey(setting.name || setting.key);
  const displayName = t(`admin.settings.settingNames.${formattedKey}`, formattedKey);
  const description = setting.hint?.description ? stripHtml(setting.hint.description) : null;

  // Check if this is a long/complex value
  const isLongValue = (() => {
    const val = String(setting.current ?? '');
    const key = setting.key.toLowerCase();
    return (
      val.length > 50 ||
      val.includes('\n') ||
      val.startsWith('[') ||
      val.startsWith('{') ||
      key.includes('_items') ||
      key.includes('_config') ||
      key.includes('_keywords') ||
      key.includes('_template') ||
      key.includes('_packages')
    );
  })();

  return (
    <div className="group border-border/40 bg-card/40 hover:border-border/60 hover:bg-card/60 rounded-2xl border p-4 transition-all sm:p-5">
      {/* Header row - name, badges, favorite */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-foreground text-base font-semibold">{displayName}</h3>
            {setting.has_override && (
              <span className="bg-warning-500/20 text-warning-400 rounded-full px-2 py-0.5 text-xs font-medium">
                {t('admin.settings.modified')}
              </span>
            )}
            {setting.read_only && (
              <span className="bg-muted/50 text-muted-foreground flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                <LockIcon />
                {t('admin.settings.readOnly')}
              </span>
            )}
          </div>
          {description && (
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{description}</p>
          )}
        </div>

        {/* Favorite button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFavorite}
          className={`shrink-0 ${
            isFavorite
              ? 'bg-warning-500/15 text-warning-400 hover:bg-warning-500/25'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-warning-400 opacity-0 group-hover:opacity-100'
          }`}
          title={
            isFavorite
              ? t('admin.settings.removeFromFavorites')
              : t('admin.settings.addToFavorites')
          }
        >
          <StarIcon filled={isFavorite} />
        </Button>
      </div>

      {/* Setting key (muted) */}
      <div className="mb-3">
        <code className="bg-background/50 text-muted-foreground rounded px-2 py-1 font-mono text-xs">
          {setting.key}
        </code>
      </div>

      {/* Control section */}
      <div
        className={`${isLongValue ? '' : 'flex items-center justify-between gap-3'} border-border/30 border-t pt-3`}
      >
        {setting.read_only ? (
          // Read-only display
          <div className="bg-muted/30 text-muted-foreground flex items-center gap-2 rounded-lg px-4 py-2.5">
            <span className="font-mono text-sm break-all">{String(setting.current ?? '-')}</span>
          </div>
        ) : setting.type === 'bool' ? (
          // Boolean toggle
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-sm">
              {setting.current === true || setting.current === 'true'
                ? t('admin.settings.enabled')
                : t('admin.settings.disabled')}
            </span>
            <div className="flex items-center gap-2">
              <Toggle
                checked={setting.current === true || setting.current === 'true'}
                onChange={() =>
                  onUpdate(
                    setting.current === true || setting.current === 'true' ? 'false' : 'true',
                  )
                }
                disabled={isUpdating}
              />
              {/* Reset button for boolean */}
              {setting.has_override && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onReset}
                  disabled={isResetting}
                  title={t('admin.settings.reset')}
                >
                  <RefreshIcon />
                </Button>
              )}
            </div>
          </div>
        ) : (
          // Input field
          <div
            className={`${isLongValue ? 'w-full' : 'flex flex-1 items-center justify-end gap-2'}`}
          >
            <SettingInput setting={setting} onUpdate={onUpdate} disabled={isUpdating} />
            {/* Reset button for non-long values */}
            {!isLongValue && setting.has_override && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onReset}
                disabled={isResetting}
                className="shrink-0"
                title={t('admin.settings.reset')}
              >
                <RefreshIcon />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Reset button for long values - shown below */}
      {isLongValue && setting.has_override && !setting.read_only && setting.type !== 'bool' && (
        <div className="mt-3 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={isResetting}
            className="text-muted-foreground hover:text-foreground gap-1.5"
            title={t('admin.settings.reset')}
          >
            <RefreshIcon />
            <span>{t('admin.settings.reset')}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
