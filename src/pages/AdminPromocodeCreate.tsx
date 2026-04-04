import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { createNumberInputHandler } from '../utils/inputHelpers';
import {
  promocodesApi,
  PromoCodeDetail,
  PromoCodeType,
  PromoCodeCreateRequest,
  PromoCodeUpdateRequest,
  PromoGroup,
} from '../api/promocodes';
import { tariffsApi } from '../api/tariffs';
import { usePlatform } from '../platform/hooks/usePlatform';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Icons
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

export default function AdminPromocodeCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();
  const isEdit = !!id;

  // Form state
  const [code, setCode] = useState('');
  const [type, setType] = useState<PromoCodeType>('balance');
  const [balanceBonusRubles, setBalanceBonusRubles] = useState<number | ''>(0);
  const [subscriptionDays, setSubscriptionDays] = useState<number | ''>(0);
  const [maxUses, setMaxUses] = useState<number | ''>(1);
  const [isActive, setIsActive] = useState(true);
  const [firstPurchaseOnly, setFirstPurchaseOnly] = useState(false);
  const [validUntil, setValidUntil] = useState('');
  const [promoGroupId, setPromoGroupId] = useState<number | null>(null);
  const [tariffId, setTariffId] = useState<number | null>(null);

  // Fetch promo groups (for promo_group type)
  const { data: promoGroupsData } = useQuery({
    queryKey: ['admin-promo-groups'],
    queryFn: () => promocodesApi.getPromoGroups({ limit: 100 }),
  });

  const promoGroups: PromoGroup[] = promoGroupsData?.items || [];

  // Fetch tariffs to show trial tariff info
  const { data: tariffsData } = useQuery({
    queryKey: ['admin-tariffs-for-promo'],
    queryFn: () => tariffsApi.getTariffs(true),
    enabled: type === 'trial_subscription',
  });

  const trialTariff = tariffsData?.tariffs?.find((t) => t.is_trial_available) || null;

  // Fetch promocode for editing
  const { isLoading: isLoadingPromocode } = useQuery({
    queryKey: ['admin-promocode', id],
    queryFn: () => promocodesApi.getPromocode(Number(id)),
    enabled: isEdit,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    select: useCallback((data: PromoCodeDetail) => {
      setCode(data.code);
      setType(data.type);
      // For discount type, balance_bonus_kopeks is percentage directly
      // For balance type, balance_bonus_kopeks needs to be converted to rubles
      if (data.type === 'discount') {
        setBalanceBonusRubles(data.balance_bonus_kopeks);
      } else {
        setBalanceBonusRubles(data.balance_bonus_rubles || 0);
      }
      setSubscriptionDays(data.subscription_days || 0);
      setMaxUses(data.max_uses || 1);
      setIsActive(data.is_active ?? true);
      setFirstPurchaseOnly(data.first_purchase_only || false);
      setValidUntil(data.valid_until ? data.valid_until.split('T')[0] : '');
      setPromoGroupId(data.promo_group_id || null);
      setTariffId(data.tariff_id || null);
      return data;
    }, []),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: promocodesApi.createPromocode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promocodes'] });
      navigate('/admin/promocodes');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PromoCodeUpdateRequest }) =>
      promocodesApi.updatePromocode(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promocodes'] });
      navigate('/admin/promocodes');
    },
  });

  const handleSubmit = () => {
    // For discount: balance_bonus_kopeks = percent (integer), subscription_days = hours
    // For balance: balance_bonus_kopeks = rubles * 100
    const balanceValue = balanceBonusRubles === '' ? 0 : balanceBonusRubles;
    const daysValue = subscriptionDays === '' ? 0 : subscriptionDays;
    const maxUsesValue = maxUses === '' ? 0 : maxUses;

    const data: PromoCodeCreateRequest | PromoCodeUpdateRequest = {
      code: code.trim().toUpperCase(),
      type,
      balance_bonus_kopeks:
        type === 'discount'
          ? Math.round(balanceValue) // percent as integer
          : Math.round(balanceValue * 100), // rubles to kopeks
      subscription_days: daysValue,
      max_uses: maxUsesValue,
      is_active: isActive,
      first_purchase_only: firstPurchaseOnly,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
      promo_group_id: type === 'promo_group' ? promoGroupId : null,
      ...(type === 'trial_subscription' && tariffId ? { tariff_id: tariffId } : {}),
    };

    if (isEdit) {
      updateMutation.mutate({ id: Number(id), data });
    } else {
      createMutation.mutate(data as PromoCodeCreateRequest);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Validation
  const isCodeValid = code.trim().length > 0;
  const balanceValue = balanceBonusRubles === '' ? 0 : balanceBonusRubles;
  const daysValue = subscriptionDays === '' ? 0 : subscriptionDays;

  const isValid = (): boolean => {
    if (!isCodeValid) return false;
    if (type === 'balance' && balanceValue <= 0) return false;
    if ((type === 'subscription_days' || type === 'trial_subscription') && daysValue <= 0)
      return false;
    if (type === 'promo_group' && !promoGroupId) return false;
    if (type === 'discount' && (balanceValue <= 0 || balanceValue > 100 || daysValue <= 0))
      return false;
    return true;
  };

  // Collect validation errors for display
  const validationErrors: string[] = [];
  if (!isCodeValid) {
    validationErrors.push('codeRequired');
  }
  if (type === 'balance' && balanceValue <= 0) {
    validationErrors.push('balanceRequired');
  }
  if ((type === 'subscription_days' || type === 'trial_subscription') && daysValue <= 0) {
    validationErrors.push('daysRequired');
  }
  if (type === 'promo_group' && !promoGroupId) {
    validationErrors.push('groupRequired');
  }
  if (type === 'discount') {
    if (balanceValue <= 0 || balanceValue > 100) {
      validationErrors.push('discountPercentInvalid');
    }
    if (daysValue <= 0) {
      validationErrors.push('discountHoursRequired');
    }
  }

  // Loading state
  if (isEdit && isLoadingPromocode) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {/* Show back button only on web, not in Telegram Mini App */}
        {!capabilities.hasBackButton && (
          <Button variant="outline" size="icon" onClick={() => navigate('/admin/promocodes')}>
            <BackIcon />
          </Button>
        )}
        <div>
          <h1 className="text-foreground text-xl font-bold">
            {isEdit
              ? t('admin.promocodes.modal.editPromocode')
              : t('admin.promocodes.modal.newPromocode')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('admin.promocodes.subtitle')}</p>
        </div>
      </div>

      {/* Form */}
      <Card className="space-y-4">
        {/* Code */}
        <div>
          <label className="text-muted-foreground mb-2 block text-sm font-medium">
            {t('admin.promocodes.form.code')}
            <span className="text-error-400">*</span>
          </label>
          <Input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className={`uppercase ${!isCodeValid && code.length > 0 ? 'border-error-500/50' : ''}`}
            placeholder="SUMMER2025"
            maxLength={50}
          />
        </div>

        {/* Type */}
        <div>
          <label className="text-muted-foreground mb-2 block text-sm font-medium">
            {t('admin.promocodes.form.type')}
          </label>
          <Select value={type} onValueChange={(v) => setType(v as PromoCodeType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="balance">{t('admin.promocodes.form.typeBalance')}</SelectItem>
              <SelectItem value="subscription_days">
                {t('admin.promocodes.form.typeSubscriptionDays')}
              </SelectItem>
              <SelectItem value="trial_subscription">
                {t('admin.promocodes.form.typeTrialSubscription')}
              </SelectItem>
              <SelectItem value="promo_group">
                {t('admin.promocodes.form.typePromoGroup')}
              </SelectItem>
              <SelectItem value="discount">{t('admin.promocodes.form.typeDiscount')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Type-specific fields */}
        {type === 'balance' && (
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.promocodes.form.bonusAmount')}
              <span className="text-error-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={balanceBonusRubles}
                onChange={createNumberInputHandler(setBalanceBonusRubles, 0)}
                className="w-32"
                min={0}
                step={1}
                placeholder="0"
              />
              <span className="text-muted-foreground">{t('admin.promocodes.form.rub')}</span>
            </div>
          </div>
        )}

        {(type === 'subscription_days' || type === 'trial_subscription') && (
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.promocodes.form.daysCount')}
              <span className="text-error-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={subscriptionDays}
                onChange={createNumberInputHandler(setSubscriptionDays, 0)}
                className="w-32"
                min={1}
                placeholder="0"
              />
              <span className="text-muted-foreground">{t('admin.promocodes.form.days')}</span>
            </div>
          </div>
        )}

        {type === 'trial_subscription' && (
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.promocodes.form.tariff', 'Тариф')}
            </label>
            <Select
              value={tariffId != null ? String(tariffId) : '__default__'}
              onValueChange={(v) => setTariffId(v === '__default__' ? null : parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">
                  {trialTariff
                    ? t('admin.promocodes.form.defaultTrialTariff', 'По умолчанию: {{name}}', {
                        name: trialTariff.name,
                      })
                    : t('admin.promocodes.form.selectTariff', '— Выберите тариф —')}
                </SelectItem>
                {tariffsData?.tariffs?.map((tariff) => (
                  <SelectItem key={tariff.id} value={String(tariff.id)}>
                    {tariff.name} ({tariff.traffic_limit_gb} GB, {tariff.device_limit} устр.)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!tariffId && !trialTariff && (
              <div className="text-warning-400 mt-1 text-xs">
                {t(
                  'admin.promocodes.form.noTrialTariffHint',
                  'Выберите тариф или отметьте тариф как «доступен для триала» в настройках.',
                )}
              </div>
            )}
          </div>
        )}

        {type === 'promo_group' && (
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.promocodes.form.discountGroup')}
              <span className="text-error-400">*</span>
            </label>
            <Select
              value={promoGroupId != null ? String(promoGroupId) : '__none__'}
              onValueChange={(v) => setPromoGroupId(v === '__none__' ? null : parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('admin.promocodes.form.selectGroup')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t('admin.promocodes.form.selectGroup')}</SelectItem>
                {promoGroups.map((group) => (
                  <SelectItem key={group.id} value={String(group.id)}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {type === 'discount' && (
          <>
            <div>
              <label className="text-muted-foreground mb-2 block text-sm font-medium">
                {t('admin.promocodes.form.discountPercent')}
                <span className="text-error-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={balanceBonusRubles}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setBalanceBonusRubles('');
                    } else {
                      setBalanceBonusRubles(Math.min(100, Math.max(0, parseFloat(val) || 0)));
                    }
                  }}
                  className="w-32"
                  min={1}
                  max={100}
                  placeholder="0"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {t('admin.promocodes.form.discountHint')}
              </p>
            </div>
            <div>
              <label className="text-muted-foreground mb-2 block text-sm font-medium">
                {t('admin.promocodes.form.validityPeriod')}
                <span className="text-error-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={subscriptionDays}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setSubscriptionDays('');
                    } else {
                      setSubscriptionDays(Math.max(0, parseInt(val) || 0));
                    }
                  }}
                  className="w-32"
                  min={1}
                  placeholder="0"
                />
                <span className="text-muted-foreground">{t('admin.promocodes.form.hours')}</span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {t('admin.promocodes.form.validityHint')}
              </p>
            </div>
          </>
        )}

        {/* Max Uses */}
        <div>
          <label className="text-muted-foreground mb-2 block text-sm font-medium">
            {t('admin.promocodes.form.maxUses')}
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={maxUses}
              onChange={createNumberInputHandler(setMaxUses, 0)}
              className="w-32"
              min={0}
              placeholder="0"
            />
            <span className="text-muted-foreground text-xs">
              {t('admin.promocodes.form.unlimitedHint')}
            </span>
          </div>
        </div>

        {/* Valid Until */}
        <div>
          <label className="text-muted-foreground mb-2 block text-sm font-medium">
            {t('admin.promocodes.form.validUntil')}
          </label>
          <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          <p className="text-muted-foreground mt-1 text-xs">
            {t('admin.promocodes.form.validUntilHint')}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsActive(!isActive)}
              className={`relative h-6 w-10 rounded-full p-0 transition-colors ${
                isActive ? 'bg-primary hover:bg-primary' : 'bg-muted hover:bg-muted'
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                  isActive ? 'left-5' : 'left-1'
                }`}
              />
            </Button>
            <span className="text-foreground text-sm">{t('admin.promocodes.form.active')}</span>
          </label>

          <label className="flex cursor-pointer items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFirstPurchaseOnly(!firstPurchaseOnly)}
              className={`relative h-6 w-10 rounded-full p-0 transition-colors ${
                firstPurchaseOnly ? 'bg-primary hover:bg-primary' : 'bg-muted hover:bg-muted'
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                  firstPurchaseOnly ? 'left-5' : 'left-1'
                }`}
              />
            </Button>
            <span className="text-foreground text-sm">
              {t('admin.promocodes.form.firstPurchaseOnly')}
            </span>
          </label>
        </div>
      </Card>

      {/* Footer */}
      <Card className="space-y-3">
        {validationErrors.length > 0 && (
          <div className="border-error-500/30 bg-error-500/10 rounded-lg border p-3">
            <p className="text-error-400 mb-1 text-sm font-medium">
              {t('admin.tariffs.cannotSave')}
            </p>
            <ul className="text-error-300 list-inside list-disc space-y-1 text-xs">
              {validationErrors.map((error) => (
                <li key={error}>{t(`admin.promocodes.validation.${error}`)}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => navigate('/admin/promocodes')}>
            {t('admin.promocodes.form.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid() || isLoading}
            className="flex items-center gap-2"
          >
            {isLoading && <RefreshIcon />}
            {isLoading ? t('admin.promocodes.form.saving') : t('admin.promocodes.form.save')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
