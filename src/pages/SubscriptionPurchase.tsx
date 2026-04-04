import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { AxiosError } from 'axios';
import { subscriptionApi } from '../api/subscription';
import { promoApi } from '../api/promo';
import { WebBackButton } from '../components/WebBackButton';
import type {
  PurchaseSelection,
  PeriodOption,
  Tariff,
  TariffPeriod,
  ClassicPurchaseOptions,
} from '../types';
import InsufficientBalancePrompt from '../components/InsufficientBalancePrompt';
import { useCurrency } from '../hooks/useCurrency';
import { useCloseOnSuccessNotification } from '../store/successNotification';
import { CheckIcon } from '../components/icons';
import {
  getErrorMessage,
  getInsufficientBalanceError,
  type PurchaseStep,
} from '../utils/subscriptionHelpers';

export default function SubscriptionPurchase() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subscriptionId = searchParams.get('subscriptionId')
    ? parseInt(searchParams.get('subscriptionId')!, 10)
    : undefined;
  const { formatAmount, currencySymbol } = useCurrency();

  const formatPrice = (kopeks: number) => `${formatAmount(kopeks / 100)} ${currencySymbol}`;

  // Subscription query (shares cache with /subscription page)
  const { data: subscriptionResponse, isLoading } = useQuery({
    queryKey: ['subscription', subscriptionId],
    queryFn: () => subscriptionApi.getSubscription(subscriptionId),
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const subscription = subscriptionResponse?.subscription ?? null;

  // Purchase options
  const {
    data: purchaseOptions,
    isLoading: optionsLoading,
    isError: optionsError,
    refetch: refetchOptions,
  } = useQuery({
    queryKey: ['purchase-options', subscriptionId],
    queryFn: () => subscriptionApi.getPurchaseOptions(subscriptionId),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Active promo discount
  const { data: activeDiscount } = useQuery({
    queryKey: ['active-discount'],
    queryFn: promoApi.getActiveDiscount,
    staleTime: 30000,
  });

  // Sales mode detection
  const isTariffsMode = purchaseOptions?.sales_mode === 'tariffs';
  const classicOptions = !isTariffsMode ? (purchaseOptions as ClassicPurchaseOptions) : null;
  const tariffs =
    isTariffsMode && purchaseOptions && 'tariffs' in purchaseOptions ? purchaseOptions.tariffs : [];

  // Multi-tariff: check via subscriptions list query
  const { data: multiSubData } = useQuery({
    queryKey: ['subscriptions-list'],
    queryFn: () => subscriptionApi.getSubscriptions(),
    staleTime: 60_000,
  });
  const isMultiTariff = multiSubData?.multi_tariff_enabled ?? false;

  // Helper to apply promo discount
  const applyPromoDiscount = (
    priceKopeks: number,
    existingOriginalPrice?: number | null,
  ): {
    price: number;
    original: number | null;
    percent: number | null;
    isPromoGroup: boolean;
  } => {
    const hasExisting = (existingOriginalPrice ?? 0) > priceKopeks;
    const hasPromo = !!activeDiscount?.is_active && !!activeDiscount.discount_percent;

    if (!hasExisting && !hasPromo) {
      return { price: priceKopeks, original: null, percent: null, isPromoGroup: false };
    }

    let finalPrice = priceKopeks;
    if (hasPromo) {
      finalPrice = Math.round(priceKopeks * (1 - activeDiscount!.discount_percent! / 100));
    }

    if (hasExisting) {
      const combinedPercent = hasPromo
        ? Math.round((1 - finalPrice / existingOriginalPrice!) * 100)
        : Math.round((1 - priceKopeks / existingOriginalPrice!) * 100);
      return {
        price: finalPrice,
        original: existingOriginalPrice!,
        percent: combinedPercent,
        isPromoGroup: true,
      };
    }

    return {
      price: finalPrice,
      original: priceKopeks,
      percent: activeDiscount!.discount_percent!,
      isPromoGroup: false,
    };
  };

  // Classic mode state
  const [currentStep, setCurrentStep] = useState<PurchaseStep>('period');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption | null>(null);
  const [selectedTraffic, setSelectedTraffic] = useState<number | null>(null);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<number>(1);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);

  // Tariffs mode state
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);
  const [selectedTariffPeriod, setSelectedTariffPeriod] = useState<TariffPeriod | null>(null);
  const [showTariffPurchase, setShowTariffPurchase] = useState(false);
  const [customDays, setCustomDays] = useState<number>(30);
  const [customTrafficGb, setCustomTrafficGb] = useState<number>(50);
  const [useCustomDays, setUseCustomDays] = useState(false);
  const [useCustomTraffic, setUseCustomTraffic] = useState(false);

  // Refs for auto-scroll
  const switchModalRef = useRef<HTMLDivElement>(null);
  const tariffPurchaseRef = useRef<HTMLDivElement>(null);

  // Tariff switch
  const [switchTariffId, setSwitchTariffId] = useState<number | null>(null);

  // Auto-close all modals on success notification
  const handleCloseAllModals = () => {
    setShowPurchaseForm(false);
    setShowTariffPurchase(false);
    setSwitchTariffId(null);

    setSelectedTariff(null);
    setSelectedTariffPeriod(null);
  };
  useCloseOnSuccessNotification(handleCloseAllModals);

  // Get available servers
  const getAvailableServers = useCallback(
    (period: PeriodOption | null) => {
      if (!period?.servers.options) return [];
      return period.servers.options.filter((server) => {
        if (!server.is_available) return false;
        if (subscription?.is_trial && server.name.toLowerCase().includes('trial')) return false;
        return true;
      });
    },
    [subscription?.is_trial],
  );

  // Steps for classic mode
  const steps = useMemo<PurchaseStep[]>(() => {
    const result: PurchaseStep[] = ['period'];
    if (selectedPeriod?.traffic.selectable && (selectedPeriod.traffic.options?.length ?? 0) > 0) {
      result.push('traffic');
    }
    const availableServers = getAvailableServers(selectedPeriod);
    if (availableServers.length > 1) {
      result.push('servers');
    }
    if (selectedPeriod && selectedPeriod.devices.max > selectedPeriod.devices.min) {
      result.push('devices');
    }
    result.push('confirm');
    return result;
  }, [selectedPeriod, getAvailableServers]);

  const currentStepIndex = steps.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Initialize classic mode selection
  useEffect(() => {
    if (classicOptions && !selectedPeriod) {
      const defaultPeriod =
        classicOptions.periods.find((p) => p.id === classicOptions.selection.period_id) ||
        classicOptions.periods[0];
      setSelectedPeriod(defaultPeriod);
      setSelectedTraffic(classicOptions.selection.traffic_value);
      const availableServers = getAvailableServers(defaultPeriod);
      const availableServerUuids = new Set(availableServers.map((s) => s.uuid));
      if (availableServers.length === 1) {
        setSelectedServers([availableServers[0].uuid]);
      } else {
        setSelectedServers(
          classicOptions.selection.servers.filter((uuid) => availableServerUuids.has(uuid)),
        );
      }
      setSelectedDevices(classicOptions.selection.devices);
    }
  }, [classicOptions, selectedPeriod, getAvailableServers]);

  // Build classic mode selection
  const currentSelection: PurchaseSelection = useMemo(
    () => ({
      period_id: selectedPeriod?.id,
      period_days: selectedPeriod?.period_days,
      traffic_value: selectedTraffic ?? undefined,
      servers: selectedServers,
      devices: selectedDevices,
    }),
    [selectedPeriod, selectedTraffic, selectedServers, selectedDevices],
  );

  // Preview query (classic)
  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['purchase-preview', currentSelection],
    queryFn: () => subscriptionApi.previewPurchase(currentSelection, subscriptionId),
    enabled: !!selectedPeriod && showPurchaseForm && currentStep === 'confirm',
  });

  // Classic purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: () => subscriptionApi.submitPurchase(currentSelection, subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      navigate('/subscriptions', { replace: true });
    },
  });

  // Switch preview query
  const { data: switchPreview, isLoading: switchPreviewLoading } = useQuery({
    queryKey: ['tariff-switch-preview', switchTariffId],
    queryFn: () => subscriptionApi.previewTariffSwitch(switchTariffId!, subscriptionId),
    enabled: !!switchTariffId,
  });

  // Tariff switch mutation
  const switchTariffMutation = useMutation({
    mutationFn: (tariffId: number) => subscriptionApi.switchTariff(tariffId, subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options', subscriptionId] });
      setSwitchTariffId(null);

      navigate('/subscriptions', { replace: true });
    },
    onError: (error: unknown) => {
      if (error instanceof AxiosError) {
        const detail = error.response?.data?.detail;
        if (
          typeof detail === 'object' &&
          detail?.error_code === 'subscription_expired' &&
          detail?.use_purchase_flow === true
        ) {
          const targetTariff = tariffs.find((tariff) => tariff.id === switchTariffId);
          if (targetTariff) {
            setSwitchTariffId(null);

            setSelectedTariff(targetTariff);
            setSelectedTariffPeriod(targetTariff.periods[0] || null);
            setShowTariffPurchase(true);
            queryClient.invalidateQueries({ queryKey: ['purchase-options', subscriptionId] });
          }
        }
      }
    },
  });

  // Tariff purchase mutation
  const tariffPurchaseMutation = useMutation({
    mutationFn: () => {
      if (!selectedTariff) {
        throw new Error('Tariff not selected');
      }
      const isDailyTariff =
        selectedTariff.is_daily ||
        (selectedTariff.daily_price_kopeks && selectedTariff.daily_price_kopeks > 0);
      const days = isDailyTariff
        ? 1
        : useCustomDays
          ? customDays
          : selectedTariffPeriod?.days || 30;
      const trafficGb =
        useCustomTraffic && selectedTariff.custom_traffic_enabled ? customTrafficGb : undefined;
      return subscriptionApi.purchaseTariff(selectedTariff.id, days, trafficGb);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      navigate('/subscriptions', { replace: true });
    },
  });

  // Auto-scroll effects
  useEffect(() => {
    if (switchTariffId && switchModalRef.current) {
      const timer = setTimeout(() => {
        switchModalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [switchTariffId]);

  useEffect(() => {
    if (showTariffPurchase && tariffPurchaseRef.current) {
      const timer = setTimeout(() => {
        tariffPurchaseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showTariffPurchase]);

  // Classic mode helpers
  const toggleServer = (uuid: string) => {
    if (selectedServers.includes(uuid)) {
      if (selectedServers.length > 1) {
        setSelectedServers(selectedServers.filter((s) => s !== uuid));
      }
    } else {
      setSelectedServers([...selectedServers, uuid]);
    }
  };

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const resetPurchase = () => {
    setShowPurchaseForm(false);
    setCurrentStep('period');
  };

  const getStepLabel = (step: PurchaseStep) => {
    switch (step) {
      case 'period':
        return t('subscription.stepPeriod');
      case 'traffic':
        return t('subscription.stepTraffic');
      case 'servers':
        return t('subscription.stepServers');
      case 'devices':
        return t('subscription.stepDevices');
      case 'confirm':
        return t('subscription.stepConfirm');
    }
  };

  if (isLoading || optionsLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="border-primary h-10 w-10 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (optionsError || (!purchaseOptions && !optionsLoading)) {
    return (
      <div className="space-y-6">
        <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
          {t('subscription.extend')}
        </h1>
        <div className="border-border bg-card rounded-3xl border p-6 text-center">
          <p className="text-muted-foreground mb-4">
            {t('subscription.loadError', 'Не удалось загрузить варианты подписки')}
          </p>
          <Button onClick={() => refetchOptions()}>{t('common.retry')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <WebBackButton
          to={subscriptionId ? `/subscriptions/${subscriptionId}` : '/subscriptions'}
        />
        <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
          {isMultiTariff && !subscriptionId
            ? t('subscription.newTariff', 'Новый тариф')
            : !isMultiTariff && subscription?.is_daily && !subscription?.is_trial
              ? t('subscription.switchTariff.title')
              : subscription && !subscription.is_trial
                ? t('subscription.extend')
                : t('subscription.getSubscription')}
        </h1>
      </div>

      {/* Tariffs Section */}
      {isTariffsMode && tariffs.length > 0 && (
        <div className="border-border bg-card relative overflow-hidden rounded-3xl border px-7 py-6 shadow-sm">
          {/* Trial upgrade prompt — hidden when expired banner is active */}
          {subscription?.is_trial &&
            !(
              isTariffsMode &&
              purchaseOptions &&
              'subscription_is_expired' in purchaseOptions &&
              purchaseOptions.subscription_is_expired
            ) && (
              <div
                className="mb-6 rounded-[14px] p-4"
                style={{
                  background:
                    'linear-gradient(135deg, color-mix(in srgb, var(--color-warning-400) 8%, transparent), color-mix(in srgb, var(--primary) 6%, transparent))',
                  border: '1px solid color-mix(in srgb, var(--color-warning-400) 15%, transparent)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                    style={{
                      background: 'color-mix(in srgb, var(--color-warning-400) 12%, transparent)',
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-warning-400)"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div
                      className="text-sm font-semibold"
                      style={{ color: 'var(--color-warning-400)' }}
                    >
                      {t('subscription.trialUpgrade.title')}
                    </div>
                    <div className="text-foreground/40 mt-1 text-xs">
                      {t('subscription.trialUpgrade.description')}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Expired subscription notice */}
          {isTariffsMode &&
            purchaseOptions &&
            'subscription_is_expired' in purchaseOptions &&
            purchaseOptions.subscription_is_expired && (
              <div
                className="mb-6 rounded-[14px] p-4"
                style={{
                  background:
                    'linear-gradient(135deg, color-mix(in srgb, var(--color-error-400) 8%, transparent), color-mix(in srgb, var(--color-warning-400) 6%, transparent))',
                  border: '1px solid color-mix(in srgb, var(--color-error-400) 15%, transparent)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                    style={{
                      background: 'color-mix(in srgb, var(--color-error-400) 12%, transparent)',
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-error-400)"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div
                      className="text-sm font-semibold"
                      style={{ color: 'var(--color-error-400)' }}
                    >
                      {t('subscription.expiredBanner.title')}
                    </div>
                    <div className="text-foreground/40 mt-1 text-xs">
                      {t('subscription.expiredBanner.selectTariff')}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Legacy subscription notice */}
          {subscription && !subscription.is_trial && !subscription.tariff_id && (
            <div className="border-primary/30 bg-primary/10 mb-6 rounded-xl border p-4">
              <div className="text-primary mb-2 font-medium">
                {t('subscription.legacy.selectTariffTitle')}
              </div>
              <div className="text-muted-foreground text-sm">
                {t('subscription.legacy.selectTariffDescription')}
              </div>
              <div className="text-muted-foreground mt-2 text-xs">
                {t('subscription.legacy.currentSubContinues')}
              </div>
            </div>
          )}

          {/* Switch Tariff Preview Modal */}
          {switchTariffId && (
            <div ref={switchModalRef} className="bg-card/50 mb-6 space-y-4 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-foreground font-medium">
                  {t('subscription.switchTariff.title')}
                </h3>
                <Button
                  onClick={() => setSwitchTariffId(null)}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </Button>
              </div>

              {switchPreviewLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
                </div>
              ) : (
                switchPreview &&
                (() => {
                  const targetTariff = tariffs.find((tariff) => tariff.id === switchTariffId);
                  const dailyPrice =
                    targetTariff?.daily_price_kopeks ?? targetTariff?.price_per_day_kopeks ?? 0;
                  const isDailyTariff = dailyPrice > 0;

                  return (
                    <>
                      <div className="space-y-2 text-sm">
                        <div className="text-muted-foreground flex justify-between">
                          <span>{t('subscription.switchTariff.currentTariff')}</span>
                          <span className="text-foreground font-medium">
                            {switchPreview.current_tariff_name || '-'}
                          </span>
                        </div>
                        <div className="text-muted-foreground flex justify-between">
                          <span>{t('subscription.switchTariff.newTariff')}</span>
                          <span className="text-primary font-medium">
                            {switchPreview.new_tariff_name}
                          </span>
                        </div>
                        <div className="text-muted-foreground flex justify-between">
                          <span>{t('subscription.switchTariff.remainingDays')}</span>
                          <span>{switchPreview.remaining_days}</span>
                        </div>
                      </div>

                      {isDailyTariff && (
                        <div className="border-primary/30 bg-primary/10 rounded-lg border p-3 text-center">
                          <div className="text-muted-foreground text-sm">
                            {t('subscription.switchTariff.dailyPayment')}
                          </div>
                          <div className="text-primary text-lg font-bold">
                            {formatPrice(dailyPrice)}
                          </div>
                          <div className="text-muted-foreground mt-1 text-xs">
                            {t('subscription.switchTariff.dailyChargeDescription')}
                          </div>
                        </div>
                      )}

                      <div className="border-border/50 flex items-center justify-between border-t pt-3">
                        <div>
                          <span className="text-foreground font-medium">
                            {t('subscription.switchTariff.upgradeCost')}
                          </span>
                          {switchPreview.discount_percent && switchPreview.discount_percent > 0 && (
                            <span className="bg-success-500/20 text-success-400 ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium">
                              -{switchPreview.discount_percent}%
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          {switchPreview.discount_percent &&
                            switchPreview.discount_percent > 0 &&
                            switchPreview.base_upgrade_cost_kopeks &&
                            switchPreview.base_upgrade_cost_kopeks > 0 && (
                              <span className="text-muted-foreground mr-2 text-sm line-through">
                                {formatPrice(switchPreview.base_upgrade_cost_kopeks)}
                              </span>
                            )}
                          <span
                            className={`text-lg font-bold ${switchPreview.upgrade_cost_kopeks === 0 ? 'text-success-400' : 'text-primary'}`}
                          >
                            {switchPreview.upgrade_cost_kopeks > 0
                              ? switchPreview.upgrade_cost_label
                              : t('subscription.switchTariff.free')}
                          </span>
                        </div>
                      </div>

                      {!switchPreview.has_enough_balance &&
                        switchPreview.upgrade_cost_kopeks > 0 && (
                          <InsufficientBalancePrompt
                            missingAmountKopeks={switchPreview.missing_amount_kopeks}
                            compact
                          />
                        )}

                      <Button
                        onClick={() => switchTariffMutation.mutate(switchTariffId)}
                        disabled={switchTariffMutation.isPending || !switchPreview.can_switch}
                        className="w-full"
                      >
                        {switchTariffMutation.isPending ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          </span>
                        ) : (
                          t('subscription.switchTariff.switch')
                        )}
                      </Button>

                      {switchTariffMutation.isError &&
                        (() => {
                          const detail =
                            switchTariffMutation.error instanceof AxiosError
                              ? switchTariffMutation.error.response?.data?.detail
                              : null;
                          if (
                            typeof detail === 'object' &&
                            detail?.error_code === 'subscription_expired'
                          ) {
                            return null;
                          }
                          return (
                            <div className="text-error-400 mt-3 text-center text-sm">
                              {getErrorMessage(switchTariffMutation.error)}
                            </div>
                          );
                        })()}
                    </>
                  );
                })()
              )}
            </div>
          )}

          {!showTariffPurchase ? (
            <>
              {/* Promo group discount banner */}
              {tariffs.some((tariff) => tariff.promo_group_name) && (
                <div className="border-success-500/30 bg-success-500/10 mb-4 flex items-center gap-3 rounded-xl border p-3">
                  <div className="bg-success-500/20 text-success-400 flex h-8 w-8 items-center justify-center rounded-lg">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-success-400 text-sm font-medium">
                      {t('subscription.promoGroup.yourGroup', {
                        name: tariffs.find((tariff) => tariff.promo_group_name)?.promo_group_name,
                      })}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {t('subscription.promoGroup.personalDiscountsApplied')}
                    </div>
                  </div>
                </div>
              )}

              {/* Tariff Grid */}
              {isMultiTariff &&
                purchaseOptions &&
                'all_tariffs_purchased' in purchaseOptions &&
                purchaseOptions.all_tariffs_purchased && (
                  <div className="border-border bg-card rounded-2xl border p-6 text-center">
                    <div className="mb-2 text-3xl">✅</div>
                    <h3 className="text-foreground mb-1 text-lg font-semibold">
                      {t('subscription.allTariffsPurchased', 'Все тарифы подключены')}
                    </h3>
                    <p className="text-muted-foreground mb-4 text-sm">
                      {t(
                        'subscription.allTariffsPurchasedDesc',
                        'Вы уже приобрели все доступные тарифы. Продлить подписку можно на странице тарифа.',
                      )}
                    </p>
                    <Button onClick={() => navigate('/subscriptions')}>
                      {t('subscription.backToList', 'Мои подписки')}
                    </Button>
                  </div>
                )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[...tariffs]
                  .filter((tariff) => {
                    // In multi-tariff mode: hide already purchased tariffs
                    if (isMultiTariff && tariff.is_purchased) return false;
                    if (subscription?.is_trial && tariff.name.toLowerCase().includes('trial')) {
                      return false;
                    }
                    return true;
                  })
                  .sort((a, b) => {
                    const aIsCurrent = a.is_current || a.id === subscription?.tariff_id;
                    const bIsCurrent = b.is_current || b.id === subscription?.tariff_id;
                    if (aIsCurrent && !bIsCurrent) return -1;
                    if (!aIsCurrent && bIsCurrent) return 1;
                    return 0;
                  })
                  .map((tariff) => {
                    const isCurrentTariff =
                      tariff.is_current || tariff.id === subscription?.tariff_id;
                    const isSubscriptionExpired =
                      isTariffsMode &&
                      purchaseOptions &&
                      'subscription_is_expired' in purchaseOptions &&
                      purchaseOptions.subscription_is_expired === true;
                    const canSwitch =
                      !isMultiTariff &&
                      subscription &&
                      subscription.tariff_id &&
                      !isCurrentTariff &&
                      !subscription.is_trial &&
                      !isSubscriptionExpired &&
                      subscription.is_active;
                    const isLegacySubscription =
                      subscription && !subscription.is_trial && !subscription.tariff_id;

                    return (
                      <div
                        key={tariff.id}
                        className={`bento-card-hover p-5 text-left transition-all ${
                          isCurrentTariff ? 'bento-card-glow border-primary' : ''
                        }`}
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <div>
                            <div className="text-foreground text-lg font-semibold">
                              {tariff.name}
                            </div>
                            {tariff.description && (
                              <div className="text-muted-foreground mt-1 text-sm whitespace-pre-line">
                                {tariff.description}
                              </div>
                            )}
                          </div>
                          {isCurrentTariff && (
                            <span className="badge-success text-xs">
                              {t('subscription.currentTariff')}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <svg
                              className="text-primary h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                              />
                            </svg>
                            <span className="text-foreground font-medium">
                              {tariff.traffic_limit_label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <svg
                              className="text-muted-foreground h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                              />
                            </svg>
                            <span className="text-muted-foreground">
                              {tariff.device_limit === 0
                                ? '∞'
                                : t('subscription.devices', { count: tariff.device_limit })}
                            </span>
                          </div>
                          {tariff.traffic_reset_mode &&
                            tariff.traffic_reset_mode !== 'NO_RESET' && (
                              <div className="flex items-center gap-1.5">
                                <svg
                                  className="text-muted-foreground h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={1.5}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182"
                                  />
                                </svg>
                                <span className="text-muted-foreground">
                                  {t(`subscription.trafficReset.${tariff.traffic_reset_mode}`)}
                                </span>
                              </div>
                            )}
                        </div>
                        {/* Price info */}
                        <div className="border-border/50 text-muted-foreground mt-3 border-t pt-3 text-sm">
                          {(() => {
                            const dailyPrice =
                              tariff.daily_price_kopeks ?? tariff.price_per_day_kopeks ?? 0;
                            const originalDailyPrice = tariff.original_daily_price_kopeks || 0;
                            if (dailyPrice > 0) {
                              const promoDaily = applyPromoDiscount(
                                dailyPrice,
                                originalDailyPrice > dailyPrice ? originalDailyPrice : undefined,
                              );
                              return (
                                <span className="flex items-center gap-2">
                                  <span className="text-primary font-medium">
                                    {formatPrice(promoDaily.price)}
                                  </span>
                                  {promoDaily.original &&
                                    promoDaily.original > promoDaily.price && (
                                      <span className="text-muted-foreground text-xs line-through">
                                        {formatPrice(promoDaily.original)}
                                      </span>
                                    )}
                                  <span>{t('subscription.tariff.perDay')}</span>
                                  {promoDaily.percent && promoDaily.percent > 0 && (
                                    <span
                                      className={`rounded px-1.5 py-0.5 text-xs ${
                                        promoDaily.isPromoGroup
                                          ? 'bg-success-500/20 text-success-400'
                                          : 'bg-orange-500/20 text-orange-400'
                                      }`}
                                    >
                                      -{promoDaily.percent}%
                                    </span>
                                  )}
                                </span>
                              );
                            }
                            if (tariff.periods.length > 0) {
                              const firstPeriod = tariff.periods[0];
                              const promoPeriod = applyPromoDiscount(
                                firstPeriod?.price_kopeks || 0,
                                firstPeriod?.original_price_kopeks,
                              );
                              return (
                                <span className="flex flex-wrap items-center gap-2">
                                  <span>{t('subscription.from')}</span>
                                  <span className="text-primary font-medium">
                                    {formatPrice(promoPeriod.price)}
                                  </span>
                                  {promoPeriod.original &&
                                    promoPeriod.original > promoPeriod.price && (
                                      <span className="text-muted-foreground text-xs line-through">
                                        {formatPrice(promoPeriod.original)}
                                      </span>
                                    )}
                                  {promoPeriod.percent && promoPeriod.percent > 0 && (
                                    <span
                                      className={`rounded px-1.5 py-0.5 text-xs ${
                                        promoPeriod.isPromoGroup
                                          ? 'bg-success-500/20 text-success-400'
                                          : 'bg-orange-500/20 text-orange-400'
                                      }`}
                                    >
                                      -{promoPeriod.percent}%
                                    </span>
                                  )}
                                </span>
                              );
                            }
                            return (
                              <span className="text-primary font-medium">
                                {t('subscription.tariff.flexiblePayment')}
                              </span>
                            );
                          })()}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 flex gap-2">
                          {isCurrentTariff ? (
                            subscription?.is_daily ? (
                              <div className="text-muted-foreground flex-1 py-2 text-center text-sm">
                                {t('subscription.currentTariff')}
                              </div>
                            ) : (
                              <Button
                                onClick={() => {
                                  setSelectedTariff(tariff);
                                  setSelectedTariffPeriod(tariff.periods[0] || null);
                                  setShowTariffPurchase(true);
                                }}
                                className="flex-1"
                                size="sm"
                              >
                                {t('subscription.extend')}
                              </Button>
                            )
                          ) : isLegacySubscription ? (
                            <Button
                              onClick={() => {
                                setSelectedTariff(tariff);
                                setSelectedTariffPeriod(tariff.periods[0] || null);
                                setShowTariffPurchase(true);
                              }}
                              className="flex-1"
                              size="sm"
                            >
                              {t('subscription.tariff.selectForRenewal')}
                            </Button>
                          ) : canSwitch ? (
                            <Button
                              variant="secondary"
                              onClick={() => setSwitchTariffId(tariff.id)}
                              className="flex-1"
                              size="sm"
                            >
                              {t('subscription.switchTariff.switch')}
                            </Button>
                          ) : (
                            <Button
                              onClick={() => {
                                setSelectedTariff(tariff);
                                setSelectedTariffPeriod(tariff.periods[0] || null);
                                setShowTariffPurchase(true);
                              }}
                              className="flex-1"
                              size="sm"
                            >
                              {t('subscription.purchase')}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          ) : (
            selectedTariff && (
              /* Tariff Purchase Form */
              <div ref={tariffPurchaseRef} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-foreground text-lg font-medium">{selectedTariff.name}</h3>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowTariffPurchase(false);
                      setSelectedTariff(null);
                      setSelectedTariffPeriod(null);
                    }}
                  >
                    ← {t('common.back')}
                  </Button>
                </div>

                {/* Tariff Info */}
                <div className="bg-card/50 rounded-xl p-4">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('subscription.traffic')}:</span>
                      <span className="text-foreground ml-2">
                        {selectedTariff.traffic_limit_label}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('subscription.devices')}:</span>
                      <span className="text-foreground ml-2">
                        {selectedTariff.device_limit === 0 ? '∞' : selectedTariff.device_limit}
                        {selectedTariff.extra_devices_count > 0 && (
                          <span className="text-primary ml-1 text-xs">
                            (+{selectedTariff.extra_devices_count})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Daily Tariff Purchase */}
                {selectedTariff.is_daily ||
                (selectedTariff.daily_price_kopeks && selectedTariff.daily_price_kopeks > 0) ? (
                  <div className="border-primary/30 bg-primary/10 rounded-xl border p-5">
                    <div className="mb-4 text-center">
                      <div className="text-muted-foreground mb-2 text-sm">
                        {t('subscription.dailyPurchase.costPerDay')}
                      </div>
                      <div className="text-primary text-3xl font-bold">
                        {formatPrice(selectedTariff.daily_price_kopeks || 0)}
                      </div>
                    </div>
                    <div className="text-muted-foreground space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{t('subscription.dailyPurchase.chargedDaily')}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{t('subscription.dailyPurchase.canPause')}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{t('subscription.dailyPurchase.pausedOnLowBalance')}</span>
                      </div>
                    </div>

                    {(() => {
                      const dailyPrice = selectedTariff.daily_price_kopeks || 0;
                      const hasEnoughBalance =
                        purchaseOptions && dailyPrice <= purchaseOptions.balance_kopeks;

                      return (
                        <div className="mt-6">
                          {purchaseOptions && !hasEnoughBalance && (
                            <InsufficientBalancePrompt
                              missingAmountKopeks={dailyPrice - purchaseOptions.balance_kopeks}
                              compact
                              className="mb-4"
                            />
                          )}

                          <Button
                            onClick={() => tariffPurchaseMutation.mutate()}
                            disabled={tariffPurchaseMutation.isPending}
                            className="w-full"
                          >
                            {tariffPurchaseMutation.isPending ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                {t('common.loading')}
                              </span>
                            ) : (
                              t('subscription.dailyPurchase.activate', {
                                price: formatPrice(dailyPrice),
                              })
                            )}
                          </Button>

                          {tariffPurchaseMutation.isError &&
                            !getInsufficientBalanceError(tariffPurchaseMutation.error) && (
                              <div className="text-error-400 mt-3 text-center text-sm">
                                {getErrorMessage(tariffPurchaseMutation.error)}
                              </div>
                            )}
                          {tariffPurchaseMutation.isError &&
                            getInsufficientBalanceError(tariffPurchaseMutation.error) && (
                              <div className="mt-3">
                                <InsufficientBalancePrompt
                                  missingAmountKopeks={
                                    getInsufficientBalanceError(tariffPurchaseMutation.error)
                                      ?.missingAmount ||
                                    dailyPrice - (purchaseOptions?.balance_kopeks || 0)
                                  }
                                  compact
                                />
                              </div>
                            )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <>
                    {/* Period Selection for non-daily tariffs */}
                    <div>
                      <div className="text-muted-foreground mb-3 text-sm">
                        {t('subscription.selectPeriod')}
                      </div>

                      {selectedTariff.periods.length > 0 && !useCustomDays && (
                        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {selectedTariff.periods.map((period) => {
                            const promoPeriod = applyPromoDiscount(
                              period.price_kopeks,
                              period.original_price_kopeks,
                            );
                            const displayDiscount = promoPeriod.percent;
                            const displayOriginal = promoPeriod.original;
                            const displayPrice = promoPeriod.price;
                            const displayPerMonth =
                              displayPrice !== period.price_kopeks
                                ? Math.round(displayPrice / Math.max(1, period.days / 30))
                                : period.price_per_month_kopeks;

                            return (
                              <Button
                                key={period.days}
                                onClick={() => {
                                  setSelectedTariffPeriod(period);
                                  setUseCustomDays(false);
                                }}
                                variant="ghost"
                                className={`relative h-auto flex-col items-start rounded-xl border p-4 text-left transition-all ${
                                  selectedTariffPeriod?.days === period.days && !useCustomDays
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border/50 bg-card/50 hover:border-border'
                                }`}
                              >
                                {displayDiscount && displayDiscount > 0 && (
                                  <div
                                    className={`absolute -top-2 -right-2 rounded-full px-2 py-0.5 text-xs font-medium text-white ${
                                      promoPeriod.isPromoGroup ? 'bg-success-500' : 'bg-orange-500'
                                    }`}
                                  >
                                    -{displayDiscount}%
                                  </div>
                                )}
                                <div className="text-foreground text-lg font-semibold">
                                  {period.label}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-primary font-medium">
                                    {formatPrice(displayPrice)}
                                  </span>
                                  {displayOriginal && displayOriginal > displayPrice && (
                                    <span className="text-muted-foreground text-sm line-through">
                                      {formatPrice(displayOriginal)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-muted-foreground mt-1 text-xs">
                                  {formatPrice(displayPerMonth)}/{t('subscription.month')}
                                </div>
                              </Button>
                            );
                          })}
                        </div>
                      )}

                      {/* No periods available fallback */}
                      {selectedTariff.periods.length === 0 &&
                        !useCustomDays &&
                        !(
                          selectedTariff.custom_days_enabled &&
                          (selectedTariff.price_per_day_kopeks ?? 0) > 0
                        ) && (
                          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
                            <div className="mb-2 text-sm font-medium text-amber-400">
                              {t('subscription.noPeriodsAvailable')}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {t('subscription.noPeriodsAvailableHint')}
                            </div>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setShowTariffPurchase(false);
                                setSelectedTariff(null);
                                setSelectedTariffPeriod(null);
                              }}
                              className="mt-3"
                              size="sm"
                            >
                              {t('subscription.chooseDifferentTariff')}
                            </Button>
                          </div>
                        )}

                      {/* Custom days option */}
                      {selectedTariff.custom_days_enabled &&
                        (selectedTariff.price_per_day_kopeks ?? 0) > 0 && (
                          <div className="border-border/50 bg-card/50 rounded-xl border p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-foreground font-medium">
                                {t('subscription.customDays.title')}
                              </span>
                              <Button
                                type="button"
                                onClick={() => setUseCustomDays(!useCustomDays)}
                                variant="ghost"
                                className={`relative h-6 w-10 rounded-full p-0 transition-colors ${
                                  useCustomDays
                                    ? 'bg-primary hover:bg-primary'
                                    : 'bg-muted hover:bg-muted'
                                }`}
                              >
                                <span
                                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                                    useCustomDays ? 'left-5' : 'left-1'
                                  }`}
                                />
                              </Button>
                            </div>
                            {useCustomDays && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-4">
                                  <input
                                    type="range"
                                    min={selectedTariff.min_days ?? 1}
                                    max={selectedTariff.max_days ?? 365}
                                    value={customDays}
                                    onChange={(e) => setCustomDays(parseInt(e.target.value))}
                                    className="accent-accent-500 flex-1"
                                  />
                                  <input
                                    type="number"
                                    value={customDays}
                                    min={selectedTariff.min_days ?? 1}
                                    max={selectedTariff.max_days ?? 365}
                                    onChange={(e) =>
                                      setCustomDays(
                                        Math.max(
                                          selectedTariff.min_days ?? 1,
                                          Math.min(
                                            selectedTariff.max_days ?? 365,
                                            parseInt(e.target.value) ||
                                              (selectedTariff.min_days ?? 1),
                                          ),
                                        ),
                                      )
                                    }
                                    className="border-border bg-muted text-foreground w-20 rounded-lg border px-3 py-2 text-center"
                                  />
                                </div>
                                {(() => {
                                  const basePrice =
                                    customDays * (selectedTariff.price_per_day_kopeks ?? 0);
                                  const existingOriginal =
                                    selectedTariff.original_price_per_day_kopeks &&
                                    selectedTariff.original_price_per_day_kopeks >
                                      (selectedTariff.price_per_day_kopeks ?? 0)
                                      ? customDays * selectedTariff.original_price_per_day_kopeks
                                      : undefined;
                                  const promoCustom = applyPromoDiscount(
                                    basePrice,
                                    existingOriginal,
                                  );
                                  return (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">
                                        {t('subscription.days', { count: customDays })} ×{' '}
                                        {formatPrice(selectedTariff.price_per_day_kopeks ?? 0)}/
                                        {t('subscription.customDays.perDay')}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-primary font-medium">
                                          {formatPrice(promoCustom.price)}
                                        </span>
                                        {promoCustom.original &&
                                          promoCustom.original > promoCustom.price && (
                                            <>
                                              <span className="text-muted-foreground text-xs line-through">
                                                {formatPrice(promoCustom.original)}
                                              </span>
                                              <span
                                                className={`rounded px-1.5 py-0.5 text-xs ${
                                                  promoCustom.isPromoGroup
                                                    ? 'bg-success-500/20 text-success-400'
                                                    : 'bg-orange-500/20 text-orange-400'
                                                }`}
                                              >
                                                -{promoCustom.percent}%
                                              </span>
                                            </>
                                          )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                    </div>

                    {/* Custom traffic option */}
                    {selectedTariff.custom_traffic_enabled &&
                      (selectedTariff.traffic_price_per_gb_kopeks ?? 0) > 0 && (
                        <div>
                          <div className="text-muted-foreground mb-3 text-sm">
                            {t('subscription.customTraffic.label')}
                          </div>
                          <div className="border-border/50 bg-card/50 rounded-xl border p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-foreground font-medium">
                                {t('subscription.customTraffic.selectVolume')}
                              </span>
                              <Button
                                type="button"
                                onClick={() => setUseCustomTraffic(!useCustomTraffic)}
                                variant="ghost"
                                className={`relative h-6 w-10 rounded-full p-0 transition-colors ${
                                  useCustomTraffic
                                    ? 'bg-primary hover:bg-primary'
                                    : 'bg-muted hover:bg-muted'
                                }`}
                              >
                                <span
                                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                                    useCustomTraffic ? 'left-5' : 'left-1'
                                  }`}
                                />
                              </Button>
                            </div>
                            {!useCustomTraffic && (
                              <div className="text-muted-foreground text-sm">
                                {t('subscription.customTraffic.default', {
                                  label: selectedTariff.traffic_limit_label,
                                })}
                              </div>
                            )}
                            {useCustomTraffic && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-4">
                                  <input
                                    type="range"
                                    min={selectedTariff.min_traffic_gb ?? 1}
                                    max={selectedTariff.max_traffic_gb ?? 1000}
                                    value={customTrafficGb}
                                    onChange={(e) => setCustomTrafficGb(parseInt(e.target.value))}
                                    className="accent-accent-500 flex-1"
                                  />
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      value={customTrafficGb}
                                      min={selectedTariff.min_traffic_gb ?? 1}
                                      max={selectedTariff.max_traffic_gb ?? 1000}
                                      onChange={(e) =>
                                        setCustomTrafficGb(
                                          Math.max(
                                            selectedTariff.min_traffic_gb ?? 1,
                                            Math.min(
                                              selectedTariff.max_traffic_gb ?? 1000,
                                              parseInt(e.target.value) ||
                                                (selectedTariff.min_traffic_gb ?? 1),
                                            ),
                                          ),
                                        )
                                      }
                                      className="border-border bg-muted text-foreground w-20 rounded-lg border px-3 py-2 text-center"
                                    />
                                    <span className="text-muted-foreground">
                                      {t('common.units.gb')}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    {customTrafficGb} {t('common.units.gb')} ×{' '}
                                    {formatPrice(selectedTariff.traffic_price_per_gb_kopeks ?? 0)}/
                                    {t('common.units.gb')}
                                  </span>
                                  <span className="text-primary font-medium">
                                    +
                                    {formatPrice(
                                      customTrafficGb *
                                        (selectedTariff.traffic_price_per_gb_kopeks ?? 0),
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Summary & Purchase */}
                    {(selectedTariffPeriod || useCustomDays) && (
                      <div className="bg-card/50 rounded-xl p-5">
                        {(() => {
                          const basePeriodPrice = useCustomDays
                            ? customDays * (selectedTariff.price_per_day_kopeks ?? 0)
                            : selectedTariffPeriod?.price_kopeks || 0;
                          const existingPeriodOriginal = useCustomDays
                            ? selectedTariff.original_price_per_day_kopeks &&
                              selectedTariff.original_price_per_day_kopeks >
                                (selectedTariff.price_per_day_kopeks ?? 0)
                              ? customDays * selectedTariff.original_price_per_day_kopeks
                              : undefined
                            : selectedTariffPeriod?.original_price_kopeks &&
                                selectedTariffPeriod.original_price_kopeks >
                                  selectedTariffPeriod.price_kopeks
                              ? selectedTariffPeriod.original_price_kopeks
                              : undefined;
                          const promoPeriod = applyPromoDiscount(
                            basePeriodPrice,
                            existingPeriodOriginal,
                          );

                          const trafficPrice =
                            useCustomTraffic && selectedTariff.custom_traffic_enabled
                              ? customTrafficGb * (selectedTariff.traffic_price_per_gb_kopeks ?? 0)
                              : 0;

                          const totalPrice = promoPeriod.price + trafficPrice;
                          const originalTotal = promoPeriod.original
                            ? promoPeriod.original + trafficPrice
                            : null;

                          return (
                            <>
                              <div className="mb-4 space-y-2">
                                {useCustomDays ? (
                                  <div className="text-muted-foreground flex justify-between text-sm">
                                    <span>
                                      {t('subscription.stepPeriod')}:{' '}
                                      {t('subscription.days', { count: customDays })}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span>{formatPrice(promoPeriod.price)}</span>
                                      {promoPeriod.original &&
                                        promoPeriod.original > promoPeriod.price && (
                                          <span className="text-muted-foreground text-xs line-through">
                                            {formatPrice(promoPeriod.original)}
                                          </span>
                                        )}
                                    </div>
                                  </div>
                                ) : (
                                  selectedTariffPeriod && (
                                    <>
                                      {(selectedTariffPeriod.extra_devices_count ?? 0) > 0 &&
                                      selectedTariffPeriod.base_tariff_price_kopeks ? (
                                        <>
                                          <div className="text-muted-foreground flex justify-between text-sm">
                                            <span>
                                              {t('subscription.baseTariff')}:{' '}
                                              {selectedTariffPeriod.label}
                                            </span>
                                            <span>
                                              {formatPrice(
                                                selectedTariffPeriod.base_tariff_price_kopeks,
                                              )}
                                            </span>
                                          </div>
                                          <div className="text-muted-foreground flex justify-between text-sm">
                                            <span>
                                              {t('subscription.extraDevices')} (
                                              {selectedTariffPeriod.extra_devices_count})
                                            </span>
                                            <span>
                                              +
                                              {formatPrice(
                                                selectedTariffPeriod.extra_devices_cost_kopeks ?? 0,
                                              )}
                                            </span>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="text-muted-foreground flex justify-between text-sm">
                                          <span>
                                            {t('subscription.summary.period', {
                                              label: selectedTariffPeriod.label,
                                            })}
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <span>{formatPrice(promoPeriod.price)}</span>
                                            {promoPeriod.original &&
                                              promoPeriod.original > promoPeriod.price && (
                                                <span className="text-muted-foreground text-xs line-through">
                                                  {formatPrice(promoPeriod.original)}
                                                </span>
                                              )}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )
                                )}
                                {useCustomTraffic && selectedTariff.custom_traffic_enabled && (
                                  <div className="text-muted-foreground flex justify-between text-sm">
                                    <span>
                                      {t('subscription.summary.traffic', { gb: customTrafficGb })}
                                    </span>
                                    <span>+{formatPrice(trafficPrice)}</span>
                                  </div>
                                )}
                              </div>

                              {promoPeriod.percent && (
                                <div className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 p-2">
                                  <span className="text-sm font-medium text-orange-400">
                                    {t('promo.discountApplied')} -{promoPeriod.percent}%
                                  </span>
                                </div>
                              )}

                              <div className="border-border/50 mb-4 flex items-center justify-between border-t pt-2">
                                <span className="text-foreground font-medium">
                                  {t('subscription.total')}
                                </span>
                                <div className="text-right">
                                  <span className="text-primary text-2xl font-bold">
                                    {formatPrice(totalPrice)}
                                  </span>
                                  {originalTotal && (
                                    <div className="text-muted-foreground text-sm line-through">
                                      {formatPrice(originalTotal)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <Button
                                onClick={() => tariffPurchaseMutation.mutate()}
                                disabled={tariffPurchaseMutation.isPending}
                                className="w-full"
                              >
                                {tariffPurchaseMutation.isPending ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    {t('common.loading')}
                                  </span>
                                ) : (
                                  t('subscription.purchase')
                                )}
                              </Button>
                            </>
                          );
                        })()}

                        {tariffPurchaseMutation.isError &&
                          !getInsufficientBalanceError(tariffPurchaseMutation.error) && (
                            <div className="text-error-400 mt-3 text-center text-sm">
                              {getErrorMessage(tariffPurchaseMutation.error)}
                            </div>
                          )}
                        {tariffPurchaseMutation.isError &&
                          getInsufficientBalanceError(tariffPurchaseMutation.error) && (
                            <div className="mt-3">
                              <InsufficientBalancePrompt
                                missingAmountKopeks={
                                  getInsufficientBalanceError(tariffPurchaseMutation.error)
                                    ?.missingAmount || 0
                                }
                                compact
                              />
                            </div>
                          )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* Purchase/Extend Section - Classic Mode */}
      {classicOptions && classicOptions.periods.length > 0 && (
        <div className="border-border bg-card relative overflow-hidden rounded-3xl border px-7 py-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-foreground text-base font-bold tracking-tight">
              {subscription && !subscription.is_trial
                ? t('subscription.extend')
                : t('subscription.getSubscription')}
            </h2>
            {!showPurchaseForm && (
              <Button onClick={() => setShowPurchaseForm(true)}>
                {subscription && !subscription.is_trial
                  ? t('subscription.extend')
                  : t('subscription.getSubscription')}
              </Button>
            )}
          </div>

          {showPurchaseForm && (
            <div className="space-y-6">
              {/* Step Indicator */}
              <div className="mb-6 flex items-center justify-between">
                <div className="text-muted-foreground text-sm">
                  {t('subscription.step', { current: currentStepIndex + 1, total: steps.length })}
                </div>
                <div className="flex gap-2">
                  {steps.map((step, idx) => (
                    <div
                      key={step}
                      className={`h-1 w-8 rounded-full transition-colors ${
                        idx <= currentStepIndex ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="text-foreground mb-4 text-lg font-medium">
                {getStepLabel(currentStep)}
              </div>

              {/* Step: Period Selection */}
              {currentStep === 'period' && classicOptions && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {classicOptions.periods.map((period) => {
                    const promoPeriod = applyPromoDiscount(
                      period.price_kopeks,
                      period.original_price_kopeks,
                    );

                    return (
                      <Button
                        key={period.id}
                        onClick={() => {
                          setSelectedPeriod(period);
                          if (period.traffic.current !== undefined) {
                            setSelectedTraffic(period.traffic.current);
                          }
                          const availableServers = getAvailableServers(period);
                          if (availableServers.length === 1) {
                            setSelectedServers([availableServers[0].uuid]);
                          } else if (period.servers.selected) {
                            const availUuids = new Set(availableServers.map((s) => s.uuid));
                            setSelectedServers(
                              period.servers.selected.filter((uuid) => availUuids.has(uuid)),
                            );
                          }
                          if (period.devices.current) {
                            setSelectedDevices(period.devices.current);
                          }
                        }}
                        variant="ghost"
                        className={`bento-card-hover relative h-auto flex-col items-start p-4 text-left transition-all ${
                          selectedPeriod?.id === period.id ? 'bento-card-glow border-primary' : ''
                        }`}
                      >
                        {promoPeriod.percent && promoPeriod.percent > 0 && (
                          <div
                            className={`absolute top-2 right-2 z-10 rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-sm ${
                              promoPeriod.isPromoGroup ? 'bg-success-500' : 'bg-orange-500'
                            }`}
                          >
                            -{promoPeriod.percent}%
                          </div>
                        )}
                        <div className="text-foreground text-lg font-semibold">{period.label}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-primary font-medium">
                            {formatPrice(promoPeriod.price)}
                          </span>
                          {promoPeriod.original && promoPeriod.original > promoPeriod.price && (
                            <span className="text-muted-foreground text-sm line-through">
                              {formatPrice(promoPeriod.original)}
                            </span>
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              )}

              {/* Step: Traffic Selection */}
              {currentStep === 'traffic' && selectedPeriod?.traffic.options && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {selectedPeriod.traffic.options.map((option) => {
                    const promoTraffic = applyPromoDiscount(
                      option.price_kopeks,
                      option.original_price_kopeks,
                    );

                    return (
                      <Button
                        key={option.value}
                        onClick={() => setSelectedTraffic(option.value)}
                        disabled={!option.is_available}
                        variant="ghost"
                        className={`bento-card-hover relative h-auto flex-col p-4 text-center transition-all ${
                          selectedTraffic === option.value ? 'bento-card-glow border-primary' : ''
                        } ${!option.is_available ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        {promoTraffic.percent && promoTraffic.percent > 0 && (
                          <div
                            className={`absolute top-2 right-2 z-10 rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-sm ${
                              promoTraffic.isPromoGroup ? 'bg-success-500' : 'bg-orange-500'
                            }`}
                          >
                            -{promoTraffic.percent}%
                          </div>
                        )}
                        <div className="text-foreground text-lg font-semibold">{option.label}</div>
                        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                          <span className="text-primary">{formatPrice(promoTraffic.price)}</span>
                          {promoTraffic.original && promoTraffic.original > promoTraffic.price && (
                            <span className="text-muted-foreground text-xs line-through">
                              {formatPrice(promoTraffic.original)}
                            </span>
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              )}

              {/* Step: Server Selection */}
              {currentStep === 'servers' && selectedPeriod?.servers.options && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {selectedPeriod.servers.options
                    .filter((server) => {
                      if (!server.is_available) return false;
                      if (subscription?.is_trial && server.name.toLowerCase().includes('trial')) {
                        return false;
                      }
                      return true;
                    })
                    .map((server) => {
                      const promoServer = applyPromoDiscount(
                        server.price_kopeks,
                        server.original_price_kopeks,
                      );

                      return (
                        <Button
                          key={server.uuid}
                          onClick={() => toggleServer(server.uuid)}
                          disabled={!server.is_available}
                          variant="ghost"
                          className={`relative h-auto flex-col items-start rounded-xl border p-4 text-left transition-all ${
                            selectedServers.includes(server.uuid)
                              ? 'border-primary bg-primary/10'
                              : server.is_available
                                ? 'border-border/50 bg-card/50 hover:border-border'
                                : 'border-border/30 bg-background/30 cursor-not-allowed opacity-50'
                          }`}
                        >
                          {promoServer.percent && promoServer.percent > 0 ? (
                            <div
                              className={`absolute top-2 right-2 z-10 rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-sm ${
                                promoServer.isPromoGroup ? 'bg-success-500' : 'bg-orange-500'
                              }`}
                            >
                              -{promoServer.percent}%
                            </div>
                          ) : null}
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                                selectedServers.includes(server.uuid)
                                  ? 'border-primary bg-primary'
                                  : 'border-border'
                              }`}
                            >
                              {selectedServers.includes(server.uuid) && <CheckIcon />}
                            </div>
                            <div>
                              <div className="text-foreground font-medium">{server.name}</div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="text-primary text-sm">
                                  {formatPrice(promoServer.price)}
                                  {t('subscription.perMonth')}
                                </span>
                                {promoServer.original &&
                                promoServer.original > promoServer.price ? (
                                  <span className="text-muted-foreground text-xs line-through">
                                    {formatPrice(promoServer.original)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                </div>
              )}

              {/* Step: Device Selection */}
              {currentStep === 'devices' && selectedPeriod && (
                <div className="flex flex-col items-center py-8">
                  <div className="flex items-center gap-6">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setSelectedDevices(
                          Math.max(selectedPeriod.devices.min, selectedDevices - 1),
                        )
                      }
                      disabled={selectedDevices <= selectedPeriod.devices.min}
                      className="h-14 w-14 p-0 text-2xl"
                    >
                      -
                    </Button>
                    <div className="text-center">
                      <div className="text-foreground text-5xl font-bold">{selectedDevices}</div>
                      <div className="text-muted-foreground mt-2">{t('subscription.devices')}</div>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setSelectedDevices(
                          Math.min(selectedPeriod.devices.max, selectedDevices + 1),
                        )
                      }
                      disabled={selectedDevices >= selectedPeriod.devices.max}
                      className="h-14 w-14 p-0 text-2xl"
                    >
                      +
                    </Button>
                  </div>
                  <div className="text-muted-foreground mt-4 space-y-1 text-center text-sm">
                    <div className="text-primary">
                      {t('subscription.devicesFree', { count: selectedPeriod.devices.min })}
                    </div>
                    {selectedPeriod.devices.max > selectedPeriod.devices.min && (
                      <div>
                        {formatPrice(selectedPeriod.devices.price_per_device_kopeks)}{' '}
                        {t('subscription.perExtraDevice')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step: Confirm */}
              {currentStep === 'confirm' && (
                <div>
                  {previewLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
                    </div>
                  ) : preview ? (
                    <div className="bg-card/50 space-y-4 rounded-xl p-5">
                      {activeDiscount?.is_active && activeDiscount.discount_percent && (
                        <div className="flex items-center justify-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
                          <svg
                            className="h-4 w-4 text-orange-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                            />
                          </svg>
                          <span className="text-sm font-medium text-orange-400">
                            {t('promo.discountApplied')} -{activeDiscount.discount_percent}%
                          </span>
                        </div>
                      )}

                      {preview.breakdown.map((item, idx) => (
                        <div key={idx} className="text-muted-foreground flex justify-between">
                          <span>{item.label}</span>
                          <span>{item.value}</span>
                        </div>
                      ))}

                      {(() => {
                        const promoTotal = applyPromoDiscount(
                          preview.total_price_kopeks,
                          preview.original_price_kopeks,
                        );

                        return (
                          <div className="border-border/50 flex items-center justify-between border-t pt-4">
                            <span className="text-foreground text-lg font-semibold">
                              {t('subscription.total')}
                            </span>
                            <div className="text-right">
                              <div className="text-primary text-2xl font-bold">
                                {formatPrice(promoTotal.price)}
                              </div>
                              {promoTotal.original && promoTotal.original > promoTotal.price && (
                                <div className="text-muted-foreground text-sm line-through">
                                  {formatPrice(promoTotal.original)}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {preview.discount_label && (
                        <div className="text-success-400 text-center text-sm">
                          {preview.discount_label}
                        </div>
                      )}

                      {!preview.can_purchase &&
                        (preview.missing_amount_kopeks > 0 ? (
                          <InsufficientBalancePrompt
                            missingAmountKopeks={preview.missing_amount_kopeks}
                            compact
                          />
                        ) : preview.status_message ? (
                          <div className="bg-error-500/10 text-error-400 rounded-lg px-4 py-3 text-center text-sm">
                            {preview.status_message}
                          </div>
                        ) : null)}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="border-border/50 flex gap-3 border-t pt-4">
                {!isFirstStep && (
                  <Button variant="secondary" onClick={goToPrevStep} className="flex-1">
                    {t('common.back')}
                  </Button>
                )}

                {isFirstStep && (
                  <Button variant="secondary" onClick={resetPurchase}>
                    {t('common.cancel')}
                  </Button>
                )}

                {!isLastStep ? (
                  <Button onClick={goToNextStep} disabled={!selectedPeriod} className="flex-1">
                    {t('common.next')}
                  </Button>
                ) : (
                  <Button
                    onClick={() => purchaseMutation.mutate()}
                    disabled={
                      purchaseMutation.isPending || previewLoading || !preview?.can_purchase
                    }
                    className="flex-1"
                  >
                    {purchaseMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        {t('common.loading')}
                      </span>
                    ) : (
                      t('subscription.purchase')
                    )}
                  </Button>
                )}
              </div>

              {purchaseMutation.isError && (
                <div className="text-error-400 text-center text-sm">
                  {getErrorMessage(purchaseMutation.error)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* No options available fallback */}
      {purchaseOptions &&
        !optionsLoading &&
        !(isTariffsMode && tariffs.length > 0) &&
        !(classicOptions && classicOptions.periods.length > 0) && (
          <div className="border-border bg-card rounded-3xl border p-6 text-center">
            <p className="text-muted-foreground mb-4">
              {t('subscription.noOptionsAvailable', 'Нет доступных вариантов подписки')}
            </p>
            <Button onClick={() => refetchOptions()}>{t('common.retry')}</Button>
          </div>
        )}
    </div>
  );
}
