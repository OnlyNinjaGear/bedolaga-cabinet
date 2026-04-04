import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  campaignsApi,
  CampaignUpdateRequest,
  CampaignBonusType,
  ServerSquadInfo,
  TariffListItem,
  AvailablePartner,
} from '../api/campaigns';
import { AdminBackButton } from '../components/admin';
import { CheckIcon, CampaignIcon } from '../components/icons';
import { createNumberInputHandler, toNumber } from '../utils/inputHelpers';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Bonus type config
const bonusTypeConfig: Record<
  CampaignBonusType,
  { labelKey: string; color: string; bgColor: string; borderColor: string }
> = {
  balance: {
    labelKey: 'admin.campaigns.bonusType.balance',
    color: 'text-success-400',
    bgColor: 'bg-success-500/10',
    borderColor: 'border-success-500/30',
  },
  subscription: {
    labelKey: 'admin.campaigns.bonusType.subscription',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
  },
  tariff: {
    labelKey: 'admin.campaigns.bonusType.tariff',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
  },
  none: {
    labelKey: 'admin.campaigns.bonusType.none',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/10',
    borderColor: 'border-border/30',
  },
};

// Server selector component
function ServerSelector({
  servers,
  selected,
  onToggle,
}: {
  servers: ServerSquadInfo[];
  selected: string[];
  onToggle: (uuid: string) => void;
}) {
  const { t } = useTranslation();

  if (servers.length === 0) return null;

  return (
    <div>
      <label className="text-muted-foreground mb-2 block text-sm font-medium">
        {t('admin.campaigns.form.servers')}
      </label>
      <div className="border-border bg-card max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
        {servers.map((server) => (
          <Button
            key={server.id}
            type="button"
            variant="ghost"
            onClick={() => onToggle(server.squad_uuid)}
            className={`flex w-full items-center gap-3 p-3 text-left ${
              selected.includes(server.squad_uuid)
                ? 'bg-primary/20 text-primary/70 hover:bg-primary/20 hover:text-primary/70'
                : 'bg-muted text-muted-foreground hover:bg-muted'
            }`}
          >
            <div
              className={`flex h-5 w-5 items-center justify-center rounded ${
                selected.includes(server.squad_uuid) ? 'bg-primary text-white' : 'bg-muted'
              }`}
            >
              {selected.includes(server.squad_uuid) && <CheckIcon />}
            </div>
            <span className="text-sm font-medium">{server.display_name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

// Tariff selector component
function TariffSelector({
  tariffs,
  value,
  onChange,
}: {
  tariffs: TariffListItem[];
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const { t } = useTranslation();

  return (
    <div>
      <label className="text-muted-foreground mb-2 block text-sm font-medium">
        {t('admin.campaigns.form.selectTariff')}
      </label>
      <Select
        value={value != null ? String(value) : '__none__'}
        onValueChange={(v) => onChange(v === '__none__' ? null : parseInt(v))}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">{t('admin.campaigns.form.notSelected')}</SelectItem>
          {tariffs.map((tariff) => (
            <SelectItem key={tariff.id} value={String(tariff.id)}>
              {tariff.name} ({tariff.traffic_limit_gb} GB, {tariff.device_limit}{' '}
              {t('admin.campaigns.form.devices')})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Partner selector component
function PartnerSelector({
  partners,
  value,
  onChange,
}: {
  partners: AvailablePartner[];
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const { t } = useTranslation();

  return (
    <div>
      <label className="text-muted-foreground mb-2 block text-sm font-medium">
        {t('admin.campaigns.form.partner')}
      </label>
      <Select
        value={value != null ? String(value) : '__none__'}
        onValueChange={(v) => onChange(v === '__none__' ? null : parseInt(v))}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">{t('admin.campaigns.form.noPartner')}</SelectItem>
          {partners.map((p) => (
            <SelectItem key={p.user_id} value={String(p.user_id)}>
              {p.first_name || p.username || `#${p.user_id}`}
              {p.username ? ` (@${p.username})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function AdminCampaignEdit() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const campaignId = parseInt(id || '0');

  // Fetch campaign
  const {
    data: campaign,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-campaign', campaignId],
    queryFn: () => campaignsApi.getCampaign(campaignId),
    enabled: campaignId > 0,
  });

  // Fetch servers
  const { data: servers = [] } = useQuery({
    queryKey: ['admin-campaigns-servers'],
    queryFn: () => campaignsApi.getAvailableServers(),
  });

  // Fetch tariffs
  const { data: tariffs = [] } = useQuery({
    queryKey: ['admin-campaigns-tariffs'],
    queryFn: () => campaignsApi.getAvailableTariffs(),
  });

  // Fetch partners
  const { data: partners = [] } = useQuery({
    queryKey: ['admin-campaigns-partners'],
    queryFn: () => campaignsApi.getAvailablePartners(),
  });

  // Form state
  const [name, setName] = useState('');
  const [startParameter, setStartParameter] = useState('');
  const [bonusType, setBonusType] = useState<CampaignBonusType>('balance');
  const [isActive, setIsActive] = useState(true);

  // Balance bonus
  const [balanceBonusRubles, setBalanceBonusRubles] = useState<number | ''>(0);

  // Subscription bonus
  const [subscriptionDays, setSubscriptionDays] = useState<number | ''>(7);
  const [subscriptionTraffic, setSubscriptionTraffic] = useState<number | ''>(10);
  const [subscriptionDevices, setSubscriptionDevices] = useState<number | ''>(1);
  const [selectedSquads, setSelectedSquads] = useState<string[]>([]);

  // Tariff bonus
  const [tariffId, setTariffId] = useState<number | null>(null);
  const [tariffDays, setTariffDays] = useState<number | ''>(30);

  // Partner
  const [partnerUserId, setPartnerUserId] = useState<number | null>(null);
  const [initialPartnerUserId, setInitialPartnerUserId] = useState<number | null>(null);

  // Initialize form when campaign loads
  useEffect(() => {
    if (campaign) {
      setName(campaign.name || '');
      setStartParameter(campaign.start_parameter || '');
      setBonusType(campaign.bonus_type || 'balance');
      setIsActive(campaign.is_active ?? true);
      setBalanceBonusRubles((campaign.balance_bonus_kopeks || 0) / 100);
      setSubscriptionDays(campaign.subscription_duration_days || 7);
      setSubscriptionTraffic(campaign.subscription_traffic_gb || 10);
      setSubscriptionDevices(campaign.subscription_device_limit || 1);
      setSelectedSquads(campaign.subscription_squads || []);
      setTariffId(campaign.tariff_id || null);
      setTariffDays(campaign.tariff_duration_days || 30);
      setPartnerUserId(campaign.partner_user_id ?? null);
      setInitialPartnerUserId(campaign.partner_user_id ?? null);
    }
  }, [campaign]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: CampaignUpdateRequest) => campaignsApi.updateCampaign(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['admin-campaign', campaignId] });
      navigate('/admin/campaigns');
    },
  });

  const toggleServer = (uuid: string) => {
    setSelectedSquads((prev) =>
      prev.includes(uuid) ? prev.filter((s) => s !== uuid) : [...prev, uuid],
    );
  };

  const handleSubmit = () => {
    const data: CampaignUpdateRequest = {
      name,
      start_parameter: startParameter,
      bonus_type: bonusType,
      is_active: isActive,
    };

    // Only send partner_user_id when it was actually changed
    if (partnerUserId !== initialPartnerUserId) {
      data.partner_user_id = partnerUserId;
    }

    if (bonusType === 'balance') {
      data.balance_bonus_kopeks = Math.round(toNumber(balanceBonusRubles) * 100);
    } else if (bonusType === 'subscription') {
      data.subscription_duration_days = toNumber(subscriptionDays, 7);
      data.subscription_traffic_gb = toNumber(subscriptionTraffic, 10);
      data.subscription_device_limit = toNumber(subscriptionDevices, 1);
      data.subscription_squads = selectedSquads;
    } else if (bonusType === 'tariff') {
      data.tariff_id = tariffId || undefined;
      data.tariff_duration_days = toNumber(tariffDays, 30);
    }

    updateMutation.mutate(data);
  };

  const isNameValid = name.trim().length > 0;
  const isStartParamValid =
    startParameter.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(startParameter);
  const isValid = isNameValid && isStartParamValid;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <AdminBackButton to="/admin/campaigns" />
          <h1 className="text-foreground text-xl font-semibold">
            {t('admin.campaigns.modal.editTitle')}
          </h1>
        </div>
        <div className="border-error-500/30 bg-error-500/10 rounded-xl border p-6 text-center">
          <p className="text-error-400">{t('admin.campaigns.loadError')}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/campaigns')}
            className="mt-4"
          >
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AdminBackButton to="/admin/campaigns" />
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 text-primary rounded-lg p-2">
            <CampaignIcon />
          </div>
          <div>
            <h1 className="text-foreground text-xl font-bold">
              {t('admin.campaigns.modal.editTitle')}
            </h1>
            <p className="text-muted-foreground text-sm">{campaign.name}</p>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <Card className="space-y-4">
        {/* Name */}
        <div>
          <label className="text-muted-foreground mb-2 block text-sm font-medium">
            {t('admin.campaigns.form.name')}
            <span className="text-error-400">*</span>
          </label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${name.length > 0 && !isNameValid ? 'border-error-500/50' : ''}`}
            placeholder={t('admin.campaigns.form.namePlaceholder')}
            maxLength={255}
          />
          {name.length > 0 && !isNameValid && (
            <p className="text-error-400 mt-1 text-xs">
              {t('admin.campaigns.validation.nameRequired')}
            </p>
          )}
        </div>

        {/* Start Parameter */}
        <div>
          <label className="text-muted-foreground mb-2 block text-sm font-medium">
            {t('admin.campaigns.form.startParameter')}
            <span className="text-error-400">*</span>
          </label>
          <Input
            type="text"
            value={startParameter}
            onChange={(e) => setStartParameter(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
            className={`font-mono ${startParameter.length > 0 && !isStartParamValid ? 'border-error-500/50' : ''}`}
            placeholder="instagram_jan2024"
            maxLength={100}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            {t('admin.campaigns.form.startParameterHint')}
          </p>
        </div>

        {/* Active toggle */}
        <div className="border-border bg-card flex items-center justify-between rounded-lg border p-4">
          <span className="text-muted-foreground text-sm font-medium">
            {t('admin.campaigns.form.active')}
          </span>
          <Button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`relative h-6 w-11 rounded-full p-0 transition-colors ${
              isActive ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                isActive ? 'left-6' : 'left-1'
              }`}
            />
          </Button>
        </div>

        {/* Partner */}
        {partners.length > 0 && (
          <PartnerSelector partners={partners} value={partnerUserId} onChange={setPartnerUserId} />
        )}
      </Card>

      {/* Bonus Type */}
      <Card className="space-y-4">
        <h2 className="text-foreground text-lg font-semibold">
          {t('admin.campaigns.form.bonusType')}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(bonusTypeConfig) as CampaignBonusType[]).map((type) => (
            <Button
              key={type}
              type="button"
              variant="outline"
              onClick={() => setBonusType(type)}
              className={`p-4 text-left ${
                bonusType === type
                  ? `${bonusTypeConfig[type].bgColor} ${bonusTypeConfig[type].borderColor} ${bonusTypeConfig[type].color}`
                  : 'text-muted-foreground'
              }`}
            >
              <span className="text-sm font-medium">{t(bonusTypeConfig[type].labelKey)}</span>
            </Button>
          ))}
        </div>
      </Card>

      {/* Bonus Settings */}
      {bonusType === 'balance' && (
        <div
          className={`card space-y-4 border ${bonusTypeConfig.balance.borderColor} ${bonusTypeConfig.balance.bgColor}`}
        >
          <h2 className={`text-lg font-semibold ${bonusTypeConfig.balance.color}`}>
            {t('admin.campaigns.form.balanceBonus')}
          </h2>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              value={balanceBonusRubles}
              onChange={createNumberInputHandler(setBalanceBonusRubles, 0)}
              className="w-32"
              min={0}
              step={1}
            />
            <span className="text-muted-foreground">₽</span>
          </div>
        </div>
      )}

      {bonusType === 'subscription' && (
        <div
          className={`card space-y-4 border ${bonusTypeConfig.subscription.borderColor} ${bonusTypeConfig.subscription.bgColor}`}
        >
          <h2 className={`text-lg font-semibold ${bonusTypeConfig.subscription.color}`}>
            {t('admin.campaigns.form.trialSubscription')}
          </h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-muted-foreground mb-2 block text-sm font-medium">
                {t('admin.campaigns.form.days')}
              </label>
              <Input
                type="number"
                value={subscriptionDays}
                onChange={createNumberInputHandler(setSubscriptionDays, 1)}
                min={1}
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-2 block text-sm font-medium">
                {t('admin.campaigns.form.trafficGb')}
              </label>
              <Input
                type="number"
                value={subscriptionTraffic}
                onChange={createNumberInputHandler(setSubscriptionTraffic, 0)}
                min={0}
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-2 block text-sm font-medium">
                {t('admin.campaigns.form.devices')}
              </label>
              <Input
                type="number"
                value={subscriptionDevices}
                onChange={createNumberInputHandler(setSubscriptionDevices, 1)}
                min={1}
              />
            </div>
          </div>

          <ServerSelector servers={servers} selected={selectedSquads} onToggle={toggleServer} />
        </div>
      )}

      {bonusType === 'tariff' && (
        <div
          className={`card space-y-4 border ${bonusTypeConfig.tariff.borderColor} ${bonusTypeConfig.tariff.bgColor}`}
        >
          <h2 className={`text-lg font-semibold ${bonusTypeConfig.tariff.color}`}>
            {t('admin.campaigns.form.tariff')}
          </h2>

          <TariffSelector tariffs={tariffs} value={tariffId} onChange={setTariffId} />

          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.campaigns.form.durationDays')}
            </label>
            <Input
              type="number"
              value={tariffDays}
              onChange={createNumberInputHandler(setTariffDays, 1)}
              className="w-32"
              min={1}
            />
          </div>
        </div>
      )}

      {bonusType === 'none' && (
        <div
          className={`card border ${bonusTypeConfig.none.borderColor} ${bonusTypeConfig.none.bgColor}`}
        >
          <p className="text-muted-foreground text-sm">
            {t('admin.campaigns.form.noBonusDescription')}
          </p>
        </div>
      )}

      {/* Footer */}
      <Card className="flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={() => navigate('/admin/campaigns')}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || updateMutation.isPending}
          className="flex items-center gap-2"
        >
          {updateMutation.isPending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : null}
          {updateMutation.isPending ? t('common.saving') : t('common.save')}
        </Button>
      </Card>

      {updateMutation.isError && (
        <div className="border-error-500/30 bg-error-500/10 text-error-400 rounded-lg border p-3 text-sm">
          {t('admin.campaigns.updateError')}
        </div>
      )}
    </div>
  );
}
