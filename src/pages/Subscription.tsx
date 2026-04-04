import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { subscriptionApi } from '../api/subscription';
import { WebBackButton } from '../components/WebBackButton';
import { useDestructiveConfirm } from '../platform/hooks/useNativeDialog';
import { usePlatform } from '../platform';
import TrafficProgressBar from '../components/dashboard/TrafficProgressBar';
import { HoverBorderGradient } from '../components/ui/hover-border-gradient';
import { useTrafficZone } from '../hooks/useTrafficZone';
import { formatTraffic } from '../utils/formatTraffic';
import InsufficientBalancePrompt from '../components/InsufficientBalancePrompt';
import { useCurrency } from '../hooks/useCurrency';
import { useCloseOnSuccessNotification } from '../store/successNotification';
import PurchaseCTAButton from '../components/subscription/PurchaseCTAButton';
import { CopyIcon, CheckIcon } from '../components/icons';
import { useHaptic } from '../platform';
import {
  getErrorMessage,
  getInsufficientBalanceError,
  getFlagEmoji,
} from '../utils/subscriptionHelpers';

/** Isolated countdown so 1s interval doesn't re-render the whole page */
const CountdownTimer = memo(function CountdownTimer({
  endDate,
  isActive,
}: {
  endDate: string;
  isActive: boolean;
}) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const endTime = new Date(endDate).getTime();
    const tick = () => {
      const diff = Math.max(0, endTime - Date.now());
      setCountdown({
        days: Math.floor(diff / 86_400_000),
        hours: Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1_000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  const isExpired = !isActive;
  const isUrgent = countdown.days <= 3;

  const formattedDate = new Date(endDate).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const containerClass = isExpired
    ? 'min-w-0 overflow-hidden rounded-[14px] p-3.5 bg-error-500/[0.06] border border-error-500/15'
    : isUrgent
      ? 'min-w-0 overflow-hidden rounded-[14px] p-3.5 bg-warning-400/[0.06] border border-warning-400/15'
      : 'min-w-0 overflow-hidden rounded-[14px] p-3.5 bg-muted/30 border border-border/50';

  const iconBgClass = isExpired
    ? 'bg-error-500/10'
    : isUrgent
      ? 'bg-warning-400/10'
      : 'hover:bg-accent/50';

  const timerColor = isUrgent ? '#FFB800' : undefined;
  const timerClass = isUrgent ? 'text-warning-400' : 'text-foreground';

  return (
    <div className={containerClass}>
      <div className="text-foreground/35 mb-2 flex items-center gap-1.5 text-[10px] font-medium tracking-wider uppercase">
        <div className={`flex h-6 w-6 items-center justify-center rounded-[7px] ${iconBgClass}`}>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isExpired ? '#FF3B5C' : isUrgent ? '#FFB800' : 'var(--muted-foreground)'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </div>
        {t('dashboard.remaining')}
      </div>
      {isExpired ? (
        <div className="text-error-400 text-lg font-bold tracking-tight">
          {t('subscription.expired')}
        </div>
      ) : (
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1 font-mono tabular-nums">
            {countdown.days > 0 && (
              <>
                <span
                  className={`text-xl font-bold tracking-tight ${timerClass}`}
                  style={timerColor ? { color: timerColor } : undefined}
                >
                  {countdown.days}
                </span>
                <span className="text-foreground/25 mr-1 text-[10px] font-medium">
                  {t('subscription.daysShort')}
                </span>
              </>
            )}
            <span
              className={`text-xl font-bold tracking-tight ${timerClass}`}
              style={timerColor ? { color: timerColor } : undefined}
            >
              {String(countdown.hours).padStart(2, '0')}
            </span>
            <span
              className={`-mx-px text-base font-bold opacity-30 ${timerClass}`}
              style={timerColor ? { color: timerColor } : undefined}
            >
              :
            </span>
            <span
              className={`text-xl font-bold tracking-tight ${timerClass}`}
              style={timerColor ? { color: timerColor } : undefined}
            >
              {String(countdown.minutes).padStart(2, '0')}
            </span>
            <span
              className={`-mx-px text-base font-bold opacity-30 ${timerClass}`}
              style={timerColor ? { color: timerColor } : undefined}
            >
              :
            </span>
            <span
              className={`text-xl font-bold tracking-tight ${timerClass}`}
              style={timerColor ? { color: timerColor } : undefined}
            >
              {String(countdown.seconds).padStart(2, '0')}
            </span>
          </div>
          <div className="text-foreground/25 text-[10px] font-medium">
            {t('subscription.expiresAt')}: {formattedDate}
          </div>
        </div>
      )}
    </div>
  );
});

export default function Subscription() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { formatAmount, currencySymbol } = useCurrency();
  const navigate = useNavigate();
  const { subscriptionId: subIdParam } = useParams<{ subscriptionId?: string }>();
  const subscriptionId = subIdParam ? parseInt(subIdParam, 10) : undefined;
  const haptic = useHaptic();
  const [copied, setCopied] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { platform } = usePlatform();
  const destructiveConfirm = useDestructiveConfirm();

  // Helper to format price from kopeks
  const formatPrice = (kopeks: number) => `${formatAmount(kopeks / 100)} ${currencySymbol}`;

  // Device/traffic topup state
  const [showDeviceTopup, setShowDeviceTopup] = useState(false);
  const [devicesToAdd, setDevicesToAdd] = useState(1);
  const [showDeviceReduction, setShowDeviceReduction] = useState(false);
  const [targetDeviceLimit, setTargetDeviceLimit] = useState<number>(1);
  const [showTrafficTopup, setShowTrafficTopup] = useState(false);
  const [selectedTrafficPackage, setSelectedTrafficPackage] = useState<number | null>(null);
  const [showServerManagement, setShowServerManagement] = useState(false);
  const [selectedServersToUpdate, setSelectedServersToUpdate] = useState<string[]>([]);

  // Traffic refresh state
  const [trafficRefreshCooldown, setTrafficRefreshCooldown] = useState(0);
  const [trafficData, setTrafficData] = useState<{
    traffic_used_gb: number;
    traffic_used_percent: number;
    is_unlimited: boolean;
  } | null>(null);

  // Detect multi-tariff mode from cached subscriptions-list
  const { data: multiSubData } = useQuery({
    queryKey: ['subscriptions-list'],
    queryFn: () => subscriptionApi.getSubscriptions(),
    staleTime: 60_000,
  });
  const isMultiTariff = multiSubData?.multi_tariff_enabled ?? false;

  const { data: subscriptionResponse, isLoading } = useQuery({
    queryKey: ['subscription', subscriptionId],
    queryFn: () => subscriptionApi.getSubscription(subscriptionId),
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Extract subscription from response (null if no subscription)
  const subscription = subscriptionResponse?.subscription ?? null;

  // Traffic zone (theme-aware) — called unconditionally at top level
  const usedPercent = trafficData?.traffic_used_percent ?? subscription?.traffic_used_percent ?? 0;
  const zone = useTrafficZone(usedPercent);

  // Purchase options (needed for balance_kopeks in device/traffic/server management)
  const { data: purchaseOptions } = useQuery({
    queryKey: ['purchase-options', subscriptionId],
    queryFn: () => subscriptionApi.getPurchaseOptions(subscriptionId),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const isTariffsMode = purchaseOptions?.sales_mode === 'tariffs';

  const autopayMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      subscriptionApi.updateAutopay(enabled, undefined, subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
    },
  });

  // Devices query
  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ['devices', subscriptionId],
    queryFn: () => subscriptionApi.getDevices(subscriptionId),
    enabled: !!subscription,
  });

  // Delete device mutation
  const deleteDeviceMutation = useMutation({
    mutationFn: (hwid: string) => subscriptionApi.deleteDevice(hwid, subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', subscriptionId] });
    },
  });

  // Delete all devices mutation
  const deleteAllDevicesMutation = useMutation({
    mutationFn: () => subscriptionApi.deleteAllDevices(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', subscriptionId] });
    },
  });

  // Pause subscription mutation
  const pauseMutation = useMutation({
    mutationFn: () => subscriptionApi.togglePause(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
  });

  // Auto-close all modals/forms when success notification appears
  const handleCloseAllModals = useCallback(() => {
    setShowDeviceTopup(false);
    setShowDeviceReduction(false);
    setShowTrafficTopup(false);
    setShowServerManagement(false);
  }, []);
  useCloseOnSuccessNotification(handleCloseAllModals);

  // Device price query
  const { data: devicePriceData } = useQuery({
    queryKey: ['device-price', devicesToAdd, subscriptionId],
    queryFn: () => subscriptionApi.getDevicePrice(devicesToAdd, subscriptionId),
    enabled: showDeviceTopup && !!subscription,
  });

  // Device purchase mutation
  const devicePurchaseMutation = useMutation({
    mutationFn: () => subscriptionApi.purchaseDevices(devicesToAdd, subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      queryClient.invalidateQueries({ queryKey: ['devices', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['device-price'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      setShowDeviceTopup(false);
      setDevicesToAdd(1);
    },
  });

  // Device reduction info query
  const { data: deviceReductionInfo } = useQuery({
    queryKey: ['device-reduction-info', subscriptionId],
    queryFn: () => subscriptionApi.getDeviceReductionInfo(subscriptionId),
    enabled: showDeviceReduction && !!subscription,
  });

  // Initialize target device limit when reduction info loads
  useEffect(() => {
    if (deviceReductionInfo && showDeviceReduction) {
      setTargetDeviceLimit(
        Math.max(
          deviceReductionInfo.min_device_limit,
          deviceReductionInfo.current_device_limit - 1,
        ),
      );
    }
  }, [deviceReductionInfo, showDeviceReduction]);

  // Device reduction mutation
  const deviceReductionMutation = useMutation({
    mutationFn: () => subscriptionApi.reduceDevices(targetDeviceLimit, subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      queryClient.invalidateQueries({ queryKey: ['devices', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['device-reduction-info', subscriptionId] });
      setShowDeviceReduction(false);
    },
  });

  // Traffic packages query
  const { data: trafficPackages } = useQuery({
    queryKey: ['traffic-packages', subscriptionId],
    queryFn: () => subscriptionApi.getTrafficPackages(subscriptionId),
    enabled: showTrafficTopup && !!subscription,
  });

  // Traffic purchase mutation
  const trafficPurchaseMutation = useMutation({
    mutationFn: (gb: number) => subscriptionApi.purchaseTraffic(gb, subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-packages', subscriptionId] });
      setShowTrafficTopup(false);
      setSelectedTrafficPackage(null);
    },
  });

  // Countries/servers query
  const { data: countriesData, isLoading: countriesLoading } = useQuery({
    queryKey: ['countries', subscriptionId],
    queryFn: () => subscriptionApi.getCountries(subscriptionId),
    enabled: showServerManagement && !!subscription && !subscription.is_trial,
  });

  // Initialize selected servers when data loads
  useEffect(() => {
    if (countriesData && showServerManagement) {
      const connected = countriesData.countries.filter((c) => c.is_connected).map((c) => c.uuid);
      setSelectedServersToUpdate(connected);
    }
  }, [countriesData, showServerManagement]);

  // Countries update mutation
  const updateCountriesMutation = useMutation({
    mutationFn: (countries: string[]) => subscriptionApi.updateCountries(countries, subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      queryClient.invalidateQueries({ queryKey: ['countries', subscriptionId] });
      setShowServerManagement(false);
    },
  });

  // Traffic refresh mutation
  const refreshTrafficMutation = useMutation({
    mutationFn: () => subscriptionApi.refreshTraffic(subscriptionId),
    onSuccess: (data) => {
      setTrafficData({
        traffic_used_gb: data.traffic_used_gb,
        traffic_used_percent: data.traffic_used_percent,
        is_unlimited: data.is_unlimited,
      });
      localStorage.setItem(
        `traffic_refresh_ts_${subscriptionId ?? 'default'}`,
        Date.now().toString(),
      );
      if (data.rate_limited && data.retry_after_seconds) {
        setTrafficRefreshCooldown(data.retry_after_seconds);
      } else {
        setTrafficRefreshCooldown(30);
      }
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
    },
    onError: (error: {
      response?: { status?: number; headers?: { get?: (key: string) => string } };
    }) => {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers?.get?.('Retry-After');
        setTrafficRefreshCooldown(retryAfter ? parseInt(retryAfter, 10) : 30);
      }
    },
  });

  // Track if we've already triggered auto-refresh this session
  const hasAutoRefreshed = useRef(false);

  // Cooldown timer for traffic refresh
  useEffect(() => {
    if (trafficRefreshCooldown <= 0) return;
    const timer = setInterval(() => {
      setTrafficRefreshCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [trafficRefreshCooldown]);

  // Auto-refresh traffic on mount (with 30s caching)
  useEffect(() => {
    if (!subscription) return;
    if (hasAutoRefreshed.current) return;
    hasAutoRefreshed.current = true;

    const lastRefresh = localStorage.getItem(`traffic_refresh_ts_${subscriptionId ?? 'default'}`);
    const now = Date.now();
    const cacheMs = 30 * 1000;

    if (lastRefresh && now - parseInt(lastRefresh, 10) < cacheMs) {
      const elapsed = now - parseInt(lastRefresh, 10);
      const remaining = Math.ceil((cacheMs - elapsed) / 1000);
      if (remaining > 0) {
        setTrafficRefreshCooldown(remaining);
      }
      return;
    }

    refreshTrafficMutation.mutate();
  }, [subscription, refreshTrafficMutation, subscriptionId]);

  const copyUrl = () => {
    if (subscription?.subscription_url) {
      navigator.clipboard.writeText(subscription.subscription_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // In multi-tariff mode without a specific subscription ID, redirect to list
  if (isMultiTariff && !subscriptionId && !isLoading) {
    return <Navigate to="/subscriptions" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="border-accent-500 h-10 w-10 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (!subscription && subscriptionId) {
    return (
      <div className="mx-auto max-w-lg p-4 text-center">
        <div className="mb-4 text-4xl">😕</div>
        <h2 className="text-foreground mb-2 text-xl font-bold">
          {t('subscription.notFound', 'Подписка не найдена')}
        </h2>
        <p className="text-foreground/60 mb-4 text-sm">
          {t('subscription.notFoundDesc', 'Возможно, подписка была удалена или не существует')}
        </p>
        <Button onClick={() => navigate('/subscriptions')}>
          {t('subscription.backToList', 'Мои подписки')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center gap-3">
        <WebBackButton to={isMultiTariff ? '/subscriptions' : '/'} />
        <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
          {isMultiTariff && subscription?.tariff_name
            ? subscription.tariff_name
            : t('subscription.title')}
        </h1>
      </div>

      {/* Current Subscription */}
      {subscription ? (
        (() => {
          const usedGb = trafficData?.traffic_used_gb ?? subscription.traffic_used_gb;
          const isUnlimited =
            (trafficData?.is_unlimited ?? false) || subscription.traffic_limit_gb === 0;
          const connectedDevices = devicesData?.total ?? 0;
          const isAtDeviceLimit =
            subscription.device_limit > 0 && connectedDevices >= subscription.device_limit;

          return (
            <div
              className="bg-card relative overflow-hidden rounded-3xl shadow-sm backdrop-blur-xl"
              style={{
                border: subscription.is_trial
                  ? '1px solid rgba(var(--color-accent-400), 0.15)'
                  : `1px solid ${zone.mainHex}25`,
                padding: '28px 28px 24px',
              }}
            >
              {/* Trial shimmer border */}
              {subscription.is_trial && (
                <div
                  className="animate-trial-glow pointer-events-none absolute -inset-px rounded-3xl"
                  aria-hidden="true"
                />
              )}

              {/* Background glow */}
              <div
                className="pointer-events-none absolute"
                style={{
                  top: -60,
                  right: -60,
                  width: 200,
                  height: 200,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${zone.mainHex}14 0%, transparent 70%)`,
                  transition: 'background 0.8s ease',
                }}
                aria-hidden="true"
              />

              {/* ─── Header ─── */}
              <div className="mb-6 flex items-start justify-between">
                <div>
                  {/* Zone indicator */}
                  <div className="mb-1 flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        background: zone.mainHex,
                        boxShadow: `0 0 8px ${zone.mainHex}80`,
                        transition: 'all 0.6s ease',
                      }}
                      aria-hidden="true"
                    />
                    <span
                      className="font-mono text-[11px] font-semibold tracking-widest uppercase"
                      style={{ color: zone.mainHex, transition: 'color 0.6s ease' }}
                    >
                      {isUnlimited ? t('dashboard.unlimited') : t(zone.labelKey)}
                    </span>
                  </div>

                  {/* Plan name */}
                  <h2 className="text-foreground text-lg font-bold tracking-tight">
                    {subscription.tariff_name || t('subscription.currentPlan')}
                  </h2>
                </div>

                {/* Status badge */}
                <span
                  className="rounded-full px-3 py-1 font-mono text-[10px] font-semibold tracking-wider uppercase"
                  style={{
                    background: subscription.is_active
                      ? `${zone.mainHex}15`
                      : subscription.is_limited
                        ? 'rgba(255,184,0,0.12)'
                        : 'rgba(255,59,92,0.12)',
                    border: subscription.is_active
                      ? `1px solid ${zone.mainHex}30`
                      : subscription.is_limited
                        ? '1px solid rgba(255,184,0,0.25)'
                        : '1px solid rgba(255,59,92,0.25)',
                    color: subscription.is_active
                      ? zone.mainHex
                      : subscription.is_limited
                        ? '#FFB800'
                        : '#FF3B5C',
                  }}
                >
                  {subscription.is_active
                    ? subscription.is_trial
                      ? t('subscription.trialStatus')
                      : t('subscription.active')
                    : subscription.is_limited
                      ? t('subscription.trafficLimited')
                      : subscription.status === 'disabled'
                        ? t('subscription.pause.suspended')
                        : t('subscription.expired')}
                </span>
              </div>

              {/* ─── Traffic Limited Banner ─── */}
              {subscription.is_limited && (
                <div
                  className="mb-6 rounded-[14px] p-4"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,184,0,0.08), rgba(255,184,0,0.03))',
                    border: '1px solid rgba(255,184,0,0.2)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: 'rgba(255,184,0,0.12)' }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#FFB800"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold" style={{ color: '#FFB800' }}>
                        {t('subscription.trafficLimitedTitle')}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {t('subscription.trafficLimitedDescription')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Trial Info Banner ─── */}
              {subscription.is_trial && subscription.is_active && (
                <div
                  className="mb-6 rounded-[14px] p-4"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(var(--color-accent-400), 0.08), rgba(var(--color-accent-400), 0.03))',
                    border: '1px solid rgba(var(--color-accent-400), 0.12)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: 'rgba(var(--color-accent-400), 0.12)' }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="rgb(var(--color-accent-400))"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div
                        className="text-sm font-semibold"
                        style={{ color: 'rgb(var(--color-accent-400))' }}
                      >
                        {t('subscription.trialInfo.title')}
                      </div>
                      <div className="text-foreground/40 mt-1 text-xs">
                        {t('subscription.trialInfo.description')}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-xs font-semibold"
                            style={{ color: 'rgb(var(--color-accent-400))' }}
                          >
                            {subscription.days_left > 0
                              ? t('subscription.days', { count: subscription.days_left })
                              : `${subscription.hours_left}${t('subscription.hours')} ${subscription.minutes_left}${t('subscription.minutes')}`}
                          </span>
                          <span className="text-foreground/30 text-[11px]">
                            {t('subscription.trialInfo.remaining')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-xs font-semibold"
                            style={{ color: 'rgb(var(--color-accent-400))' }}
                          >
                            {subscription.traffic_limit_gb || '∞'} {t('common.units.gb')}
                          </span>
                          <span className="text-foreground/30 text-[11px]">
                            {t('subscription.traffic')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-xs font-semibold"
                            style={{ color: 'rgb(var(--color-accent-400))' }}
                          >
                            {subscription.device_limit === 0 ? '∞' : subscription.device_limit}
                          </span>
                          <span className="text-foreground/30 text-[11px]">
                            {t('subscription.devices')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Traffic Progress ─── */}
              <div className="mb-6">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-foreground/40 text-[11px] font-medium tracking-wider uppercase">
                    {t('subscription.traffic')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground/30 font-mono text-[11px]">
                      {isUnlimited
                        ? formatTraffic(usedGb)
                        : `${formatTraffic(usedGb)} / ${formatTraffic(subscription.traffic_limit_gb)}`}
                    </span>
                    <Button
                      onClick={() => refreshTrafficMutation.mutate()}
                      disabled={refreshTrafficMutation.isPending || trafficRefreshCooldown > 0}
                      variant="ghost"
                      className="text-foreground/30 hover:bg-foreground/5 hover:text-foreground/50 h-auto gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    >
                      <svg
                        className={`h-3 w-3 ${refreshTrafficMutation.isPending ? 'animate-spin' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                        />
                      </svg>
                      {trafficRefreshCooldown > 0
                        ? `${trafficRefreshCooldown}s`
                        : t('common.refresh')}
                    </Button>
                  </div>
                </div>
                {subscription.traffic_reset_mode &&
                  subscription.traffic_reset_mode !== 'NO_RESET' && (
                    <div className="text-foreground/25 mb-2 text-[10px]">
                      {t(`subscription.trafficReset.${subscription.traffic_reset_mode}`)}
                    </div>
                  )}
                <TrafficProgressBar
                  usedGb={usedGb}
                  limitGb={subscription.traffic_limit_gb}
                  percent={usedPercent}
                  isUnlimited={isUnlimited}
                  compact
                />
              </div>

              {/* ─── Connect Device Button ─── */}
              {subscription.subscription_url && (
                <HoverBorderGradient
                  as="button"
                  accentColor={zone.mainHex}
                  disabled={isAtDeviceLimit}
                  onClick={() => {
                    if (isAtDeviceLimit) {
                      haptic.notification('error');
                      return;
                    }
                    navigate(subscriptionId ? `/connection?sub=${subscriptionId}` : '/connection');
                  }}
                  className={`mb-5 flex w-full items-center gap-3.5 rounded-[14px] p-3.5 text-left transition-shadow duration-300${isAtDeviceLimit ? 'cursor-not-allowed opacity-50' : ''}`}
                  style={{ fontFamily: 'inherit' }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-500"
                    style={{ background: `${zone.mainHex}12` }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={zone.mainHex}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path d="M12 17v4M8 21h8" />
                      <path d="M12 8v4M10 10h4" opacity="0.7" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground text-sm font-semibold tracking-tight">
                      {t('dashboard.connectDevice')}
                    </div>
                    <div className="text-foreground/30 mt-0.5 text-[11px]">
                      {subscription.device_limit === 0
                        ? t('dashboard.devicesConnectedUnlimited', { used: connectedDevices })
                        : t('dashboard.devicesOfMax', {
                            used: connectedDevices,
                            max: subscription.device_limit,
                          })}
                    </div>
                    {isAtDeviceLimit && (
                      <div
                        className="mt-1 text-[10px] font-medium"
                        style={{ color: 'rgb(var(--color-warning-400))' }}
                      >
                        {t('dashboard.deviceLimitReached')}
                      </div>
                    )}
                  </div>
                  {subscription.device_limit === 0 ? (
                    <div
                      className="text-foreground/40 flex shrink-0 items-center text-lg"
                      aria-hidden="true"
                    >
                      ∞
                    </div>
                  ) : subscription.device_limit <= 10 ? (
                    <div className="flex shrink-0 gap-1.5" aria-hidden="true">
                      {Array.from({ length: subscription.device_limit }, (_, i) => (
                        <div
                          key={i}
                          className="size-1.75 rounded-full transition-[background-color,box-shadow] duration-300"
                          style={{
                            background:
                              i < connectedDevices ? zone.mainHex : 'var(--muted-foreground)',
                            opacity: i < connectedDevices ? 1 : 0.2,
                            boxShadow: i < connectedDevices ? `0 0 6px ${zone.mainHex}50` : 'none',
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex w-16 shrink-0 items-center" aria-hidden="true">
                      <div className="bg-muted-foreground/20 h-1.5 w-full overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{
                            width: `${Math.round((connectedDevices / subscription.device_limit) * 100)}%`,
                            background: zone.mainHex,
                            boxShadow: `0 0 8px ${zone.mainHex}40`,
                            minWidth: connectedDevices > 0 ? '4px' : '0px',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </HoverBorderGradient>
              )}

              {/* ─── Subscription URL ─── */}
              {subscription.subscription_url && !subscription.hide_subscription_link && (
                <div className="mb-5 flex gap-2">
                  <code className="scrollbar-hide border-border/40 bg-muted/20 text-foreground/30 flex-1 overflow-x-auto rounded-[10px] border px-3 py-2 font-mono text-[11px] break-all">
                    {subscription.subscription_url}
                  </code>
                  <Button
                    onClick={copyUrl}
                    variant={copied ? 'ghost' : 'outline'}
                    className={`h-auto items-center rounded-[10px] border px-3 ${copied ? 'border-accent-400/20 bg-accent-400/12 text-accent-400 hover:bg-accent-400/12 hover:text-accent-400' : 'border-border/40 bg-muted/30 text-muted-foreground/75'}`}
                    title={t('subscription.copyLink')}
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </Button>
                </div>
              )}

              {/* ─── Countdown ─── */}
              <div className="mb-5">
                <CountdownTimer endDate={subscription.end_date} isActive={subscription.is_active} />
              </div>

              {/* ─── Locations ─── */}
              {subscription.servers && subscription.servers.length > 0 && (
                <div className="mb-5">
                  <div className="text-foreground/35 mb-2 text-[10px] font-medium tracking-wider uppercase">
                    {t('subscription.locationsLabel')}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {subscription.servers.map((server) => (
                      <span
                        key={server.uuid}
                        className="border-border/40 bg-border/50 text-foreground/50 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium"
                      >
                        {server.country_code && (
                          <span className="text-xs">{getFlagEmoji(server.country_code)}</span>
                        )}
                        {server.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── Purchased Traffic Packages ─── */}
              {subscription.traffic_purchases && subscription.traffic_purchases.length > 0 && (
                <div className="mb-5">
                  <div className="text-foreground/35 mb-2 text-[10px] font-medium tracking-wider uppercase">
                    {t('subscription.purchasedTraffic')}
                  </div>
                  <div className="space-y-2">
                    {subscription.traffic_purchases.map((purchase) => (
                      <div
                        key={purchase.id}
                        className="rounded-linear-lg border-border/50 bg-muted/30 border p-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-lg"
                              style={{ background: `${zone.mainHex}12` }}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={zone.mainHex}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                            </div>
                            <span className="text-foreground text-sm font-semibold">
                              {purchase.traffic_gb} {t('common.units.gb')}
                            </span>
                          </div>
                          <div className="text-right">
                            <div
                              className="text-[11px] font-medium"
                              style={{
                                color: purchase.days_remaining === 0 ? '#FF6B35' : undefined,
                              }}
                            >
                              {purchase.days_remaining === 0
                                ? t('subscription.expired')
                                : t('subscription.days', { count: purchase.days_remaining })}
                            </div>
                            <div className="text-foreground/20 mt-0.5 font-mono text-[9px]">
                              {t('subscription.trafficResetAt')}:{' '}
                              {new Date(purchase.expires_at).toLocaleDateString(undefined, {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="bg-muted/30 relative h-1.5 overflow-hidden rounded-full">
                          <div
                            className="absolute inset-0 rounded-full transition-[width] duration-500"
                            style={{
                              width: `${purchase.progress_percent}%`,
                              background: `linear-gradient(90deg, ${zone.mainHex}, ${zone.mainHex}80)`,
                            }}
                          />
                        </div>
                        <div className="text-foreground/20 mt-1 flex justify-between font-mono text-[9px]">
                          <span>{new Date(purchase.created_at).toLocaleDateString()}</span>
                          <span>{new Date(purchase.expires_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── Autopay Toggle ─── */}
              {!subscription.is_trial && !subscription.is_daily && (
                <div className="bg-muted/30 flex items-center justify-between rounded-[14px] p-3.5">
                  <div>
                    <div className="text-foreground text-sm font-semibold">
                      {t('subscription.autoRenewal')}
                    </div>
                    <div className="text-foreground/30 mt-0.5 text-[11px]">
                      {t('subscription.daysBeforeExpiry', {
                        count: subscription.autopay_days_before,
                      })}
                    </div>
                  </div>
                  <Button
                    onClick={() => autopayMutation.mutate(!subscription.autopay_enabled)}
                    disabled={autopayMutation.isPending}
                    variant="ghost"
                    className="relative h-7 w-13 rounded-full p-0 transition-colors duration-300"
                    style={{
                      background: subscription.autopay_enabled ? zone.mainHex : undefined,
                    }}
                  >
                    <span
                      className="absolute top-0.75 size-5.5 rounded-full bg-white transition-[left] duration-300"
                      style={{
                        left: subscription.autopay_enabled ? '26px' : '3px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }}
                    />
                  </Button>
                </div>
              )}
            </div>
          );
        })()
      ) : (
        <div className="bg-card relative overflow-hidden rounded-3xl py-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="text-muted-foreground/60"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
          </div>
          <div className="text-foreground/30 text-sm">{t('subscription.noSubscription')}</div>
        </div>
      )}

      {/* Daily Subscription Pause */}
      {subscription && subscription.is_daily && !subscription.is_trial && (
        <div
          className="bg-card relative overflow-hidden rounded-3xl shadow-sm"
          style={{
            padding: '24px 28px',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-foreground text-base font-bold tracking-tight">
                {t('subscription.pause.title')}
              </h2>
              <div className="text-foreground/35 mt-1 text-xs">
                {subscription.is_limited
                  ? t('subscription.trafficLimited')
                  : subscription.status === 'disabled'
                    ? t('subscription.pause.suspended')
                    : subscription.is_daily_paused
                      ? t('subscription.pause.paused')
                      : t('subscription.pause.active')}
              </div>
            </div>
            <Button
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
              variant="ghost"
              className="h-auto rounded-[10px] px-4 py-2 text-sm font-semibold"
              style={{
                background:
                  subscription.is_daily_paused || subscription.status === 'disabled'
                    ? 'rgba(var(--color-accent-400), 0.12)'
                    : 'rgba(255,184,0,0.12)',
                border:
                  subscription.is_daily_paused || subscription.status === 'disabled'
                    ? '1px solid rgba(var(--color-accent-400), 0.2)'
                    : '1px solid rgba(255,184,0,0.2)',
                color:
                  subscription.is_daily_paused || subscription.status === 'disabled'
                    ? 'rgb(var(--color-accent-400))'
                    : '#FFB800',
              }}
            >
              {pauseMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                </span>
              ) : subscription.is_daily_paused || subscription.status === 'disabled' ? (
                t('subscription.pause.resumeBtn')
              ) : (
                t('subscription.pause.pauseBtn')
              )}
            </Button>
          </div>

          {/* Pause mutation error */}
          {pauseMutation.isError &&
            (() => {
              const balanceError = getInsufficientBalanceError(pauseMutation.error);
              if (balanceError) {
                const missingAmount = balanceError.required - balanceError.balance;
                return (
                  <div className="mt-4">
                    <InsufficientBalancePrompt
                      missingAmountKopeks={missingAmount}
                      message={t('subscription.pause.insufficientBalance')}
                      compact
                    />
                  </div>
                );
              }
              return (
                <div
                  className="mt-4 rounded-[10px] p-3 text-center text-sm"
                  style={{
                    background: 'rgba(255,59,92,0.08)',
                    border: '1px solid rgba(255,59,92,0.15)',
                    color: '#FF3B5C',
                  }}
                >
                  {getErrorMessage(pauseMutation.error)}
                </div>
              );
            })()}

          {/* Paused info or Next charge progress bar */}
          {subscription.is_daily_paused ? (
            <div
              className="rounded-linear-lg mt-4 p-4"
              style={{
                background: 'rgba(255,184,0,0.06)',
                border: '1px solid rgba(255,184,0,0.12)',
              }}
            >
              <div className="flex items-start gap-3">
                <div className="text-lg" style={{ color: '#FFB800' }}>
                  ⏸️
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: '#FFB800' }}>
                    {t('subscription.pause.pausedInfo')}
                  </div>
                  <div className="text-foreground/35 mt-1 text-xs">
                    {t('subscription.pause.pausedDescription')}{' '}
                    {new Date(subscription.end_date).toLocaleDateString()} (
                    {t('subscription.pause.days', { count: subscription.days_left })})
                  </div>
                </div>
              </div>
            </div>
          ) : (
            subscription.next_daily_charge_at &&
            (() => {
              const now = new Date();
              const nextChargeStr = subscription.next_daily_charge_at.endsWith('Z')
                ? subscription.next_daily_charge_at
                : subscription.next_daily_charge_at + 'Z';
              const nextCharge = new Date(nextChargeStr);
              const totalMs = 24 * 60 * 60 * 1000;
              const remainingMs = Math.max(0, nextCharge.getTime() - now.getTime());
              const elapsedMs = totalMs - remainingMs;
              const progress = Math.min(100, (elapsedMs / totalMs) * 100);

              const hours = Math.floor(remainingMs / (1000 * 60 * 60));
              const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

              return (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-foreground/35 text-[11px] font-medium tracking-wider uppercase">
                      {t('subscription.pause.nextCharge')}
                    </span>
                    <span className="text-foreground font-mono text-xs font-semibold">
                      {hours > 0
                        ? `${hours}${t('subscription.pause.hours')} ${minutes}${t('subscription.pause.minutes')}`
                        : `${minutes}${t('subscription.pause.minutes')}`}
                    </span>
                  </div>
                  <div className="bg-muted/30 relative h-2 overflow-hidden rounded-full">
                    <div
                      className="absolute inset-0 rounded-full transition-[width] duration-500"
                      style={{
                        width: `${progress}%`,
                        background:
                          'linear-gradient(90deg, rgb(var(--color-accent-500)), rgb(var(--color-accent-400)))',
                      }}
                    />
                  </div>
                  {subscription.daily_price_kopeks && (
                    <div className="text-foreground/25 mt-2 text-center text-[11px]">
                      {t('subscription.pause.willBeCharged')}:{' '}
                      {formatPrice(subscription.daily_price_kopeks)}
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Purchase / Renewal CTA */}
      <PurchaseCTAButton subscription={subscription} isMultiTariff={isMultiTariff} />

      {/* Delete expired subscription */}
      {isMultiTariff && subscription && !subscription.is_active && !subscription.is_trial && (
        <div className="space-y-3">
          {!showDeleteSheet ? (
            <Button
              variant="destructive"
              onClick={async () => {
                if (platform === 'telegram') {
                  const confirmed = await destructiveConfirm(
                    t(
                      'subscription.deleteWarning',
                      'Подписка будет удалена безвозвратно. Все данные, устройства и настройки будут потеряны.',
                    ),
                    t('subscription.confirmDelete', 'Да, удалить'),
                    t('subscription.deleteTitle', 'Удалить подписку?'),
                  );
                  if (!confirmed) return;
                  setDeleteLoading(true);
                  try {
                    await subscriptionApi.deleteSubscription(subscription.id);
                    queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
                    navigate('/subscriptions', { replace: true });
                  } catch {
                    setDeleteLoading(false);
                  }
                } else {
                  setShowDeleteSheet(true);
                }
              }}
              disabled={deleteLoading}
              className="w-full gap-2"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              {t('subscription.delete', 'Удалить подписку')}
            </Button>
          ) : (
            <div
              className="rounded-2xl border border-red-400/20 p-4"
              style={{ background: 'rgba(255,59,92,0.04)' }}
            >
              <div className="mb-3 text-sm font-semibold text-red-400">
                {t('subscription.deleteTitle', 'Удалить подписку?')}
              </div>
              <div className="text-muted-foreground mb-4 text-xs">
                {t(
                  'subscription.deleteWarning',
                  'Подписка будет удалена безвозвратно. Все данные, устройства и настройки будут потеряны. Это действие нельзя отменить.',
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={async () => {
                    setDeleteLoading(true);
                    try {
                      await subscriptionApi.deleteSubscription(subscription.id);
                      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
                      navigate('/subscriptions', { replace: true });
                    } catch {
                      setDeleteLoading(false);
                      setShowDeleteSheet(false);
                    }
                  }}
                  disabled={deleteLoading}
                  className="flex-1"
                >
                  {deleteLoading
                    ? t('common.processing', 'Удаление...')
                    : t('subscription.confirmDelete', 'Да, удалить')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteSheet(false)}
                  className="flex-1"
                >
                  {t('common.cancel', 'Отмена')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Additional Options (Buy Devices) */}
      {subscription &&
        (subscription.is_active || subscription.is_limited) &&
        !subscription.is_trial &&
        subscription.device_limit !== 0 && (
          <div
            className="bg-card relative overflow-hidden rounded-3xl shadow-sm"
            style={{
              padding: '24px 28px',
            }}
          >
            <h2 className="text-foreground mb-4 text-base font-bold tracking-tight">
              {t('subscription.additionalOptions.title')}
            </h2>

            {/* Buy Devices */}
            {!showDeviceTopup ? (
              <Button
                onClick={() => setShowDeviceTopup(true)}
                variant="ghost"
                className="border-border/50 bg-card/50 hover:border-border h-auto w-full justify-start rounded-xl border p-4 text-left transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-foreground font-medium">
                      {t('subscription.additionalOptions.buyDevices')}
                    </div>
                    <div className="text-muted-foreground mt-1 text-sm">
                      {t('subscription.additionalOptions.currentDeviceLimit', {
                        count: subscription.device_limit,
                      })}
                    </div>
                  </div>
                  <svg
                    className="text-muted-foreground h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Button>
            ) : (
              <div className="border-border/50 bg-card/50 rounded-xl border p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-foreground font-medium">{t('subscription.buyDevices')}</h3>
                  <Button
                    onClick={() => setShowDeviceTopup(false)}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground/80"
                  >
                    ✕
                  </Button>
                </div>

                {/* Check if completely unavailable (no subscription, price not set, etc.) */}
                {devicePriceData?.available === false ? (
                  <div className="text-muted-foreground py-4 text-center text-sm">
                    {devicePriceData.reason ||
                      t('subscription.additionalOptions.devicesUnavailable')}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Device selector - show even at max limit */}
                    <div className="flex items-center justify-center gap-6">
                      <Button
                        variant="secondary"
                        onClick={() => setDevicesToAdd(Math.max(1, devicesToAdd - 1))}
                        disabled={devicesToAdd <= 1}
                        className="h-12 w-12 p-0 text-2xl"
                      >
                        -
                      </Button>
                      <div className="text-center">
                        <div className="text-foreground text-4xl font-bold">{devicesToAdd}</div>
                        <div className="text-muted-foreground text-sm">
                          {t('subscription.additionalOptions.devicesUnit')}
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => setDevicesToAdd(devicesToAdd + 1)}
                        disabled={
                          devicePriceData?.max_device_limit
                            ? (devicePriceData.current_device_limit || 0) + devicesToAdd >=
                              devicePriceData.max_device_limit
                            : false
                        }
                        className="h-12 w-12 p-0 text-2xl"
                      >
                        +
                      </Button>
                    </div>

                    {/* Show limit info when at or near max */}
                    {devicePriceData?.max_device_limit && (
                      <div className="text-muted-foreground text-center text-sm">
                        {t('subscription.additionalOptions.currentDeviceLimit', {
                          count: devicePriceData.current_device_limit || subscription.device_limit,
                        })}{' '}
                        /{' '}
                        {t('subscription.additionalOptions.maxDevices', {
                          count: devicePriceData.max_device_limit,
                        })}
                      </div>
                    )}

                    {/* Price info - only when available */}
                    {devicePriceData?.available && devicePriceData.price_per_device_label && (
                      <div className="text-center">
                        <div className="text-muted-foreground mb-2 text-sm">
                          {/* Show original price with strikethrough if discount */}
                          {devicePriceData.discount_percent &&
                          devicePriceData.discount_percent > 0 ? (
                            <span>
                              <span className="text-muted-foreground line-through">
                                {formatPrice(devicePriceData.original_price_per_device_kopeks || 0)}
                              </span>
                              <span className="mx-1">{devicePriceData.price_per_device_label}</span>
                            </span>
                          ) : (
                            devicePriceData.price_per_device_label
                          )}
                          /{t('subscription.perDevice').replace('/ ', '')} (
                          {t('subscription.days', { count: devicePriceData.days_left })})
                        </div>
                        {/* Discount badge */}
                        {devicePriceData.discount_percent &&
                          devicePriceData.discount_percent > 0 && (
                            <div className="mb-2">
                              <span className="bg-success-500/20 text-success-400 inline-block rounded-full px-2.5 py-0.5 text-sm font-medium">
                                -{devicePriceData.discount_percent}%
                              </span>
                            </div>
                          )}
                        {/* Total price - show as free if 100% discount or 0 */}
                        {devicePriceData.total_price_kopeks === 0 ? (
                          <div className="text-success-400 text-2xl font-bold">
                            {t('subscription.switchTariff.free')}
                          </div>
                        ) : (
                          <div className="text-accent-400 text-2xl font-bold">
                            {/* Show original total with strikethrough if discount */}
                            {devicePriceData.discount_percent &&
                              devicePriceData.discount_percent > 0 &&
                              devicePriceData.base_total_price_kopeks && (
                                <span className="text-muted-foreground mr-2 text-lg line-through">
                                  {formatPrice(devicePriceData.base_total_price_kopeks)}
                                </span>
                              )}
                            {devicePriceData.total_price_label}
                          </div>
                        )}
                      </div>
                    )}

                    {devicePriceData?.available &&
                      purchaseOptions &&
                      devicePriceData.total_price_kopeks &&
                      devicePriceData.total_price_kopeks > purchaseOptions.balance_kopeks && (
                        <InsufficientBalancePrompt
                          missingAmountKopeks={
                            devicePriceData.total_price_kopeks - purchaseOptions.balance_kopeks
                          }
                          compact
                          onBeforeTopUp={async () => {
                            await subscriptionApi.saveDevicesCart(devicesToAdd, subscriptionId);
                          }}
                        />
                      )}

                    <Button
                      onClick={() => devicePurchaseMutation.mutate()}
                      disabled={
                        devicePurchaseMutation.isPending ||
                        !devicePriceData?.available ||
                        !!(
                          devicePriceData?.total_price_kopeks &&
                          purchaseOptions &&
                          devicePriceData.total_price_kopeks > purchaseOptions.balance_kopeks
                        )
                      }
                      className="w-full"
                    >
                      {devicePurchaseMutation.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        </span>
                      ) : (
                        t('subscription.additionalOptions.buy')
                      )}
                    </Button>

                    {devicePurchaseMutation.isError && (
                      <div className="text-error-400 text-center text-sm">
                        {getErrorMessage(devicePurchaseMutation.error)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Reduce Devices */}
            <div className="mt-4">
              {!showDeviceReduction ? (
                <Button
                  onClick={() => setShowDeviceReduction(true)}
                  variant="ghost"
                  className="border-border/50 bg-card/50 hover:border-border h-auto w-full justify-start rounded-xl border p-4 text-left transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-foreground font-medium">
                        {t('subscription.additionalOptions.reduceDevices')}
                      </div>
                      <div className="text-muted-foreground mt-1 text-sm">
                        {t('subscription.additionalOptions.reduceDevicesDescription')}
                      </div>
                    </div>
                    <svg
                      className="text-muted-foreground h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Button>
              ) : (
                <div className="border-border/50 bg-card/50 rounded-xl border p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-foreground font-medium">
                      {t('subscription.additionalOptions.reduceDevicesTitle')}
                    </h3>
                    <Button
                      onClick={() => setShowDeviceReduction(false)}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground/80"
                    >
                      ✕
                    </Button>
                  </div>

                  {deviceReductionInfo?.available === false ? (
                    <div className="text-muted-foreground py-4 text-center text-sm">
                      {deviceReductionInfo.reason ||
                        t('subscription.additionalOptions.reduceUnavailable')}
                    </div>
                  ) : deviceReductionInfo ? (
                    <div className="space-y-4">
                      {/* Device limit selector */}
                      <div className="flex items-center justify-center gap-6">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            setTargetDeviceLimit(
                              Math.max(
                                Math.max(
                                  deviceReductionInfo.min_device_limit,
                                  deviceReductionInfo.connected_devices_count,
                                ),
                                targetDeviceLimit - 1,
                              ),
                            )
                          }
                          disabled={
                            targetDeviceLimit <=
                            Math.max(
                              deviceReductionInfo.min_device_limit,
                              deviceReductionInfo.connected_devices_count,
                            )
                          }
                          className="h-12 w-12 p-0 text-2xl"
                        >
                          -
                        </Button>
                        <div className="text-center">
                          <div className="text-foreground text-4xl font-bold">
                            {targetDeviceLimit}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            {t('subscription.additionalOptions.devicesUnit')}
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() =>
                            setTargetDeviceLimit(
                              Math.min(
                                deviceReductionInfo.current_device_limit - 1,
                                targetDeviceLimit + 1,
                              ),
                            )
                          }
                          disabled={
                            targetDeviceLimit >= deviceReductionInfo.current_device_limit - 1
                          }
                          className="h-12 w-12 p-0 text-2xl"
                        >
                          +
                        </Button>
                      </div>

                      {/* Info */}
                      <div className="text-muted-foreground space-y-1 text-center text-sm">
                        <div>
                          {t('subscription.additionalOptions.currentDeviceLimit', {
                            count: deviceReductionInfo.current_device_limit,
                          })}
                        </div>
                        <div>
                          {t('subscription.additionalOptions.minDeviceLimit', {
                            count: deviceReductionInfo.min_device_limit,
                          })}
                        </div>
                        <div>
                          {t('subscription.additionalOptions.connectedDevices', {
                            count: deviceReductionInfo.connected_devices_count,
                          })}
                        </div>
                      </div>

                      {/* Warning if connected devices block reduction */}
                      {deviceReductionInfo.connected_devices_count >
                        deviceReductionInfo.min_device_limit && (
                        <div className="bg-warning-500/10 text-warning-400 rounded-lg p-3 text-center text-sm">
                          {t('subscription.additionalOptions.disconnectDevicesFirst', {
                            count: deviceReductionInfo.connected_devices_count,
                          })}
                        </div>
                      )}

                      {/* New limit preview */}
                      <div className="text-center">
                        <div className="text-muted-foreground text-sm">
                          {t('subscription.additionalOptions.newDeviceLimit', {
                            count: targetDeviceLimit,
                          })}
                        </div>
                      </div>

                      <Button
                        onClick={() => deviceReductionMutation.mutate()}
                        disabled={
                          deviceReductionMutation.isPending ||
                          targetDeviceLimit >= deviceReductionInfo.current_device_limit ||
                          targetDeviceLimit < deviceReductionInfo.min_device_limit ||
                          targetDeviceLimit < deviceReductionInfo.connected_devices_count
                        }
                        className="w-full"
                      >
                        {deviceReductionMutation.isPending ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            {t('subscription.additionalOptions.reducing')}
                          </span>
                        ) : (
                          t('subscription.additionalOptions.reduce')
                        )}
                      </Button>

                      {deviceReductionMutation.isError && (
                        <div className="text-error-400 text-center text-sm">
                          {getErrorMessage(deviceReductionMutation.error)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-4">
                      <span className="border-accent-400/30 border-t-accent-400 h-5 w-5 animate-spin rounded-full border-2" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Buy Traffic */}
            {subscription.traffic_limit_gb > 0 && (
              <div className="mt-4">
                {!showTrafficTopup ? (
                  <Button
                    onClick={() => setShowTrafficTopup(true)}
                    variant="ghost"
                    className="border-border/50 bg-card/50 hover:border-border h-auto w-full justify-start rounded-xl border p-4 text-left transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-foreground font-medium">
                          {t('subscription.additionalOptions.buyTraffic')}
                        </div>
                        <div className="text-muted-foreground mt-1 text-sm">
                          {t('subscription.additionalOptions.currentTrafficLimit', {
                            limit: subscription.traffic_limit_gb,
                            used: subscription.traffic_used_gb.toFixed(1),
                          })}
                        </div>
                      </div>
                      <svg
                        className="text-muted-foreground h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Button>
                ) : (
                  <div className="border-border/50 bg-card/50 rounded-xl border p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-foreground font-medium">
                        {t('subscription.additionalOptions.buyTrafficTitle')}
                      </h3>
                      <Button
                        onClick={() => {
                          setShowTrafficTopup(false);
                          setSelectedTrafficPackage(null);
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground/80"
                      >
                        ✕
                      </Button>
                    </div>

                    <div className="bg-muted/30 text-muted-foreground mb-4 rounded-lg p-2 text-xs">
                      ⚠️ {t('subscription.additionalOptions.trafficWarning')}
                    </div>

                    {!trafficPackages || trafficPackages.length === 0 ? (
                      <div className="text-muted-foreground py-4 text-center text-sm">
                        {t('subscription.additionalOptions.trafficUnavailable')}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          {trafficPackages.map((pkg) => (
                            <Button
                              key={pkg.gb}
                              onClick={() => setSelectedTrafficPackage(pkg.gb)}
                              variant="ghost"
                              className={`h-auto flex-col rounded-xl border p-4 text-center transition-all ${
                                selectedTrafficPackage === pkg.gb
                                  ? 'border-accent-500 bg-accent-500/10'
                                  : 'border-border/50 bg-card/50 hover:border-border'
                              }`}
                            >
                              <div className="text-foreground text-lg font-semibold">
                                {pkg.is_unlimited
                                  ? '♾️ ' + t('subscription.additionalOptions.unlimited')
                                  : `${pkg.gb} ${t('common.units.gb')}`}
                              </div>
                              {/* Discount badge */}
                              {pkg.discount_percent && pkg.discount_percent > 0 && (
                                <div className="mb-1">
                                  <span className="bg-success-500/20 text-success-400 inline-block rounded-full px-2 py-0.5 text-xs font-medium">
                                    -{pkg.discount_percent}%
                                  </span>
                                </div>
                              )}
                              {/* Price with original strikethrough if discount */}
                              <div className="text-accent-400 font-medium">
                                {pkg.discount_percent &&
                                pkg.discount_percent > 0 &&
                                pkg.base_price_kopeks ? (
                                  <>
                                    <span className="text-muted-foreground mr-1 text-sm line-through">
                                      {formatPrice(pkg.base_price_kopeks)}
                                    </span>
                                    {formatPrice(pkg.price_kopeks)}
                                  </>
                                ) : (
                                  formatPrice(pkg.price_kopeks)
                                )}
                              </div>
                            </Button>
                          ))}
                        </div>

                        {selectedTrafficPackage !== null &&
                          (() => {
                            const selectedPkg = trafficPackages.find(
                              (p) => p.gb === selectedTrafficPackage,
                            );
                            const hasEnoughBalance =
                              !selectedPkg ||
                              !purchaseOptions ||
                              selectedPkg.price_kopeks <= purchaseOptions.balance_kopeks;
                            const missingAmount =
                              selectedPkg && purchaseOptions
                                ? selectedPkg.price_kopeks - purchaseOptions.balance_kopeks
                                : 0;

                            return (
                              <>
                                {!hasEnoughBalance && missingAmount > 0 && (
                                  <InsufficientBalancePrompt
                                    missingAmountKopeks={missingAmount}
                                    compact
                                    className="mb-3"
                                    onBeforeTopUp={async () => {
                                      await subscriptionApi.saveTrafficCart(
                                        selectedTrafficPackage,
                                        subscriptionId,
                                      );
                                    }}
                                  />
                                )}
                                <Button
                                  onClick={() =>
                                    trafficPurchaseMutation.mutate(selectedTrafficPackage)
                                  }
                                  disabled={trafficPurchaseMutation.isPending || !hasEnoughBalance}
                                  className="w-full"
                                >
                                  {trafficPurchaseMutation.isPending ? (
                                    <span className="flex items-center justify-center gap-2">
                                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    </span>
                                  ) : selectedPkg?.is_unlimited ? (
                                    t('subscription.additionalOptions.buyUnlimited')
                                  ) : (
                                    t('subscription.additionalOptions.buyTrafficGb', {
                                      gb: selectedTrafficPackage,
                                    })
                                  )}
                                </Button>
                              </>
                            );
                          })()}

                        {trafficPurchaseMutation.isError && (
                          <div className="text-error-400 text-center text-sm">
                            {getErrorMessage(trafficPurchaseMutation.error)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Server Management - only in classic mode */}
            {!isTariffsMode && (
              <div className="mt-4">
                {!showServerManagement ? (
                  <Button
                    onClick={() => setShowServerManagement(true)}
                    variant="ghost"
                    className="border-border/50 bg-card/50 hover:border-border h-auto w-full justify-start rounded-xl border p-4 text-left transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-foreground font-medium">
                          {t('subscription.additionalOptions.manageServers')}
                        </div>
                        <div className="text-muted-foreground mt-1 text-sm">
                          {t('subscription.servers', { count: subscription.servers?.length || 0 })}
                        </div>
                      </div>
                      <svg
                        className="text-muted-foreground h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Button>
                ) : (
                  <div className="border-border/50 bg-card/50 rounded-xl border p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-foreground font-medium">
                        {t('subscription.additionalOptions.manageServersTitle')}
                      </h3>
                      <Button
                        onClick={() => {
                          setShowServerManagement(false);
                          setSelectedServersToUpdate([]);
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground/80"
                      >
                        ✕
                      </Button>
                    </div>

                    {countriesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="border-accent-500 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
                      </div>
                    ) : countriesData && countriesData.countries.length > 0 ? (
                      <div className="space-y-4">
                        <div className="bg-muted/30 text-muted-foreground rounded-lg p-2 text-xs">
                          {t('subscription.serverManagement.statusLegend')}
                        </div>

                        {countriesData.discount_percent > 0 && (
                          <div className="border-success-500/30 bg-success-500/10 text-success-400 rounded-lg border p-2 text-xs">
                            🎁{' '}
                            {t('subscription.serverManagement.discountBanner', {
                              percent: countriesData.discount_percent,
                            })}
                          </div>
                        )}

                        <div className="max-h-64 space-y-2 overflow-y-auto">
                          {countriesData.countries
                            .filter((country) => country.is_available || country.is_connected)
                            .map((country) => {
                              const isCurrentlyConnected = country.is_connected;
                              const isSelected = selectedServersToUpdate.includes(country.uuid);
                              const willBeAdded = !isCurrentlyConnected && isSelected;
                              const willBeRemoved = isCurrentlyConnected && !isSelected;

                              return (
                                <Button
                                  key={country.uuid}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedServersToUpdate((prev) =>
                                        prev.filter((u) => u !== country.uuid),
                                      );
                                    } else {
                                      setSelectedServersToUpdate((prev) => [...prev, country.uuid]);
                                    }
                                  }}
                                  disabled={!country.is_available && !isCurrentlyConnected}
                                  variant="ghost"
                                  className={`flex h-auto w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${
                                    isSelected
                                      ? willBeAdded
                                        ? 'border-success-500 bg-success-500/10'
                                        : 'border-accent-500 bg-accent-500/10'
                                      : willBeRemoved
                                        ? 'border-error-500/50 bg-error-500/5'
                                        : 'border-border/50 bg-card/50 hover:border-border'
                                  } ${!country.is_available && !isCurrentlyConnected ? 'cursor-not-allowed opacity-50' : ''}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-lg">
                                      {willBeAdded
                                        ? '➕'
                                        : willBeRemoved
                                          ? '➖'
                                          : isSelected
                                            ? '✅'
                                            : '⚪'}
                                    </span>
                                    <div>
                                      <div className="text-foreground flex items-center gap-2 font-medium">
                                        {country.name}
                                        {country.has_discount && !isCurrentlyConnected && (
                                          <span className="bg-success-500/20 text-success-400 rounded px-1.5 py-0.5 text-xs">
                                            -{country.discount_percent}%
                                          </span>
                                        )}
                                      </div>
                                      {willBeAdded && (
                                        <div className="text-success-400 text-xs">
                                          +{formatPrice(country.price_kopeks)}{' '}
                                          {t('subscription.serverManagement.forDays', {
                                            days: countriesData.days_left,
                                          })}
                                          {country.has_discount && (
                                            <span className="text-muted-foreground ml-1 line-through">
                                              {formatPrice(
                                                Math.round(
                                                  (country.base_price_kopeks *
                                                    countriesData.days_left) /
                                                    30,
                                                ),
                                              )}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      {!willBeAdded && !isCurrentlyConnected && (
                                        <div className="text-muted-foreground text-xs">
                                          {formatPrice(country.price_per_month_kopeks)}
                                          {t('subscription.serverManagement.perMonth')}
                                          {country.has_discount && (
                                            <span className="text-muted-foreground ml-1 line-through">
                                              {formatPrice(country.base_price_kopeks)}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      {!country.is_available && !isCurrentlyConnected && (
                                        <div className="text-muted-foreground text-xs">
                                          {t('subscription.serverManagement.unavailable')}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {country.country_code && (
                                    <span className="text-xl">
                                      {getFlagEmoji(country.country_code)}
                                    </span>
                                  )}
                                </Button>
                              );
                            })}
                        </div>

                        {(() => {
                          const currentConnected = countriesData.countries
                            .filter((c) => c.is_connected)
                            .map((c) => c.uuid);
                          const added = selectedServersToUpdate.filter(
                            (u) => !currentConnected.includes(u),
                          );
                          const removed = currentConnected.filter(
                            (u) => !selectedServersToUpdate.includes(u),
                          );
                          const hasChanges = added.length > 0 || removed.length > 0;

                          // Calculate cost for added servers
                          const addedServers = countriesData.countries.filter((c) =>
                            added.includes(c.uuid),
                          );
                          const totalCost = addedServers.reduce(
                            (sum, s) => sum + s.price_kopeks,
                            0,
                          );
                          const hasEnoughBalance =
                            !purchaseOptions || totalCost <= purchaseOptions.balance_kopeks;
                          const missingAmount = purchaseOptions
                            ? totalCost - purchaseOptions.balance_kopeks
                            : 0;

                          return hasChanges ? (
                            <div className="border-border/50 space-y-3 border-t pt-3">
                              {added.length > 0 && (
                                <div className="text-sm">
                                  <span className="text-success-400">
                                    {t('subscription.serverManagement.toAdd')}
                                  </span>{' '}
                                  <span className="text-muted-foreground">
                                    {addedServers.map((s) => s.name).join(', ')}
                                  </span>
                                </div>
                              )}
                              {removed.length > 0 && (
                                <div className="text-sm">
                                  <span className="text-error-400">
                                    {t('subscription.serverManagement.toDisconnect')}
                                  </span>{' '}
                                  <span className="text-muted-foreground">
                                    {countriesData.countries
                                      .filter((c) => removed.includes(c.uuid))
                                      .map((s) => s.name)
                                      .join(', ')}
                                  </span>
                                </div>
                              )}
                              {totalCost > 0 && (
                                <div className="text-center">
                                  <div className="text-muted-foreground text-sm">
                                    {t('subscription.serverManagement.paymentProrated')}
                                  </div>
                                  <div className="text-accent-400 text-xl font-bold">
                                    {formatPrice(totalCost)}
                                  </div>
                                </div>
                              )}

                              {totalCost > 0 && !hasEnoughBalance && missingAmount > 0 && (
                                <InsufficientBalancePrompt
                                  missingAmountKopeks={missingAmount}
                                  compact
                                />
                              )}

                              <Button
                                onClick={() =>
                                  updateCountriesMutation.mutate(selectedServersToUpdate)
                                }
                                disabled={
                                  updateCountriesMutation.isPending ||
                                  selectedServersToUpdate.length === 0 ||
                                  (totalCost > 0 && !hasEnoughBalance)
                                }
                                className="w-full"
                              >
                                {updateCountriesMutation.isPending ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                  </span>
                                ) : (
                                  t('subscription.serverManagement.applyChanges')
                                )}
                              </Button>
                            </div>
                          ) : (
                            <div className="text-muted-foreground py-2 text-center text-sm">
                              {t('subscription.serverManagement.selectServersHint')}
                            </div>
                          );
                        })()}

                        {updateCountriesMutation.isError && (
                          <div className="text-error-400 text-center text-sm">
                            {getErrorMessage(updateCountriesMutation.error)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground py-4 text-center text-sm">
                        {t('subscription.serverManagement.noServersAvailable')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {/* My Devices Section */}
      {subscription && (
        <div
          className="bg-card relative overflow-hidden rounded-3xl shadow-sm"
          style={{
            padding: '24px 28px',
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-foreground text-base font-bold tracking-tight">
              {t('subscription.myDevices')}
            </h2>
            {devicesData && devicesData.devices.length > 0 && (
              <Button
                onClick={() => {
                  if (confirm(t('subscription.confirmDeleteAllDevices'))) {
                    deleteAllDevicesMutation.mutate();
                  }
                }}
                disabled={deleteAllDevicesMutation.isPending}
                variant="ghost"
                size="sm"
                className="text-[11px] font-medium"
                style={{ color: '#FF3B5C' }}
              >
                {t('subscription.deleteAllDevices')}
              </Button>
            )}
          </div>

          {devicesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
                style={{
                  borderColor: 'rgb(var(--color-accent-500))',
                  borderTopColor: 'transparent',
                }}
              />
            </div>
          ) : devicesData && devicesData.devices.length > 0 ? (
            <div className="space-y-2">
              <div className="text-foreground/30 mb-2 font-mono text-[11px]">
                {devicesData.device_limit === 0
                  ? `${devicesData.total} · ∞`
                  : `${devicesData.total} / ${t('subscription.devices', { count: devicesData.device_limit })}`}
              </div>
              {devicesData.devices.map((device) => (
                <div
                  key={device.hwid}
                  className="rounded-linear-lg bg-muted/30 flex items-center justify-between p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-muted/30 flex h-9 w-9 items-center justify-center rounded-[10px]">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="text-muted-foreground"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-foreground text-sm font-semibold">
                        {device.device_model || device.platform}
                      </div>
                      <div className="text-foreground/30 flex items-center gap-1.5 text-[11px]">
                        <span>{device.platform}</span>
                        <span className="text-foreground/20 font-mono">
                          {device.hwid.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      if (confirm(t('subscription.confirmDeleteDevice'))) {
                        deleteDeviceMutation.mutate(device.hwid);
                      }
                    }}
                    disabled={deleteDeviceMutation.isPending}
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground/60"
                    title={t('subscription.deleteDevice')}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-foreground/25 py-8 text-center text-xs">
              {t('subscription.noDevices')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
