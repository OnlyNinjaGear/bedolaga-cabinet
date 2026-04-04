import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  campaignsApi,
  CampaignCreateRequest,
  CampaignBonusType,
  ServerSquadInfo,
  TariffListItem,
} from '../api/campaigns';
import { partnerApi } from '../api/partners';
import { AdminBackButton } from '../components/admin';
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
// Icons
const CampaignIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
}

export default function AdminCampaignCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const partnerId = searchParams.get('partnerId');

  // Fetch partner info if creating for a partner
  const { data: partner } = useQuery({
    queryKey: ['admin-partner-detail', partnerId],
    queryFn: () => partnerApi.getPartnerDetail(Number(partnerId)),
    enabled: !!partnerId,
  });

  // Form state
  const [name, setName] = useState('');
  const [startParameter, setStartParameter] = useState('');
  const [bonusType, setBonusType] = useState<CampaignBonusType>('balance');
  const [isActive, setIsActive] = useState(true);

  // Auto-fill from partner
  const [autoFilled, setAutoFilled] = useState(false);
  useEffect(() => {
    if (partner && !autoFilled) {
      const partnerName = partner.first_name || partner.username || '';
      if (!name && partnerName) setName(partnerName);
      if (!startParameter && partnerName) setStartParameter(`partner_${slugify(partnerName)}`);
      setAutoFilled(true);
    }
  }, [partner, autoFilled, name, startParameter]);

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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: campaignsApi.createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns-overview'] });
      if (partnerId) {
        queryClient.invalidateQueries({ queryKey: ['admin-partner-detail', partnerId] });
        navigate(`/admin/partners/${partnerId}`);
      } else {
        navigate('/admin/campaigns');
      }
    },
  });

  const toggleServer = (uuid: string) => {
    setSelectedSquads((prev) =>
      prev.includes(uuid) ? prev.filter((s) => s !== uuid) : [...prev, uuid],
    );
  };

  const handleSubmit = () => {
    const data: CampaignCreateRequest = {
      name,
      start_parameter: startParameter,
      bonus_type: bonusType,
      is_active: isActive,
    };

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

    if (partnerId) {
      data.partner_user_id = Number(partnerId);
    }

    createMutation.mutate(data);
  };

  const isNameValid = name.trim().length > 0;
  const isStartParamValid =
    startParameter.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(startParameter);
  const isValid = isNameValid && isStartParamValid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AdminBackButton />
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 text-primary rounded-lg p-2">
            <CampaignIcon />
          </div>
          <div>
            <h1 className="text-foreground text-xl font-bold">
              {t('admin.campaigns.modal.createTitle')}
            </h1>
            <p className="text-muted-foreground text-sm">{t('admin.campaigns.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Partner info banner */}
      {partnerId && partner && (
        <div className="border-primary/20 bg-primary/5 rounded-xl border p-4">
          <div className="flex items-start gap-3">
            <svg
              className="text-primary mt-0.5 h-5 w-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
              />
            </svg>
            <p className="text-primary/70 text-sm">
              {t('admin.campaigns.form.partnerAutoAssign', {
                name: partner.first_name || partner.username || `#${partnerId}`,
              })}
            </p>
          </div>
        </div>
      )}

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
          <input
            type="text"
            value={startParameter}
            onChange={(e) => setStartParameter(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
            className={`input font-mono ${startParameter.length > 0 && !isStartParamValid ? 'border-error-500/50' : ''}`}
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
        <Button
          variant="secondary"
          onClick={() => navigate(partnerId ? `/admin/partners/${partnerId}` : '/admin/campaigns')}
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || createMutation.isPending}
          className="flex items-center gap-2"
        >
          {createMutation.isPending ? <RefreshIcon /> : <CampaignIcon />}
          {t('admin.campaigns.form.save')}
        </Button>
      </Card>
    </div>
  );
}
