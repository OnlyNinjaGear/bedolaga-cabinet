import { useTranslation } from 'react-i18next';
import { SettingDefinition } from '../../api/adminSettings';
import { cn } from '../../lib/utils';
import { formatSettingKey } from './utils';
import { Button } from '@/components/ui/button';

interface QuickTogglesProps {
  settings: SettingDefinition[];
  onUpdate: (key: string, value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function QuickToggles({ settings, onUpdate, disabled, className }: QuickTogglesProps) {
  const { t } = useTranslation();

  const booleanSettings = settings.filter((s) => s.type === 'bool' && !s.read_only);

  if (booleanSettings.length === 0) {
    return null;
  }

  return (
    <div className={cn('border-border/40 bg-card/30 rounded-xl border px-3 py-2.5', className)}>
      <span className="text-muted-foreground mb-2 block text-[10px] font-semibold tracking-wider uppercase">
        {t('admin.settings.quickToggles')}
      </span>
      <div className="flex flex-wrap gap-2">
        {booleanSettings.map((setting) => {
          const isOn = setting.current === true || setting.current === 'true';
          const formattedKey = formatSettingKey(setting.name || setting.key);
          const label = t(`admin.settings.settingNames.${formattedKey}`, formattedKey);

          return (
            <Button
              key={setting.key}
              type="button"
              variant="ghost"
              onClick={() => onUpdate(setting.key, isOn ? 'false' : 'true')}
              disabled={disabled}
              className={cn(
                'flex h-auto min-h-11 items-center gap-2 rounded-lg border px-2.5 py-2.5 text-xs font-medium',
                isOn
                  ? 'border-success-500/20 bg-success-500/8 text-foreground hover:bg-success-500/8 hover:text-foreground'
                  : 'border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/20',
              )}
            >
              {/* Mini toggle indicator */}
              <div
                className={cn(
                  'relative h-3.5 w-6 shrink-0 rounded-full transition-colors',
                  isOn ? 'bg-success-500' : 'bg-muted',
                )}
              >
                <div
                  className={cn(
                    'absolute top-0.5 left-0.5 h-2.5 w-2.5 rounded-full bg-white transition-transform duration-200',
                    isOn ? 'translate-x-2.5' : 'translate-x-0',
                  )}
                />
              </div>
              <span className="max-w-30 truncate">{label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
