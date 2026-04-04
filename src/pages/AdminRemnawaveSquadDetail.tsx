import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminRemnawaveApi, SquadWithLocalInfo } from '../api/adminRemnawave';
import { AdminBackButton } from '../components/admin';
import { ServerIcon, UsersIcon, CheckIcon, XIcon } from '../components/icons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Country flags helper
const getCountryFlag = (code: string | null | undefined): string => {
  if (!code) return '🌍';
  const codeMap: Record<string, string> = {
    RU: '🇷🇺',
    US: '🇺🇸',
    DE: '🇩🇪',
    NL: '🇳🇱',
    GB: '🇬🇧',
    UK: '🇬🇧',
    FR: '🇫🇷',
    FI: '🇫🇮',
    SE: '🇸🇪',
    NO: '🇳🇴',
    PL: '🇵🇱',
    TR: '🇹🇷',
    JP: '🇯🇵',
    SG: '🇸🇬',
    HK: '🇭🇰',
    KR: '🇰🇷',
    AU: '🇦🇺',
    CA: '🇨🇦',
    CH: '🇨🇭',
    AT: '🇦🇹',
    IT: '🇮🇹',
    ES: '🇪🇸',
    BR: '🇧🇷',
    IN: '🇮🇳',
    AE: '🇦🇪',
    IL: '🇮🇱',
    KZ: '🇰🇿',
    UA: '🇺🇦',
    CZ: '🇨🇿',
    RO: '🇷🇴',
    LV: '🇱🇻',
    LT: '🇱🇹',
    EE: '🇪🇪',
    BG: '🇧🇬',
    HU: '🇭🇺',
    MD: '🇲🇩',
  };
  return codeMap[code.toUpperCase()] || code;
};

