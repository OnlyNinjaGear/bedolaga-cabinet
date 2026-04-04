import { useTranslation } from 'react-i18next';
import { SettingDefinition } from '../../api/adminSettings';
import { cn } from '../../lib/utils';
import { StarIcon, LockIcon, RefreshIcon } from './icons';
import { SettingInput } from './SettingInput';
import { Toggle } from './Toggle';
import { formatSettingKey, stripHtml } from './utils';
import { Button } from '@/components/ui/button';

interface SettingsTableRowProps {
  setting: SettingDefinition;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onUpdate: (value: string) => void;
  onReset: () => void;
  isUpdating?: boolean;
  isResetting?: boolean;
  isLast?: boolean;
  className?: string;
}

export function SettingsTableRow({
  setting,
  isFavorite,
  onToggleFavorite,
  onUpdate,
  onReset,
  isUpdating,
  isResetting,
  isLast,
  className,
}: SettingsTableRowProps) {
  const { t } = useTranslation();

  const formattedKey = formatSettingKey(setting.name || setting.key);
  const displayName = t(`admin.settings.settingNames.${formattedKey}`, formattedKey);
  const description = setting.hint?.description ? stripHtml(setting.hint.description) : null;
  const isModified = setting.has_override;
  const isBool = setting.type === 'bool';
  const boolChecked = setting.current === true || setting.current === 'true';

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
      key.includes('_packages') ||
      key.includes('_list') ||
      key.includes('_json') ||
      key.includes('_periods') ||
      key.includes('_discounts')
    );
  })();

  return (
    <div
      className={cn(
        'group hover:bg-card/40 px-4 py-3 transition-colors',
        isModified && 'bg-warning-500/2',
        !isLast && 'border-border/30 border-b',
        className,
      )}
    >
      <div
        className={cn(
          isLongValue ? 'space-y-3' : 'flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4',
        )}
      >
        {/* Left side: name, badges, key */}
        <div className={cn('min-w-0', !isLongValue && 'lg:flex-1')}>
          {/* Name + badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-foreground text-[13px] font-medium">{displayName}</span>

            {isModified && (
              <span className="bg-warning-500/20 text-warning-400 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium">
                {t('admin.settings.modified')}
              </span>
            )}

            {setting.has_override && !setting.read_only && (
              <span className="bg-primary/20 text-primary rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium">
                {t('admin.settings.badgeDb')}
              </span>
            )}

            {setting.read_only && (
              <span className="bg-warning-500/15 text-warning-400 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium">
                {t('admin.settings.badgeEnv')}
                <LockIcon className="h-3 w-3" />
              </span>
            )}
          </div>

          {/* Setting key */}
          <div className="mt-0.5">
            <code className="text-muted-foreground font-mono text-[11px]">{setting.key}</code>
          </div>

          {/* Description for long values */}
          {isLongValue && description && (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{description}</p>
          )}
        </div>

        {/* Right side: control + action buttons */}
        <div
          className={cn(
            'flex items-center gap-2',
            isLongValue ? 'w-full' : 'max-lg:self-end lg:shrink-0',
          )}
        >
          {setting.read_only ? (
            <span className="bg-muted/30 text-muted-foreground max-w-60 truncate rounded px-3 py-1.5 font-mono text-xs">
              {isBool
                ? boolChecked
                  ? t('admin.settings.enabled')
                  : t('admin.settings.disabled')
                : String(setting.current ?? '-')}
            </span>
          ) : isBool ? (
            <Toggle
              checked={boolChecked}
              onChange={() => onUpdate(boolChecked ? 'false' : 'true')}
              disabled={isUpdating}
              aria-label={displayName}
            />
          ) : (
            <div className={cn(isLongValue && 'w-full')}>
              <SettingInput setting={setting} onUpdate={onUpdate} disabled={isUpdating} />
            </div>
          )}

          {/* Reset button -- hover-reveal when has_override */}
          {isModified && !setting.read_only && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onReset}
              disabled={isResetting}
              className="text-muted-foreground hover:text-foreground h-auto shrink-0 p-1.5 opacity-0 group-hover:opacity-100 max-lg:opacity-100"
              title={t('admin.settings.reset')}
              aria-label={t('admin.settings.reset')}
            >
              <RefreshIcon />
            </Button>
          )}

          {/* Favorite button -- visible if favorited, hover-reveal otherwise */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFavorite}
            className={cn(
              'h-auto shrink-0 p-1.5',
              isFavorite
                ? 'text-warning-400 hover:bg-warning-500/15 hover:text-warning-400'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-warning-400 opacity-0 group-hover:opacity-100 max-lg:opacity-100',
            )}
            title={
              isFavorite
                ? t('admin.settings.removeFromFavorites')
                : t('admin.settings.addToFavorites')
            }
            aria-label={
              isFavorite
                ? t('admin.settings.removeFromFavorites')
                : t('admin.settings.addToFavorites')
            }
          >
            <StarIcon filled={isFavorite} />
          </Button>
        </div>
      </div>
    </div>
  );
}
