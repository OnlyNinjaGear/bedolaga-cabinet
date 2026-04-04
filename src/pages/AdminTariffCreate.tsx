import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  tariffsApi,
  TariffDetail,
  TariffCreateRequest,
  TariffUpdateRequest,
  PeriodPrice,
  ServerInfo,
  ExternalSquadInfo,
} from '../api/tariffs';
import { AdminBackButton } from '../components/admin';
import { createNumberInputHandler, toNumber } from '../utils/inputHelpers';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Icons
const PlusIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const InfinityIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
    />
  </svg>
);

const SunIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
    />
  </svg>
);

const RefreshIcon = () => (
  <svg
    className="h-4 w-4 animate-spin"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

type TariffType = 'period' | 'daily' | null;

export default function AdminTariffCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  // Step: null = type selection, 'period' or 'daily' = form
  const [tariffType, setTariffType] = useState<TariffType>(null);

  // Form state - matches bot fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [trafficLimitGb, setTrafficLimitGb] = useState<number | ''>(100);
  const [deviceLimit, setDeviceLimit] = useState<number | ''>(1);
  const [devicePriceKopeks, setDevicePriceKopeks] = useState<number | ''>(0);
  const [maxDeviceLimit, setMaxDeviceLimit] = useState<number | ''>(0);
  const [tierLevel, setTierLevel] = useState<number | ''>(1);
  const [periodPrices, setPeriodPrices] = useState<PeriodPrice[]>([]);
  const [selectedSquads, setSelectedSquads] = useState<string[]>([]);
  const [selectedExternalSquad, setSelectedExternalSquad] = useState<string | null>(null);
  const [selectedPromoGroups, setSelectedPromoGroups] = useState<number[]>([]);
  const [dailyPriceKopeks, setDailyPriceKopeks] = useState<number | ''>(0);

  // Traffic topup
  const [trafficTopupEnabled, setTrafficTopupEnabled] = useState(false);
  const [maxTopupTrafficGb, setMaxTopupTrafficGb] = useState<number | ''>(0);
  const [trafficTopupPackages, setTrafficTopupPackages] = useState<Record<string, number>>({});

  // New traffic package for adding
  const [newPackageGb, setNewPackageGb] = useState<number | ''>(10);
  const [newPackagePrice, setNewPackagePrice] = useState<number | ''>(100);

  // Track editing state for traffic package prices
  const [editingPackagePrices, setEditingPackagePrices] = useState<Record<string, string>>({});

  // Traffic reset mode
  const [trafficResetMode, setTrafficResetMode] = useState<string | null>(null);

  // Gift visibility
  const [showInGift, setShowInGift] = useState(true);

  // New period for adding
  const [newPeriodDays, setNewPeriodDays] = useState<number | ''>(30);
  const [newPeriodPrice, setNewPeriodPrice] = useState<number | ''>(300);

  // Track editing state for period prices
  const [editingPeriodPrices, setEditingPeriodPrices] = useState<Record<number, string>>({});

  const [activeTab, setActiveTab] = useState<'basic' | 'periods' | 'servers' | 'extra'>('basic');

  // Fetch servers
  const { data: servers = [] } = useQuery({
    queryKey: ['admin-tariffs-servers'],
    queryFn: () => tariffsApi.getAvailableServers(),
  });

  // Fetch external squads
  const { data: externalSquads = [] } = useQuery({
    queryKey: ['admin-tariffs-external-squads'],
    queryFn: () => tariffsApi.getAvailableExternalSquads(),
  });

  // Fetch promo groups
  const { data: promoGroups = [] } = useQuery({
    queryKey: ['admin-tariffs-promo-groups'],
    queryFn: () => tariffsApi.getAvailablePromoGroups(),
  });

  // Fetch tariff for editing
  const { isLoading: isLoadingTariff } = useQuery({
    queryKey: ['admin-tariff', id],
    queryFn: () => tariffsApi.getTariff(Number(id)),
    enabled: isEdit,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    select: useCallback((data: TariffDetail) => {
      setTariffType(data.is_daily ? 'daily' : 'period');
      setName(data.name);
      setDescription(data.description || '');
      setIsActive(data.is_active ?? true);
      setTrafficLimitGb(data.traffic_limit_gb ?? 100);
      setDeviceLimit(data.device_limit || 1);
      setDevicePriceKopeks(data.device_price_kopeks || 0);
      setMaxDeviceLimit(data.max_device_limit || 0);
      setTierLevel(data.tier_level || 1);
      setPeriodPrices(data.period_prices?.length ? data.period_prices : []);
      setSelectedSquads(data.allowed_squads || []);
      setSelectedExternalSquad(data.external_squad_uuid || null);
      setSelectedPromoGroups(
        data.promo_groups?.filter((pg) => pg.is_selected).map((pg) => pg.id) || [],
      );
      setDailyPriceKopeks(data.daily_price_kopeks || 0);
      setTrafficTopupEnabled(data.traffic_topup_enabled || false);
      setMaxTopupTrafficGb(data.max_topup_traffic_gb || 0);
      setTrafficTopupPackages(data.traffic_topup_packages || {});
      setTrafficResetMode(data.traffic_reset_mode || null);
      setShowInGift(data.show_in_gift ?? true);
      return data;
    }, []),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: tariffsApi.createTariff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] });
      navigate('/admin/tariffs');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TariffUpdateRequest }) =>
      tariffsApi.updateTariff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] });
      navigate('/admin/tariffs');
    },
  });

  const handleSubmit = () => {
    const isDaily = tariffType === 'daily';

    const data: TariffCreateRequest | TariffUpdateRequest = {
      name,
      description: description || undefined,
      is_active: isActive,
      show_in_gift: showInGift,
      traffic_limit_gb: toNumber(trafficLimitGb, 100),
      device_limit: toNumber(deviceLimit, 1),
      device_price_kopeks:
        toNumber(devicePriceKopeks) >= 0 ? toNumber(devicePriceKopeks) : undefined,
      max_device_limit: toNumber(maxDeviceLimit) > 0 ? toNumber(maxDeviceLimit) : undefined,
      tier_level: toNumber(tierLevel, 1),
      period_prices: isDaily ? [] : periodPrices.filter((p) => p.price_kopeks >= 0),
      allowed_squads: selectedSquads,
      external_squad_uuid: selectedExternalSquad || null,
      promo_group_ids: selectedPromoGroups.length > 0 ? selectedPromoGroups : undefined,
      traffic_topup_enabled: trafficTopupEnabled,
      traffic_topup_packages: trafficTopupPackages,
      max_topup_traffic_gb: toNumber(maxTopupTrafficGb),
      is_daily: isDaily,
      daily_price_kopeks: isDaily ? toNumber(dailyPriceKopeks) : 0,
      traffic_reset_mode: trafficResetMode,
    };

    if (isEdit) {
      updateMutation.mutate({ id: Number(id), data });
    } else {
      createMutation.mutate(data as TariffCreateRequest);
    }
  };

  const toggleServer = (uuid: string) => {
    setSelectedSquads((prev) =>
      prev.includes(uuid) ? prev.filter((s) => s !== uuid) : [...prev, uuid],
    );
  };

  const togglePromoGroup = (groupId: number) => {
    setSelectedPromoGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
    );
  };

  const addPeriod = () => {
    const days = toNumber(newPeriodDays, 0);
    const price = toNumber(newPeriodPrice, 0);
    if (days > 0 && price > 0) {
      const exists = periodPrices.some((p) => p.days === days);
      if (!exists) {
        setPeriodPrices((prev) =>
          [...prev, { days, price_kopeks: price * 100 }].sort((a, b) => a.days - b.days),
        );
        setNewPeriodDays(30);
        setNewPeriodPrice(300);
      }
    }
  };

  const removePeriod = (days: number) => {
    setPeriodPrices((prev) => prev.filter((p) => p.days !== days));
  };

  const updatePeriodPrice = (days: number, priceRubles: number) => {
    setPeriodPrices((prev) =>
      prev.map((p) => (p.days === days ? { ...p, price_kopeks: priceRubles * 100 } : p)),
    );
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Validation like bot: name 2-50 chars, device_limit >= 1, tier_level 1-10
  const isNameValid = name.length >= 2 && name.length <= 50;
  const isDeviceLimitValid = deviceLimit !== '' && toNumber(deviceLimit) >= 1;
  const isTierLevelValid =
    tierLevel !== '' && toNumber(tierLevel) >= 1 && toNumber(tierLevel) <= 10;
  const hasTrafficPackages = !trafficTopupEnabled || Object.keys(trafficTopupPackages).length > 0;
  const isValidPeriod =
    isNameValid &&
    isDeviceLimitValid &&
    isTierLevelValid &&
    periodPrices.length > 0 &&
    hasTrafficPackages;
  const isValidDaily =
    isNameValid &&
    isDeviceLimitValid &&
    isTierLevelValid &&
    toNumber(dailyPriceKopeks) > 0 &&
    hasTrafficPackages;
  const isValid =
    tariffType === 'period' ? isValidPeriod : tariffType === 'daily' ? isValidDaily : false;

  // Collect validation errors for display
  const validationErrors: string[] = [];
  if (!isNameValid) {
    if (name.length === 0) {
      validationErrors.push('nameRequired');
    } else if (name.length < 2 || name.length > 50) {
      validationErrors.push('nameLength');
    }
  }
  if (!isDeviceLimitValid) validationErrors.push('deviceLimitRequired');
  if (!isTierLevelValid) validationErrors.push('tierLevelInvalid');
  if (tariffType === 'period' && periodPrices.length === 0) {
    validationErrors.push('periodsRequired');
  }
  if (tariffType === 'daily' && toNumber(dailyPriceKopeks) === 0) {
    validationErrors.push('dailyPriceRequired');
  }
  if (trafficTopupEnabled && Object.keys(trafficTopupPackages).length === 0) {
    validationErrors.push('trafficPackagesRequired');
  }

  // Loading state
  if (isEdit && isLoadingTariff) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  // Type selection step (only for creation)
  if (!isEdit && tariffType === null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <AdminBackButton to="/admin/tariffs" />
          <div>
            <h1 className="text-foreground text-xl font-bold">{t('admin.tariffs.selectType')}</h1>
            <p className="text-muted-foreground text-sm">{t('admin.tariffs.selectTypeDesc')}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card
            onClick={() => setTariffType('period')}
            className="group hover:border-primary/50 cursor-pointer p-6 text-left transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="bg-primary/20 text-primary group-hover:bg-primary/30 rounded-lg p-3">
                <CalendarIcon />
              </div>
              <div>
                <h3 className="text-foreground font-medium">{t('admin.tariffs.periodTariff')}</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t('admin.tariffs.periodTariffDesc')}
                </p>
              </div>
            </div>
          </Card>
          <Card
            onClick={() => setTariffType('daily')}
            className="group hover:border-warning-500/50 cursor-pointer p-6 text-left transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="bg-warning-500/20 text-warning-400 group-hover:bg-warning-500/30 rounded-lg p-3">
                <SunIcon />
              </div>
              <div>
                <h3 className="text-foreground font-medium">{t('admin.tariffs.dailyTariff')}</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t('admin.tariffs.dailyTariffDesc')}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const isDaily = tariffType === 'daily';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AdminBackButton to="/admin/tariffs" />
        <div className="flex items-center gap-3">
          <div
            className={`rounded-lg p-2 ${
              isDaily ? 'bg-warning-500/20 text-warning-400' : 'bg-primary/20 text-primary'
            }`}
          >
            {isDaily ? <SunIcon /> : <CalendarIcon />}
          </div>
          <div>
            <h1 className="text-foreground text-xl font-bold">
              {isEdit
                ? t('admin.tariffs.editTitle')
                : isDaily
                  ? t('admin.tariffs.newDailyTitle')
                  : t('admin.tariffs.newPeriodTitle')}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isDaily ? t('admin.tariffs.dailyDeduction') : t('admin.tariffs.periodPayment')}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 py-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {(isDaily
          ? (['basic', 'servers', 'extra'] as const)
          : (['basic', 'periods', 'servers', 'extra'] as const)
        ).map((tab) => (
          <Button
            key={tab}
            variant="ghost"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 rounded-xl text-sm font-medium whitespace-nowrap ${
              activeTab === tab
                ? isDaily
                  ? 'bg-warning-500/15 text-warning-400 ring-warning-500/30 hover:bg-warning-500/15 hover:text-warning-400 ring-1'
                  : 'bg-primary/15 text-primary ring-ring/30 hover:bg-primary/15 hover:text-primary ring-1'
                : 'bg-card/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab === 'basic' && t('admin.tariffs.tabBasic')}
            {tab === 'periods' && t('admin.tariffs.tabPeriods')}
            {tab === 'servers' && t('admin.tariffs.tabServers')}
            {tab === 'extra' && t('admin.tariffs.tabExtra')}
          </Button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'basic' && (
        <Card className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.tariffs.nameLabel')}
              <span className="text-error-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`input ${!isNameValid && name.length > 0 ? 'border-error-500/50' : ''}`}
              placeholder={
                isDaily ? t('admin.tariffs.nameExampleDaily') : t('admin.tariffs.nameExamplePeriod')
              }
              maxLength={50}
            />
            <p className="text-muted-foreground mt-1 text-xs">{t('admin.tariffs.nameHint')}</p>
            {name.length > 0 && (name.length < 2 || name.length > 50) && (
              <p className="text-error-400 mt-1 text-xs">
                {t('admin.tariffs.validation.nameLength')}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.tariffs.descriptionLabel')}
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-20 resize-none"
              placeholder={t('admin.tariffs.descriptionPlaceholder')}
            />
          </div>

          {/* Daily Price (only for daily tariff) */}
          {isDaily && (
            <div className="border-warning-500/30 bg-warning-500/10 rounded-lg border p-4">
              <label className="text-warning-400 mb-2 block text-sm font-medium">
                {t('admin.tariffs.dailyPriceLabel')}
                <span className="text-error-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={dailyPriceKopeks === '' ? '' : dailyPriceKopeks / 100}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setDailyPriceKopeks('');
                    } else {
                      const num = Math.max(0, parseFloat(val) || 0) * 100;
                      setDailyPriceKopeks(num);
                    }
                  }}
                  className={`w-32 ${dailyPriceKopeks === '' || dailyPriceKopeks === 0 ? 'border-error-500/50' : ''}`}
                  min={0}
                  step={0.1}
                  placeholder="50"
                />
                <span className="text-muted-foreground">{t('admin.tariffs.currencyPerDay')}</span>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                {t('admin.tariffs.dailyDeductionDesc')}
              </p>
            </div>
          )}

          {/* Traffic Limit */}
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.tariffs.trafficLimitLabel')}
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={trafficLimitGb}
                onChange={createNumberInputHandler(setTrafficLimitGb, 0)}
                className="w-32"
                min={0}
                placeholder="100"
              />
              <span className="text-muted-foreground">{t('admin.tariffs.gbUnit')}</span>
              {(trafficLimitGb === 0 || trafficLimitGb === '') && (
                <span className="text-success-500 flex items-center gap-1 text-sm">
                  <InfinityIcon />
                  {t('admin.tariffs.unlimited')}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {t('admin.tariffs.trafficLimitHint')}
            </p>
          </div>

          {/* Device Limit */}
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.tariffs.deviceLimitLabel')}
              <span className="text-error-400">*</span>
            </label>
            <Input
              type="number"
              value={deviceLimit}
              onChange={createNumberInputHandler(setDeviceLimit, 1)}
              className={`w-32 ${!isDeviceLimitValid ? 'border-error-500/50' : ''}`}
              min={1}
              placeholder="1"
            />
          </div>

          {/* Tier Level */}
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.tariffs.tierLevelLabel')}
              <span className="text-error-400">*</span>
            </label>
            <Input
              type="number"
              value={tierLevel}
              onChange={createNumberInputHandler(setTierLevel, 1, 10)}
              className={`w-32 ${!isTierLevelValid ? 'border-error-500/50' : ''}`}
              min={1}
              max={10}
              placeholder="1"
            />
            <p className="text-muted-foreground mt-1 text-xs">{t('admin.tariffs.tierLevelHint')}</p>
          </div>
        </Card>
      )}

      {activeTab === 'periods' && !isDaily && (
        <Card className="space-y-4">
          <p className="text-muted-foreground text-sm">{t('admin.tariffs.periodsTabHint')}</p>

          {/* Add new period */}
          <div className="border-border bg-card/50 rounded-lg border border-dashed p-4">
            <h4 className="text-muted-foreground mb-3 text-sm font-medium">
              {t('admin.tariffs.addPeriodTitle')}
            </h4>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-muted-foreground mb-1 block text-xs">
                  {t('admin.tariffs.daysLabel')}
                </label>
                <Input
                  type="number"
                  value={newPeriodDays}
                  onChange={createNumberInputHandler(setNewPeriodDays, 1)}
                  className="w-24"
                  placeholder="30"
                />
              </div>
              <div>
                <label className="text-muted-foreground mb-1 block text-xs">
                  {t('admin.tariffs.priceLabel')}
                </label>
                <Input
                  type="number"
                  value={newPeriodPrice}
                  onChange={createNumberInputHandler(setNewPeriodPrice, 1)}
                  className="w-28"
                  placeholder="300"
                />
              </div>
              <Button
                onClick={addPeriod}
                disabled={periodPrices.some((p) => p.days === toNumber(newPeriodDays, 0))}
                className="flex items-center gap-2"
              >
                <PlusIcon />
                {t('admin.tariffs.addButton')}
              </Button>
            </div>
          </div>

          {/* Period list */}
          {periodPrices.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              {t('admin.tariffs.noPeriodsHint')}
            </div>
          ) : (
            <div className="space-y-2">
              {periodPrices.map((period) => (
                <div key={period.days} className="bg-card flex items-center gap-3 rounded-lg p-3">
                  <div className="text-muted-foreground w-20 font-medium">
                    {period.days} {t('admin.tariffs.daysShort')}
                  </div>
                  <Input
                    type="number"
                    value={
                      editingPeriodPrices[period.days] !== undefined
                        ? editingPeriodPrices[period.days]
                        : period.price_kopeks / 100
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingPeriodPrices((prev) => ({ ...prev, [period.days]: val }));
                      if (val !== '') {
                        const num = parseFloat(val);
                        if (!isNaN(num)) {
                          updatePeriodPrice(period.days, Math.max(0, num));
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        updatePeriodPrice(period.days, 0);
                      }
                      setEditingPeriodPrices((prev) => {
                        const copy = { ...prev };
                        delete copy[period.days];
                        return copy;
                      });
                    }}
                    className="w-28"
                    step={1}
                    placeholder="0"
                  />
                  <span className="text-muted-foreground">₽</span>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePeriod(period.days)}
                    className="hover:bg-error-500/20 hover:text-error-400"
                  >
                    <TrashIcon />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'servers' && (
        <div className="space-y-4">
          {/* External Squad */}
          {externalSquads.length > 0 && (
            <Card className="space-y-4">
              <h4 className="text-foreground text-sm font-medium">
                {t('admin.tariffs.externalSquadTitle')}
              </h4>
              <p className="text-muted-foreground text-sm">
                {t('admin.tariffs.externalSquadHint')}
              </p>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedExternalSquad(null)}
                  className={`h-auto w-full justify-start gap-3 p-3 ${
                    !selectedExternalSquad
                      ? isDaily
                        ? 'bg-warning-500/20 text-warning-300 hover:bg-warning-500/20 hover:text-warning-300'
                        : 'bg-primary/20 text-primary/70 hover:bg-primary/20 hover:text-primary/70'
                      : 'bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${
                      !selectedExternalSquad
                        ? isDaily
                          ? 'bg-warning-500 text-white'
                          : 'bg-primary text-white'
                        : 'bg-muted'
                    }`}
                  >
                    {!selectedExternalSquad && <CheckIcon />}
                  </div>
                  <span className="flex-1 text-sm font-medium">
                    {t('admin.tariffs.noExternalSquad')}
                  </span>
                </Button>
                {externalSquads.map((squad: ExternalSquadInfo) => {
                  const isSelected = selectedExternalSquad === squad.uuid;
                  return (
                    <Button
                      key={squad.uuid}
                      type="button"
                      variant="ghost"
                      onClick={() => setSelectedExternalSquad(squad.uuid)}
                      className={`h-auto w-full justify-start gap-3 p-3 ${
                        isSelected
                          ? isDaily
                            ? 'bg-warning-500/20 text-warning-300 hover:bg-warning-500/20 hover:text-warning-300'
                            : 'bg-primary/20 text-primary/70 hover:bg-primary/20 hover:text-primary/70'
                          : 'bg-card text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full ${
                          isSelected
                            ? isDaily
                              ? 'bg-warning-500 text-white'
                              : 'bg-primary text-white'
                            : 'bg-muted'
                        }`}
                      >
                        {isSelected && <CheckIcon />}
                      </div>
                      <span className="flex-1 text-sm font-medium">{squad.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {squad.members_count} {t('admin.tariffs.externalSquadUsers')}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Servers */}
          <Card className="space-y-4">
            <h4 className="text-foreground text-sm font-medium">
              {t('admin.tariffs.serversTitle')}
            </h4>
            <p className="text-muted-foreground text-sm">{t('admin.tariffs.serversTabHint')}</p>
            {servers.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center">
                {t('admin.tariffs.noServersAvailable')}
              </p>
            ) : (
              <div className="space-y-2">
                {servers.map((server: ServerInfo) => {
                  const isSelected = selectedSquads.includes(server.squad_uuid);
                  return (
                    <Button
                      key={server.id}
                      type="button"
                      variant="ghost"
                      onClick={() => toggleServer(server.squad_uuid)}
                      className={`h-auto w-full justify-start gap-3 p-3 ${
                        isSelected
                          ? isDaily
                            ? 'bg-warning-500/20 text-warning-300 hover:bg-warning-500/20 hover:text-warning-300'
                            : 'bg-primary/20 text-primary/70 hover:bg-primary/20 hover:text-primary/70'
                          : 'bg-card text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded ${
                          isSelected
                            ? isDaily
                              ? 'bg-warning-500 text-white'
                              : 'bg-primary text-white'
                            : 'bg-muted'
                        }`}
                      >
                        {isSelected && <CheckIcon />}
                      </div>
                      <span className="flex-1 text-sm font-medium">{server.display_name}</span>
                      {server.country_code && (
                        <span className="text-muted-foreground text-xs">{server.country_code}</span>
                      )}
                    </Button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'extra' && (
        <div className="space-y-4">
          {/* Device addon */}
          <Card className="space-y-3">
            <h4 className="text-foreground text-sm font-medium">
              {t('admin.tariffs.extraDeviceTitle')}
            </h4>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground w-48 text-sm">
                {t('admin.tariffs.devicePriceLabel')}
              </span>
              <Input
                type="number"
                value={devicePriceKopeks === '' ? '' : devicePriceKopeks / 100}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setDevicePriceKopeks('');
                  } else {
                    setDevicePriceKopeks(Math.max(0, parseFloat(val) || 0) * 100);
                  }
                }}
                className="w-24"
                min={0}
                step={1}
                placeholder="0"
              />
              <span className="text-muted-foreground">₽</span>
            </div>
            <p className="text-muted-foreground text-xs">{t('admin.tariffs.devicePriceHint')}</p>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground w-48 text-sm">
                {t('admin.tariffs.maxDeviceLabel')}
              </span>
              <Input
                type="number"
                value={maxDeviceLimit}
                onChange={createNumberInputHandler(setMaxDeviceLimit, 0)}
                className="w-24"
                min={0}
                placeholder="0"
              />
            </div>
            <p className="text-muted-foreground text-xs">{t('admin.tariffs.noLimitHint')}</p>
          </Card>

          {/* Traffic topup */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-foreground text-sm font-medium">
                {t('admin.tariffs.extraTrafficTitle')}
              </h4>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setTrafficTopupEnabled(!trafficTopupEnabled)}
                className={`relative h-6 w-11 rounded-full p-0 transition-colors ${
                  trafficTopupEnabled ? 'bg-primary hover:bg-primary' : 'bg-muted hover:bg-muted'
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    trafficTopupEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </Button>
            </div>
            {trafficTopupEnabled && (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground w-32 text-sm">
                    {t('admin.tariffs.trafficMaxLimitLabel')}
                  </span>
                  <Input
                    type="number"
                    value={maxTopupTrafficGb}
                    onChange={createNumberInputHandler(setMaxTopupTrafficGb, 0)}
                    className="w-24"
                    min={0}
                    placeholder="0"
                  />
                  <span className="text-muted-foreground">{t('admin.tariffs.gbUnit')}</span>
                </div>
                {/* Add new package */}
                <div className="border-border bg-card/50 rounded-lg border border-dashed p-3">
                  <h5 className="text-muted-foreground mb-2 text-xs font-medium">
                    {t('admin.tariffs.addPackageTitle')}
                  </h5>
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="text-muted-foreground mb-1 block text-xs">
                        {t('admin.tariffs.gbUnit')}
                      </label>
                      <Input
                        type="number"
                        value={newPackageGb}
                        onChange={createNumberInputHandler(setNewPackageGb, 1)}
                        className="w-20"
                        placeholder="10"
                      />
                    </div>
                    <div>
                      <label className="text-muted-foreground mb-1 block text-xs">
                        {t('admin.tariffs.priceLabel')}
                      </label>
                      <Input
                        type="number"
                        value={newPackagePrice}
                        onChange={createNumberInputHandler(setNewPackagePrice, 1)}
                        className="w-24"
                        placeholder="100"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        const gb = toNumber(newPackageGb, 0);
                        const price = toNumber(newPackagePrice, 0);
                        if (gb > 0 && price >= 0 && !trafficTopupPackages[String(gb)]) {
                          setTrafficTopupPackages((prev) => ({
                            ...prev,
                            [String(gb)]: price * 100,
                          }));
                          setNewPackageGb(10);
                          setNewPackagePrice(100);
                        }
                      }}
                      disabled={
                        newPackageGb === '' ||
                        newPackagePrice === '' ||
                        !!trafficTopupPackages[String(newPackageGb)]
                      }
                      className="flex items-center gap-1"
                    >
                      <PlusIcon />
                      {t('admin.tariffs.addButton')}
                    </Button>
                  </div>
                </div>

                {/* Package list */}
                <div>
                  <span className="text-muted-foreground text-sm">
                    {t('admin.tariffs.trafficPackagesLabel')}
                  </span>
                  {Object.keys(trafficTopupPackages).length === 0 ? (
                    <div className="text-muted-foreground mt-2 py-4 text-center text-sm">
                      {t('admin.tariffs.noPackagesHint')}
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {Object.entries(trafficTopupPackages)
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .map(([gb, priceKopeks]) => (
                          <div key={gb} className="bg-card flex items-center gap-2 rounded-lg p-2">
                            <span className="text-muted-foreground w-16 text-sm font-medium">
                              {gb} {t('admin.tariffs.gbPackageUnit')}
                            </span>
                            <Input
                              type="number"
                              value={
                                editingPackagePrices[gb] !== undefined
                                  ? editingPackagePrices[gb]
                                  : priceKopeks / 100
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditingPackagePrices((prev) => ({ ...prev, [gb]: val }));
                                if (val !== '') {
                                  const num = parseFloat(val);
                                  if (!isNaN(num)) {
                                    setTrafficTopupPackages((prev) => ({
                                      ...prev,
                                      [gb]: Math.max(0, num) * 100,
                                    }));
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                  setTrafficTopupPackages((prev) => ({
                                    ...prev,
                                    [gb]: 0,
                                  }));
                                }
                                setEditingPackagePrices((prev) => {
                                  const copy = { ...prev };
                                  delete copy[gb];
                                  return copy;
                                });
                              }}
                              className="w-24"
                              step={1}
                              placeholder="0"
                            />
                            <span className="text-muted-foreground text-xs">₽</span>
                            <div className="flex-1" />
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              onClick={() => {
                                setTrafficTopupPackages((prev) => {
                                  const copy = { ...prev };
                                  delete copy[gb];
                                  return copy;
                                });
                              }}
                              className="hover:bg-error-500/20 hover:text-error-400"
                            >
                              <TrashIcon />
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>

          {/* Traffic reset mode */}
          <Card className="space-y-3">
            <h4 className="text-foreground text-sm font-medium">
              {t('admin.tariffs.trafficResetModeTitle')}
            </h4>
            <p className="text-muted-foreground text-xs">
              {t('admin.tariffs.trafficResetModeDesc')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: null, labelKey: 'admin.tariffs.resetModeGlobal', emoji: '🌐' },
                { value: 'DAY', labelKey: 'admin.tariffs.resetModeDaily', emoji: '📅' },
                { value: 'WEEK', labelKey: 'admin.tariffs.resetModeWeekly', emoji: '📆' },
                { value: 'MONTH', labelKey: 'admin.tariffs.resetModeMonthly', emoji: '🗓️' },
                {
                  value: 'MONTH_ROLLING',
                  labelKey: 'admin.tariffs.resetModeMonthRolling',
                  emoji: '🔄',
                },
                { value: 'NO_RESET', labelKey: 'admin.tariffs.resetModeNever', emoji: '🚫' },
              ].map((option) => (
                <Button
                  key={option.value || 'global'}
                  type="button"
                  variant="ghost"
                  onClick={() => setTrafficResetMode(option.value)}
                  className={`h-auto justify-start rounded-lg p-3 text-left text-sm ${
                    trafficResetMode === option.value
                      ? isDaily
                        ? 'bg-warning-500/20 text-warning-300 ring-warning-500/30 hover:bg-warning-500/20 hover:text-warning-300 ring-1'
                        : 'bg-primary/20 text-primary/70 ring-ring/30 hover:bg-primary/20 hover:text-primary/70 ring-1'
                      : 'bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {option.emoji} {t(option.labelKey)}
                </Button>
              ))}
            </div>
          </Card>

          {/* Promo Groups */}
          <Card className="space-y-4">
            <h4 className="text-foreground text-sm font-medium">
              {t('admin.tariffs.promoGroupsTitle')}
            </h4>
            <p className="text-muted-foreground text-sm">{t('admin.tariffs.promoGroupsHint')}</p>
            {promoGroups.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center">
                {t('admin.tariffs.noPromoGroups')}
              </p>
            ) : (
              <div className="space-y-2">
                {promoGroups.map((group) => {
                  const isSelected = selectedPromoGroups.includes(group.id);
                  return (
                    <Button
                      key={group.id}
                      type="button"
                      variant="ghost"
                      onClick={() => togglePromoGroup(group.id)}
                      className={`h-auto w-full justify-start gap-3 p-3 ${
                        isSelected
                          ? isDaily
                            ? 'bg-warning-500/20 text-warning-300 hover:bg-warning-500/20 hover:text-warning-300'
                            : 'bg-primary/20 text-primary/70 hover:bg-primary/20 hover:text-primary/70'
                          : 'bg-card text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded ${
                          isSelected
                            ? isDaily
                              ? 'bg-warning-500 text-white'
                              : 'bg-primary text-white'
                            : 'bg-muted'
                        }`}
                      >
                        {isSelected && <CheckIcon />}
                      </div>
                      <span className="flex-1 text-sm font-medium">{group.name}</span>
                    </Button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Tariff status */}
          <Card className="space-y-3">
            <h4 className="text-foreground text-sm font-medium">
              {t('admin.tariffs.statusTitle')}
            </h4>
            {/* Active toggle */}
            <div className="bg-card flex items-center justify-between rounded-lg p-3">
              <div>
                <span className="text-foreground text-sm font-medium">
                  {t('admin.tariffs.isActiveLabel')}
                </span>
                <p className="text-muted-foreground text-xs">{t('admin.tariffs.isActiveHint')}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsActive(!isActive)}
                className={`relative h-6 w-11 rounded-full p-0 transition-colors ${
                  isActive ? 'bg-success-500 hover:bg-success-500' : 'bg-muted hover:bg-muted'
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    isActive ? 'left-6' : 'left-1'
                  }`}
                />
              </Button>
            </div>
            {/* Show in gift toggle */}
            <div className="bg-card flex items-center justify-between rounded-lg p-3">
              <div>
                <span className="text-foreground text-sm font-medium">
                  {t('admin.tariffs.showInGiftLabel')}
                </span>
                <p className="text-muted-foreground text-xs">{t('admin.tariffs.showInGiftHint')}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowInGift(!showInGift)}
                className={`relative h-6 w-11 rounded-full p-0 transition-colors ${
                  showInGift ? 'bg-primary hover:bg-primary' : 'bg-muted hover:bg-muted'
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    showInGift ? 'left-6' : 'left-1'
                  }`}
                />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Footer */}
      <Card className="space-y-3">
        {validationErrors.length > 0 && (
          <div className="border-error-500/30 bg-error-500/10 rounded-lg border p-3">
            <p className="text-error-400 mb-1 text-sm font-medium">
              {t('admin.tariffs.cannotSave')}
            </p>
            <ul className="text-error-300 list-inside list-disc space-y-1 text-xs">
              {validationErrors.map((error) => (
                <li key={error}>{t(`admin.tariffs.validation.${error}`)}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className="flex items-center gap-2"
          >
            {isLoading && <RefreshIcon />}
            {isLoading ? t('admin.tariffs.savingButton') : t('admin.tariffs.saveButton')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
