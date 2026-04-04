import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { themeColorsApi } from '../../api/themeColors';
import { updateEnabledThemesCache } from '../../hooks/useTheme';
import { MoonIcon, SunIcon } from './icons';
import { Toggle } from './Toggle';
import { ThemeConstructor } from './ThemeConstructor';

export function ThemeTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: enabledThemes } = useQuery({
    queryKey: ['enabled-themes'],
    queryFn: themeColorsApi.getEnabledThemes,
  });

  const updateEnabledThemesMutation = useMutation({
    mutationFn: themeColorsApi.updateEnabledThemes,
    onSuccess: (data) => {
      updateEnabledThemesCache(data);
      queryClient.invalidateQueries({ queryKey: ['enabled-themes'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Theme toggles */}
      <div className="border-border/50 bg-card/50 rounded-2xl border p-6">
        <h3 className="text-foreground mb-4 text-lg font-semibold">
          {t('admin.settings.availableThemes')}
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="bg-muted/30 flex items-center justify-between rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <MoonIcon />
              <span className="text-foreground text-sm font-medium sm:text-base">
                {t('admin.settings.darkTheme')}
              </span>
            </div>
            <Toggle
              checked={enabledThemes?.dark ?? true}
              onChange={() => {
                if ((enabledThemes?.dark ?? true) && !(enabledThemes?.light ?? true)) return;
                updateEnabledThemesMutation.mutate({ dark: !(enabledThemes?.dark ?? true) });
              }}
              disabled={updateEnabledThemesMutation.isPending}
            />
          </div>

          <div className="bg-muted/30 flex items-center justify-between rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <SunIcon />
              <span className="text-foreground text-sm font-medium sm:text-base">
                {t('admin.settings.lightTheme')}
              </span>
            </div>
            <Toggle
              checked={enabledThemes?.light ?? true}
              onChange={() => {
                if ((enabledThemes?.light ?? true) && !(enabledThemes?.dark ?? true)) return;
                updateEnabledThemesMutation.mutate({ light: !(enabledThemes?.light ?? true) });
              }}
              disabled={updateEnabledThemesMutation.isPending}
            />
          </div>
        </div>
      </div>

      {/* Theme Constructor */}
      <div className="border-border/50 bg-card/50 rounded-2xl border p-6">
        <h3 className="text-foreground mb-4 text-lg font-semibold">
          {t('admin.settings.quickPresets')}
        </h3>
        <ThemeConstructor />
      </div>
    </div>
  );
}
