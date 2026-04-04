import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingDefinition, adminSettingsApi } from '../../api/adminSettings';
import { StarIcon } from './icons';
import { SettingsTableRow } from './SettingsTableRow';

interface FavoritesTabProps {
  settings: SettingDefinition[];
  isFavorite: (key: string) => boolean;
  toggleFavorite: (key: string) => void;
}

export function FavoritesTab({ settings, isFavorite, toggleFavorite }: FavoritesTabProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      adminSettingsApi.updateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
  });

  const resetSettingMutation = useMutation({
    mutationFn: (key: string) => adminSettingsApi.resetSetting(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
  });

  if (settings.length === 0) {
    return (
      <div className="border-border/30 bg-card/30 rounded-2xl border p-12 text-center">
        <div className="text-muted-foreground mb-4 flex justify-center">
          <StarIcon filled={false} />
        </div>
        <p className="text-muted-foreground">{t('admin.settings.favoritesEmpty')}</p>
        <p className="text-muted-foreground mt-1 text-sm">{t('admin.settings.favoritesHint')}</p>
      </div>
    );
  }

  return (
    <div className="border-border/40 overflow-hidden rounded-xl border">
      {settings.map((setting, idx) => (
        <SettingsTableRow
          key={setting.key}
          setting={setting}
          isFavorite={isFavorite(setting.key)}
          onToggleFavorite={() => toggleFavorite(setting.key)}
          onUpdate={(value) => updateSettingMutation.mutate({ key: setting.key, value })}
          onReset={() => resetSettingMutation.mutate(setting.key)}
          isUpdating={updateSettingMutation.isPending}
          isResetting={resetSettingMutation.isPending}
          isLast={idx === settings.length - 1}
        />
      ))}
    </div>
  );
}
