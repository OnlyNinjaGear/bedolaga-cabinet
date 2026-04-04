import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { serversApi, ServerListItem } from '../api/servers';
import { SyncIcon, EditIcon, CheckIcon, XIcon, UsersIcon, GiftIcon } from '../components/icons';
import { usePlatform } from '../platform/hooks/usePlatform';
import { Button } from '@/components/ui/button';

// BackIcon
const BackIcon = () => (
  <svg
    className="text-muted-foreground h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

// Country flags (simple emoji mapping)
const getCountryFlag = (code: string | null): string => {
  if (!code) return '';
  const codeMap: Record<string, string> = {
    RU: '🇷🇺',
    US: '🇺🇸',
    DE: '🇩🇪',
    NL: '🇳🇱',
    GB: '🇬🇧',
    FR: '🇫🇷',
    FI: '🇫🇮',
    SE: '🇸🇪',
    PL: '🇵🇱',
    CZ: '🇨🇿',
    AT: '🇦🇹',
    CH: '🇨🇭',
    UA: '🇺🇦',
    KZ: '🇰🇿',
    JP: '🇯🇵',
    KR: '🇰🇷',
    SG: '🇸🇬',
    HK: '🇭🇰',
    CA: '🇨🇦',
    AU: '🇦🇺',
    BR: '🇧🇷',
    IN: '🇮🇳',
    TR: '🇹🇷',
    IL: '🇮🇱',
    AE: '🇦🇪',
  };
  return codeMap[code.toUpperCase()] || code;
};

export default function AdminServers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();

  // Queries
  const { data: serversData, isLoading } = useQuery({
    queryKey: ['admin-servers'],
    queryFn: () => serversApi.getServers(true),
  });

  // Mutations
  const toggleMutation = useMutation({
    mutationFn: serversApi.toggleServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-servers'] });
    },
  });

  const toggleTrialMutation = useMutation({
    mutationFn: serversApi.toggleTrial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-servers'] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: serversApi.syncServers,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-servers'] });
      alert(result.message);
    },
  });

  const servers = serversData?.servers || [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Show back button only on web, not in Telegram Mini App */}
          {!capabilities.hasBackButton && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/admin')}
              className="rounded-xl"
            >
              <BackIcon />
            </Button>
          )}
          <div>
            <h1 className="text-foreground text-xl font-semibold">{t('admin.servers.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('admin.servers.subtitle')}</p>
          </div>
        </div>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="flex items-center justify-center gap-2"
        >
          <SyncIcon />
          {syncMutation.isPending ? t('admin.servers.syncing') : t('admin.servers.sync')}
        </Button>
      </div>

      {/* Servers List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      ) : servers.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">{t('admin.servers.noServers')}</p>
          <Button
            variant="ghost"
            onClick={() => syncMutation.mutate()}
            className="text-primary hover:text-primary/70 mt-4"
          >
            {t('admin.servers.syncNow')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map((server: ServerListItem) => (
            <div
              key={server.id}
              className={`bg-card rounded-xl border p-4 transition-colors ${
                server.is_available ? 'border-border' : 'border-border/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-lg">{getCountryFlag(server.country_code)}</span>
                    <h3 className="text-foreground truncate font-medium">{server.display_name}</h3>
                    {server.is_trial_eligible && (
                      <span className="bg-success-500/20 text-success-400 rounded px-2 py-0.5 text-xs">
                        {t('admin.servers.trial')}
                      </span>
                    )}
                    {!server.is_available && (
                      <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs">
                        {t('admin.servers.unavailable')}
                      </span>
                    )}
                    {server.is_full && (
                      <span className="bg-warning-500/20 text-warning-400 rounded px-2 py-0.5 text-xs">
                        {t('admin.servers.full')}
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span className="flex items-center gap-1">
                      <UsersIcon className="h-4 w-4" />
                      {server.current_users}
                      {server.max_users ? ` / ${server.max_users}` : ''}
                    </span>
                    <span>{server.price_rubles} ₽</span>
                    <span className="text-muted-foreground max-w-50 truncate font-mono text-xs">
                      {server.squad_uuid}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Toggle Available */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleMutation.mutate(server.id)}
                    className={`rounded-lg transition-colors ${
                      server.is_available
                        ? 'bg-success-500/20 text-success-400 hover:bg-success-500/30'
                        : 'bg-muted text-muted-foreground hover:bg-muted'
                    }`}
                    title={
                      server.is_available ? t('admin.servers.disable') : t('admin.servers.enable')
                    }
                  >
                    {server.is_available ? <CheckIcon /> : <XIcon />}
                  </Button>

                  {/* Toggle Trial */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleTrialMutation.mutate(server.id)}
                    className={`rounded-lg transition-colors ${
                      server.is_trial_eligible
                        ? 'bg-primary/20 text-primary hover:bg-primary/30'
                        : 'bg-muted text-muted-foreground hover:bg-muted'
                    }`}
                    title={t('admin.servers.toggleTrial')}
                  >
                    <GiftIcon />
                  </Button>

                  {/* Edit */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/admin/servers/${server.id}/edit`)}
                    title={t('admin.servers.edit')}
                  >
                    <EditIcon />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