export default function AdminRemnawaveSquadDetail() {
  const { t } = useTranslation();
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();

  // Fetch all squads and find the one we need
  const {
    data: squadsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-remnawave-squads'],
    queryFn: adminRemnawaveApi.getSquads,
  });

  const squad: SquadWithLocalInfo | undefined = squadsData?.items?.find(
    (s: SquadWithLocalInfo) => s.uuid === uuid,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (error || !squad) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <AdminBackButton to="/admin/remnawave" />
          <h1 className="text-foreground text-xl font-semibold">
            {t('admin.remnawave.squads.detail', 'Squad Details')}
          </h1>
        </div>
        <div className="border-error-500/30 bg-error-500/10 rounded-xl border p-6 text-center">
          <p className="text-error-400">
            {t('admin.remnawave.squads.loadError', 'Failed to load squad')}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/remnawave')}
            className="text-muted-foreground hover:text-foreground mt-4"
          >
            {t('common.back', 'Back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AdminBackButton to="/admin/remnawave" />
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getCountryFlag(squad.country_code)}</span>
          <div className="bg-primary/20 text-primary rounded-lg p-2">
            <ServerIcon />
          </div>
        </div>
        <div>
          <h1 className="text-foreground text-xl font-semibold">
            {squad.display_name || squad.name}
          </h1>
          <p className="text-muted-foreground text-sm">{squad.name}</p>
        </div>
        {squad.is_synced ? (
          <span className="bg-success-500/20 text-success-400 rounded-full px-3 py-1 text-xs">
            {t('admin.remnawave.squads.synced', 'Synced')}
          </span>
        ) : (
          <span className="bg-warning-500/20 text-warning-400 rounded-full px-3 py-1 text-xs">
            {t('admin.remnawave.squads.notSynced', 'Not synced')}
          </span>
        )}
      </div>

      {/* Main Info */}
      <Card>
        <h3 className="text-foreground mb-4 text-lg font-semibold">
          {t('admin.remnawave.squads.info', 'Information')}
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-sm">UUID</p>
            <p className="text-foreground font-mono text-xs break-all">{squad.uuid}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">
              {t('admin.remnawave.squads.originalName', 'Original Name')}
            </p>
            <p className="text-foreground">{squad.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">
              {t('admin.remnawave.squads.countryCode', 'Country')}
            </p>
            <p className="text-foreground">
              {getCountryFlag(squad.country_code)} {squad.country_code || '—'}
            </p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <Card>
        <h3 className="text-foreground mb-4 text-lg font-semibold">
          {t('admin.remnawave.squads.statsTitle', 'Statistics')}
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-muted-foreground flex items-center gap-2">
              <UsersIcon className="h-4 w-4" />
              <span className="text-sm">{t('admin.remnawave.squads.members', 'Members')}</span>
            </div>
            <p className="text-foreground mt-1 text-2xl font-bold">{squad.members_count}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-muted-foreground flex items-center gap-2">
              <ServerIcon className="h-4 w-4" />
              <span className="text-sm">{t('admin.remnawave.squads.inbounds', 'Inbounds')}</span>
            </div>
            <p className="text-foreground mt-1 text-2xl font-bold">{squad.inbounds_count}</p>
          </div>
          {squad.is_synced && (
            <>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-muted-foreground flex items-center gap-2">
                  <UsersIcon className="h-4 w-4" />
                  <span className="text-sm">{t('admin.remnawave.squads.users', 'Users')}</span>
                </div>
                <p className="text-foreground mt-1 text-2xl font-bold">
                  {squad.current_users ?? 0}
                  <span className="text-muted-foreground text-sm font-normal">
                    {' '}
                    / {squad.max_users ?? '∞'}
                  </span>
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-muted-foreground flex items-center gap-2">
                  <span className="text-sm">{t('admin.remnawave.squads.price', 'Price')}</span>
                </div>
                <p className="text-foreground mt-1 text-2xl font-bold">
                  {((squad.price_kopeks ?? 0) / 100).toFixed(0)} ₽
                </p>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Local Settings (if synced) */}
      {squad.is_synced && (
        <Card>
          <h3 className="text-foreground mb-4 text-lg font-semibold">
            {t('admin.remnawave.squads.localSettings', 'Local Settings')}
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-4">
              <div
                className={`rounded-lg p-2 ${
                  squad.is_available
                    ? 'bg-success-500/20 text-success-400'
                    : 'bg-error-500/20 text-error-400'
                }`}
              >
                {squad.is_available ? <CheckIcon /> : <XIcon />}
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  {t('admin.remnawave.squads.available', 'Available')}
                </p>
                <p className={squad.is_available ? 'text-success-400' : 'text-error-400'}>
                  {squad.is_available ? t('common.yes', 'Yes') : t('common.no', 'No')}
                </p>
              </div>
            </div>
            <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-4">
              <div
                className={`rounded-lg p-2 ${
                  squad.is_trial_eligible
                    ? 'bg-success-500/20 text-success-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {squad.is_trial_eligible ? <CheckIcon /> : <XIcon />}
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  {t('admin.remnawave.squads.trialEligible', 'Trial Eligible')}
                </p>
                <p
                  className={squad.is_trial_eligible ? 'text-success-400' : 'text-muted-foreground'}
                >
                  {squad.is_trial_eligible ? t('common.yes', 'Yes') : t('common.no', 'No')}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Inbounds */}
      {squad.inbounds.length > 0 && (
        <Card>
          <h3 className="text-foreground mb-4 text-lg font-semibold">
            {t('admin.remnawave.squads.inboundsList', 'Inbounds')}
          </h3>
          <div className="space-y-2">
            {squad.inbounds.map((inbound: Record<string, unknown>, idx) => (
              <div
                key={idx}
                className="bg-muted/50 flex items-center justify-between rounded-lg px-4 py-3"
              >
                <span className="text-foreground text-sm">
                  {String(inbound.tag || inbound.uuid || `Inbound ${idx + 1}`)}
                </span>
                {typeof inbound.type === 'string' && (
                  <span className="bg-muted text-muted-foreground rounded px-2 py-1 text-xs">
                    {inbound.type}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Footer */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => navigate('/admin/remnawave')}>
          {t('common.back', 'Back')}
        </Button>
      </div>
    </div>
  );
}
