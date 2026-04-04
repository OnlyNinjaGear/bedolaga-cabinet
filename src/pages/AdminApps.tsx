import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminAppsApi } from '../api/adminApps';
import { usePlatform } from '../platform/hooks/usePlatform';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AdminApps() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();

  // RemnaWave status
  const { data: status } = useQuery({
    queryKey: ['remnawave-status'],
    queryFn: adminAppsApi.getRemnaWaveStatus,
    staleTime: 60000,
  });

  // Available configs
  const { data: configs, isLoading: isLoadingConfigs } = useQuery({
    queryKey: ['remnawave-configs-list'],
    queryFn: adminAppsApi.listRemnaWaveConfigs,
    staleTime: 30000,
  });

  // Set UUID mutation
  const setUuidMutation = useMutation({
    mutationFn: adminAppsApi.setRemnaWaveUuid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remnawave-status'] });
      queryClient.invalidateQueries({ queryKey: ['remnawave-config'] });
      queryClient.invalidateQueries({ queryKey: ['appConfig'] });
    },
  });

  const currentUuid = status?.config_uuid || '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {!capabilities.hasBackButton && (
          <Button variant="outline" size="icon" onClick={() => navigate('/admin')}>
            <svg
              className="text-muted-foreground h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Button>
        )}
        <h1 className="text-foreground text-2xl font-bold sm:text-3xl">{t('admin.apps.title')}</h1>
      </div>

      {/* Status card */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${status?.enabled ? 'bg-success-400' : 'bg-muted'}`}
          />
          <span className="text-foreground text-sm font-medium">
            {status?.enabled
              ? t('admin.apps.remnaWaveConnected', 'RemnaWave connected')
              : t('admin.apps.remnaWaveDisconnected', 'RemnaWave not connected')}
          </span>
        </div>
        {status?.config_uuid && (
          <div className="text-muted-foreground mt-2 truncate font-mono text-xs">
            UUID: {status.config_uuid}
          </div>
        )}
      </Card>

      {/* Available configs */}
      <div className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-semibold">
          {t('admin.apps.availableConfigs', 'Available configs')}
        </h2>
        {isLoadingConfigs ? (
          <div className="flex items-center justify-center py-8">
            <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        ) : configs && configs.length > 0 ? (
          <div className="space-y-2">
            {configs.map((config) => (
              <Button
                key={config.uuid}
                variant="outline"
                onClick={() => {
                  if (config.uuid !== currentUuid) {
                    setUuidMutation.mutate(config.uuid);
                  }
                }}
                className={`w-full p-4 text-left ${
                  currentUuid === config.uuid ? 'border-primary bg-primary/10' : 'bg-card/50'
                }`}
              >
                <div className="text-foreground font-medium">{config.name}</div>
                <div className="text-muted-foreground mt-1 font-mono text-xs">{config.uuid}</div>
              </Button>
            ))}
          </div>
        ) : (
          <Card className="text-muted-foreground py-8 text-center text-sm">
            {t('admin.apps.noConfigs', 'No configs available')}
          </Card>
        )}
      </div>
    </div>
  );
}
