import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminPaymentMethodsApi } from '../api/adminPaymentMethods';
import { METHOD_LABELS } from '../constants/paymentMethods';
import type { PromoGroupSimple } from '../types';
import { usePlatform } from '../platform/hooks/usePlatform';
import { createNumberInputHandler, toNumber } from '../utils/inputHelpers';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const SaveIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
);

export default function AdminPaymentMethodEdit() {
  const { t } = useTranslation();
  const { methodId } = useParams<{ methodId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();

  // Fetch payment methods
  const { data: methods, isLoading } = useQuery({
    queryKey: ['admin-payment-methods'],
    queryFn: adminPaymentMethodsApi.getAll,
  });

  // Fetch promo groups
  const { data: promoGroups = [] } = useQuery<PromoGroupSimple[]>({
    queryKey: ['admin-payment-methods-promo-groups'],
    queryFn: adminPaymentMethodsApi.getPromoGroups,
  });

  const config = methods?.find((m) => m.method_id === methodId);

  // Local state for editing
  const [isEnabled, setIsEnabled] = useState(false);
  const [customName, setCustomName] = useState('');
  const [subOptions, setSubOptions] = useState<Record<string, boolean>>({});
  const [minAmount, setMinAmount] = useState<number | ''>('');
  const [maxAmount, setMaxAmount] = useState<number | ''>('');
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'telegram' | 'email'>('all');
  const [firstTopupFilter, setFirstTopupFilter] = useState<'any' | 'yes' | 'no'>('any');
  const [promoGroupFilterMode, setPromoGroupFilterMode] = useState<'all' | 'selected'>('all');
  const [selectedPromoGroupIds, setSelectedPromoGroupIds] = useState<number[]>([]);

  // Initialize state when config loads
  useEffect(() => {
    if (config) {
      setIsEnabled(config.is_enabled);
      setCustomName(config.display_name || '');
      setSubOptions(config.sub_options || {});
      setMinAmount(config.min_amount_kopeks ?? '');
      setMaxAmount(config.max_amount_kopeks ?? '');
      setUserTypeFilter(config.user_type_filter);
      setFirstTopupFilter(config.first_topup_filter);
      setPromoGroupFilterMode(config.promo_group_filter_mode);
      setSelectedPromoGroupIds(config.allowed_promo_group_ids);
    }
  }, [config]);

  // Update method mutation
  const updateMethodMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => adminPaymentMethodsApi.update(methodId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-methods'] });
      navigate('/admin/payment-methods');
    },
  });

  const handleSave = () => {
    if (!config) return;

    const data: Record<string, unknown> = {
      is_enabled: isEnabled,
      user_type_filter: userTypeFilter,
      first_topup_filter: firstTopupFilter,
      promo_group_filter_mode: promoGroupFilterMode,
      allowed_promo_group_ids: promoGroupFilterMode === 'selected' ? selectedPromoGroupIds : [],
    };

    // Display name
    if (customName.trim()) {
      data.display_name = customName.trim();
    } else {
      data.reset_display_name = true;
    }

    // Sub-options
    if (config.available_sub_options) {
      data.sub_options = subOptions;
    }

    // Amounts
    if (minAmount !== '') {
      data.min_amount_kopeks = toNumber(minAmount) || null;
    } else {
      data.reset_min_amount = true;
    }
    if (maxAmount !== '') {
      data.max_amount_kopeks = toNumber(maxAmount) || null;
    } else {
      data.reset_max_amount = true;
    }

    updateMethodMutation.mutate(data);
  };

  const togglePromoGroup = (id: number) => {
    setSelectedPromoGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          {/* Show back button only on web, not in Telegram Mini App */}
          {!capabilities.hasBackButton && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/admin/payment-methods')}
            >
              <BackIcon />
            </Button>
          )}
          <h1 className="text-foreground text-2xl font-bold">
            {t('admin.paymentMethods.notFound', 'Payment method not found')}
          </h1>
        </div>
      </div>
    );
  }

  const displayName = config.display_name || config.default_display_name;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {/* Show back button only on web, not in Telegram Mini App */}
        {!capabilities.hasBackButton && (
          <Button variant="outline" size="icon" onClick={() => navigate('/admin/payment-methods')}>
            <BackIcon />
          </Button>
        )}
        <div>
          <h1 className="text-foreground text-2xl font-bold">{displayName}</h1>
          <p className="text-muted-foreground text-sm">
            {METHOD_LABELS[config.method_id] || config.method_id}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="space-y-6">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-foreground text-sm font-medium">
              {t('admin.paymentMethods.methodEnabled')}
            </div>
            {!config.is_provider_configured && (
              <div className="text-warning-400 mt-0.5 text-xs">
                {t('admin.paymentMethods.providerNotConfigured')}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            onClick={() => setIsEnabled(!isEnabled)}
            className={`relative h-6 w-11 rounded-full p-0 transition-colors ${
              isEnabled ? 'bg-primary hover:bg-primary' : 'bg-muted hover:bg-muted'
            }`}
          >
            <span
              className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                isEnabled ? 'left-6' : 'left-1'
              }`}
            />
          </Button>
        </div>

        {/* Display name */}
        <div>
          <label className="text-muted-foreground mb-2 block text-sm font-medium">
            {t('admin.paymentMethods.displayName')}
          </label>
          <Input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder={config.default_display_name}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            {t('admin.paymentMethods.displayNameHint')}: {config.default_display_name}
          </p>
        </div>

        {/* Sub-options */}
        {config.available_sub_options && config.available_sub_options.length > 0 && (
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.paymentMethods.subOptions')}
            </label>
            <div className="space-y-2">
              {config.available_sub_options.map((opt) => {
                const enabled = subOptions[opt.id] !== false;
                return (
                  <Button
                    key={opt.id}
                    variant="outline"
                    onClick={() => setSubOptions((prev) => ({ ...prev, [opt.id]: !enabled }))}
                    className={`flex h-auto w-full items-center justify-between rounded-xl p-3 transition-all ${
                      enabled
                        ? 'border-primary/30 bg-muted/30 text-foreground hover:bg-muted/30'
                        : 'border-border bg-background/30 text-muted-foreground hover:bg-background/30'
                    }`}
                  >
                    <span className="text-sm">{opt.name}</span>
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded ${
                        enabled ? 'bg-primary text-white' : 'border-border bg-muted border'
                      }`}
                    >
                      {enabled && <CheckIcon />}
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Min/Max amounts */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.paymentMethods.minAmount')}
            </label>
            <Input
              type="number"
              value={minAmount}
              onChange={createNumberInputHandler(setMinAmount, 0)}
              placeholder={config.default_min_amount_kopeks.toString()}
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.paymentMethods.maxAmount')}
            </label>
            <Input
              type="number"
              value={maxAmount}
              onChange={createNumberInputHandler(setMaxAmount, 0)}
              placeholder={config.default_max_amount_kopeks.toString()}
            />
          </div>
        </div>

        {/* Display conditions */}
        <div className="border-border border-t pt-3">
          <h3 className="text-foreground mb-4 text-sm font-semibold">
            {t('admin.paymentMethods.conditions')}
          </h3>

          {/* User type filter */}
          <div className="mb-4">
            <label className="text-muted-foreground mb-2 block text-sm">
              {t('admin.paymentMethods.userTypeFilter')}
            </label>
            <div className="flex gap-2">
              {(['all', 'telegram', 'email'] as const).map((val) => (
                <Button
                  key={val}
                  variant={userTypeFilter === val ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUserTypeFilter(val)}
                  className={`flex-1 rounded-xl transition-all ${
                    userTypeFilter === val
                      ? 'border-primary/40 bg-primary/20 text-primary/70 hover:bg-primary/20'
                      : 'bg-background/50 text-muted-foreground hover:border-border'
                  }`}
                >
                  {val === 'all'
                    ? t('admin.paymentMethods.userTypeAll')
                    : val === 'telegram'
                      ? 'Telegram'
                      : 'Email'}
                </Button>
              ))}
            </div>
          </div>

          {/* First topup filter */}
          <div className="mb-4">
            <label className="text-muted-foreground mb-2 block text-sm">
              {t('admin.paymentMethods.firstTopupFilter')}
            </label>
            <div className="flex gap-2">
              {(['any', 'yes', 'no'] as const).map((val) => (
                <Button
                  key={val}
                  variant={firstTopupFilter === val ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFirstTopupFilter(val)}
                  className={`flex-1 rounded-xl transition-all ${
                    firstTopupFilter === val
                      ? 'border-primary/40 bg-primary/20 text-primary/70 hover:bg-primary/20'
                      : 'bg-background/50 text-muted-foreground hover:border-border'
                  }`}
                >
                  {val === 'any'
                    ? t('admin.paymentMethods.firstTopupAny')
                    : val === 'yes'
                      ? t('admin.paymentMethods.firstTopupWas')
                      : t('admin.paymentMethods.firstTopupWasNot')}
                </Button>
              ))}
            </div>
          </div>

          {/* Promo groups filter */}
          <div>
            <label className="text-muted-foreground mb-2 block text-sm">
              {t('admin.paymentMethods.promoGroupFilter')}
            </label>
            <div className="mb-3 flex gap-2">
              {(['all', 'selected'] as const).map((val) => (
                <Button
                  key={val}
                  variant={promoGroupFilterMode === val ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPromoGroupFilterMode(val)}
                  className={`flex-1 rounded-xl transition-all ${
                    promoGroupFilterMode === val
                      ? 'border-primary/40 bg-primary/20 text-primary/70 hover:bg-primary/20'
                      : 'bg-background/50 text-muted-foreground hover:border-border'
                  }`}
                >
                  {val === 'all'
                    ? t('admin.paymentMethods.promoGroupAll')
                    : t('admin.paymentMethods.promoGroupSelected')}
                </Button>
              ))}
            </div>

            {promoGroupFilterMode === 'selected' && (
              <div className="border-border/50 bg-background/30 max-h-48 space-y-1.5 overflow-y-auto rounded-xl border p-3">
                {promoGroups.length === 0 ? (
                  <p className="text-muted-foreground py-2 text-center text-sm">
                    {t('admin.paymentMethods.noPromoGroups')}
                  </p>
                ) : (
                  promoGroups.map((group) => {
                    const selected = selectedPromoGroupIds.includes(group.id);
                    return (
                      <Button
                        key={group.id}
                        variant="ghost"
                        onClick={() => togglePromoGroup(group.id)}
                        className={`flex h-auto w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
                          selected
                            ? 'bg-primary/15 text-primary/70 hover:bg-primary/15'
                            : 'text-muted-foreground hover:bg-card/50'
                        }`}
                      >
                        <span>{group.name}</span>
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded ${
                            selected ? 'bg-primary text-white' : 'border-border border'
                          }`}
                        >
                          {selected && <CheckIcon />}
                        </div>
                      </Button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => navigate('/admin/payment-methods')}
        >
          {t('admin.paymentMethods.cancelButton')}
        </Button>
        <Button
          onClick={handleSave}
          disabled={updateMethodMutation.isPending}
          className="flex flex-1 items-center justify-center gap-2"
        >
          {updateMethodMutation.isPending ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <SaveIcon />
          )}
          {t('admin.paymentMethods.saveButton')}
        </Button>
      </div>
    </div>
  );
}
