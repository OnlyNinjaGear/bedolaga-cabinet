import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { serversApi, ServerUpdateRequest } from '../api/servers';
import { AdminBackButton } from '../components/admin';
import { ServerIcon } from '../components/icons';
import { createNumberInputHandler, toNumber } from '../utils/inputHelpers';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

export default function AdminServerEdit() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const serverId = parseInt(id || '0');

  const {
    data: server,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-server', serverId],
    queryFn: () => serversApi.getServer(serverId),
    enabled: serverId > 0,
  });

  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [priceKopeks, setPriceKopeks] = useState<number | ''>(0);
  const [maxUsers, setMaxUsers] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<number | ''>(0);

  useEffect(() => {
    if (server) {
      setDisplayName(server.display_name);
      setDescription(server.description || '');
      setCountryCode(server.country_code || '');
      setPriceKopeks(server.price_kopeks);
      setMaxUsers(server.max_users);
      setSortOrder(server.sort_order);
    }
  }, [server]);

  const updateMutation = useMutation({
    mutationFn: (data: ServerUpdateRequest) => serversApi.updateServer(serverId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-servers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-server', serverId] });
      navigate('/admin/servers');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: ServerUpdateRequest = {
      display_name: displayName,
      description: description || undefined,
      country_code: countryCode || undefined,
      price_kopeks: toNumber(priceKopeks),
      max_users: maxUsers || undefined,
      sort_order: toNumber(sortOrder),
    };
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (error || !server) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <AdminBackButton to="/admin/servers" />
          <h1 className="text-foreground text-xl font-semibold">{t('admin.servers.edit')}</h1>
        </div>
        <div className="border-error-500/30 bg-error-500/10 rounded-xl border p-6 text-center">
          <p className="text-error-400">{t('admin.servers.loadError')}</p>
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/servers')}
            className="mt-4 text-sm"
          >
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to="/admin/servers" />
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getCountryFlag(server.country_code)}</span>
          <div className="bg-primary/20 text-primary rounded-lg p-2">
            <ServerIcon />
          </div>
        </div>
        <div>
          <h1 className="text-foreground text-xl font-semibold">{t('admin.servers.edit')}</h1>
          <p className="text-muted-foreground text-sm">{server.display_name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Settings */}
        <Card>
          <h3 className="text-foreground mb-4 text-lg font-semibold">
            {t('admin.servers.mainSettings')}
          </h3>

          {/* Original Name (readonly) */}
          <div className="mb-4">
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.servers.originalName')}
            </label>
            <div className="border-border bg-muted/50 text-muted-foreground rounded-lg border px-3 py-2">
              {server.original_name || server.squad_uuid}
            </div>
          </div>

          {/* Display Name */}
          <div className="mb-4">
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.servers.displayName')}
              <span className="text-error-400">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={`input ${displayName.length > 0 && !displayName.trim() ? 'border-error-500/50' : ''}`}
              placeholder={t('admin.servers.displayNamePlaceholder')}
              maxLength={255}
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.servers.description')}
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={2}
              placeholder={t('admin.servers.descriptionPlaceholder')}
            />
          </div>

          {/* Country Code */}
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.servers.countryCode')}
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase().slice(0, 2))}
                className="w-32"
                placeholder="RU"
                maxLength={2}
              />
              {countryCode && <span className="text-xl">{getCountryFlag(countryCode)}</span>}
            </div>
          </div>
        </Card>

        {/* Pricing & Limits */}
        <Card>
          <h3 className="text-foreground mb-4 text-lg font-semibold">
            {t('admin.servers.pricingAndLimits')}
          </h3>

          {/* Price */}
          <div className="mb-4">
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.servers.price')}
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={priceKopeks === '' ? '' : priceKopeks / 100}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setPriceKopeks('');
                  } else {
                    setPriceKopeks(Math.max(0, parseFloat(val) || 0) * 100);
                  }
                }}
                className="w-32"
                min={0}
                step={1}
              />
              <span className="text-muted-foreground">₽</span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">{t('admin.servers.priceHint')}</p>
          </div>

          {/* Max Users */}
          <div className="mb-4">
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.servers.maxUsers')}
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={maxUsers || ''}
                onChange={(e) =>
                  setMaxUsers(e.target.value ? Math.max(0, parseInt(e.target.value)) : null)
                }
                className="w-32"
                min={0}
                placeholder={t('admin.servers.unlimited')}
              />
              {!maxUsers && (
                <span className="text-muted-foreground text-sm">
                  {t('admin.servers.unlimited')}
                </span>
              )}
            </div>
          </div>

          {/* Sort Order */}
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.servers.sortOrder')}
            </label>
            <Input
              type="number"
              value={sortOrder}
              onChange={createNumberInputHandler(setSortOrder)}
              className="w-32"
            />
          </div>
        </Card>

        {/* Statistics */}
        <Card>
          <h3 className="text-foreground mb-4 text-lg font-semibold">{t('admin.servers.stats')}</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-foreground text-2xl font-bold">{server.current_users}</div>
              <div className="text-muted-foreground text-sm">{t('admin.servers.currentUsers')}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-foreground text-2xl font-bold">
                {server.active_subscriptions}
              </div>
              <div className="text-muted-foreground text-sm">
                {t('admin.servers.activeSubscriptions')}
              </div>
            </div>
          </div>
          {server.tariffs_using.length > 0 && (
            <div className="mt-4">
              <span className="text-muted-foreground text-sm">
                {t('admin.servers.usedByTariffs')}:
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {server.tariffs_using.map((tariff) => (
                  <span
                    key={tariff}
                    className="bg-muted text-muted-foreground rounded-lg px-3 py-1 text-sm"
                  >
                    {tariff}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/admin/servers')}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={!displayName || updateMutation.isPending}>
            {updateMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {t('common.saving')}
              </span>
            ) : (
              t('common.save')
            )}
          </Button>
        </div>

        {updateMutation.isError && (
          <div className="border-error-500/30 bg-error-500/10 text-error-400 rounded-lg border p-3 text-sm">
            {t('admin.servers.updateError')}
          </div>
        )}
      </form>
    </div>
  );
}
