import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Link } from 'react-router';
import { UseMutationResult } from '@tanstack/react-query';
import TrafficProgressBar from './TrafficProgressBar';
import Sparkline from './Sparkline';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { useTrafficZone } from '../../hooks/useTrafficZone';
import { formatTraffic } from '../../utils/formatTraffic';
import { HoverBorderGradient } from '../ui/hover-border-gradient';
import { useHaptic } from '../../platform';
import type { Subscription } from '../../types';
import { Button } from '@/components/ui/button';

interface SubscriptionCardActiveProps {
  subscription: Subscription;
  trafficData: {
    traffic_used_gb: number;
    traffic_used_percent: number;
    is_unlimited: boolean;
  } | null;
  refreshTrafficMutation: UseMutationResult<unknown, unknown, void, unknown>;
  trafficRefreshCooldown: number;
  connectedDevices: number;
}

const RefreshIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    className={className}
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
);

export default function SubscriptionCardActive({
  subscription,
  trafficData,
  refreshTrafficMutation,
  trafficRefreshCooldown,
  connectedDevices,
}: SubscriptionCardActiveProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const usedPercent = trafficData?.traffic_used_percent ?? subscription.traffic_used_percent;
  const usedGb = trafficData?.traffic_used_gb ?? subscription.traffic_used_gb;
  const isUnlimited = trafficData?.is_unlimited ?? subscription.traffic_limit_gb === 0;
  const zone = useTrafficZone(usedPercent);
  const animatedPercent = useAnimatedNumber(usedPercent);
  const haptic = useHaptic();

  const isAtDeviceLimit =
    subscription.device_limit > 0 && connectedDevices >= subscription.device_limit;

  const formattedDate = new Date(subscription.end_date).toLocaleDateString();
  const daysLeft = subscription.days_left;

  // Sparkline placeholder data (hidden until API provides daily usage)
  const dailyUsage: number[] = [];

  return (
    <div
      className="bg-card relative overflow-hidden rounded-3xl shadow-sm backdrop-blur-xl"
      style={{
        border: subscription.is_trial
          ? '1px solid color-mix(in srgb, var(--primary) 15%, transparent)'
          : `1px solid rgba(${zone.mainVarRaw}, 0.14)`,
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
          background: `radial-gradient(circle, rgba(${zone.mainVarRaw}, 0.06) 0%, transparent 70%)`,
          transition: 'background 0.8s ease',
        }}
        aria-hidden="true"
      />

      {/* ─── Header ─── */}
      <div className="mb-7 flex items-start justify-between">
        <div>
          {/* Zone indicator */}
          <div className="mb-1 flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{
                background: zone.mainVar,
                boxShadow: `0 0 8px rgba(${zone.mainVarRaw}, 0.5)`,
                transition: 'all 0.6s ease',
              }}
              aria-hidden="true"
            />
            <span
              className="font-mono text-[11px] font-semibold tracking-widest uppercase"
              style={{ color: zone.mainVar, transition: 'color 0.6s ease' }}
            >
              {isUnlimited ? t('dashboard.unlimited') : t(zone.labelKey)}
            </span>
            {subscription.is_trial && (
              <span
                className="animate-trial-glow inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[9px] font-bold tracking-widest uppercase"
                style={{
                  background:
                    'linear-gradient(135deg, color-mix(in srgb, var(--primary) 15%, transparent), color-mix(in srgb, var(--primary) 6%, transparent))',
                  border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)',
                  color: 'var(--primary)',
                }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t('subscription.trialStatus')}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-foreground text-lg font-bold tracking-tight">
            {t('dashboard.trafficUsageTitle')}
          </h2>
        </div>

        {/* Big percentage / infinity */}
        <div className="text-right">
          {isUnlimited ? (
            <>
              <div
                className="font-display text-[28px] leading-none font-extrabold tracking-tight"
                style={{ color: zone.mainVar }}
              >
                &#8734;
              </div>
              <div className="text-foreground/30 mt-1 font-mono text-[11px]">
                {formatTraffic(usedGb)} {t('dashboard.usedSuffix')}
              </div>
            </>
          ) : (
            <>
              <div className="font-display text-foreground text-[38px] leading-none font-extrabold tracking-tight">
                {animatedPercent.toFixed(0)}
                <span className="text-foreground/35 ml-px text-lg font-medium">%</span>
              </div>
              <div className="text-foreground/30 mt-0.5 font-mono text-[11px]">
                {formatTraffic(usedGb)} / {formatTraffic(subscription.traffic_limit_gb)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── Progress Bar ─── */}
      <div className="mb-6">
        <TrafficProgressBar
          usedGb={usedGb}
          limitGb={subscription.traffic_limit_gb}
          percent={usedPercent}
          isUnlimited={isUnlimited}
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
            navigate(`/connection?sub=${subscription.id}`);
          }}
          className={`mb-2.5 flex w-full items-center gap-3.5 rounded-[14px] p-3.5 text-left transition-shadow duration-300${isAtDeviceLimit ? 'cursor-not-allowed opacity-50' : ''}`}
          data-onboarding="connect-devices"
          style={{ fontFamily: 'inherit' }}
        >
          {/* Monitor icon */}
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-500"
            style={{ background: `rgba(${zone.mainVarRaw}, 0.07)` }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={zone.mainVar}
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

          {/* Text */}
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
                style={{ color: 'var(--color-warning-400)' }}
              >
                {t('dashboard.deviceLimitReached')}
              </div>
            )}
          </div>

          {/* Device indicator */}
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
                  className="h-1.75 w-1.75 rounded-full transition-all duration-300"
                  style={{
                    background: i < connectedDevices ? zone.mainVar : 'var(--muted-foreground)',
                    opacity: i < connectedDevices ? 1 : 0.2,
                    boxShadow:
                      i < connectedDevices ? `0 0 6px rgba(${zone.mainVarRaw}, 0.31)` : 'none',
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex w-16 shrink-0 items-center" aria-hidden="true">
              <div className="bg-muted-foreground/20 h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round((connectedDevices / subscription.device_limit) * 100)}%`,
                    background: zone.mainVar,
                    boxShadow: `0 0 8px rgba(${zone.mainVarRaw}, 0.25)`,
                    minWidth: connectedDevices > 0 ? '4px' : '0px',
                  }}
                />
              </div>
            </div>
          )}
        </HoverBorderGradient>
      )}

      {/* ─── Stats row: Tariff + Days Left ─── */}
      <div className="mb-5 flex gap-2.5">
        {/* Tariff badge — clickable */}
        <Link
          to={`/subscriptions/${subscription.id}`}
          className="flex-1 rounded-[14px] p-3.5 transition-all duration-500"
          style={{
            background: `linear-gradient(135deg, rgba(${zone.mainVarRaw}, 0.07), rgba(${zone.mainVarRaw}, 0.02))`,
            border: `1px solid rgba(${zone.mainVarRaw}, 0.09)`,
          }}
        >
          <div
            className="mb-1.5 text-[10px] font-semibold tracking-wider uppercase opacity-70 transition-colors duration-500"
            style={{ color: zone.mainVar }}
          >
            {t('dashboard.tariff')}
          </div>
          <div className="text-foreground text-base leading-tight font-bold tracking-tight">
            {subscription.tariff_name || t('subscription.currentPlan')}
          </div>
          <div className="text-foreground/30 mt-0.5 font-mono text-[10px]">
            {t('dashboard.validUntil', { date: formattedDate })}
          </div>
        </Link>

        {/* Days remaining */}
        <div
          className={`bg-muted/30 flex-1 rounded-[14px] p-3.5 transition-colors duration-300 ${daysLeft <= 3 ? 'border-warning-400/20 border' : 'border-border/50 border'}`}
        >
          <div className="text-foreground/35 mb-1 flex items-center gap-1.5 text-[10px] font-medium tracking-wider uppercase">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-[7px] transition-colors duration-300 ${daysLeft <= 3 ? 'bg-warning-400/10' : 'hover:bg-accent/50'}`}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke={daysLeft <= 3 ? 'var(--color-warning-400)' : 'var(--muted-foreground)'}
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
          <div className="flex items-baseline gap-1">
            <span
              className={`text-[22px] font-bold tracking-tight transition-colors duration-300 ${daysLeft <= 3 ? 'text-warning-400' : 'text-foreground'}`}
            >
              {daysLeft}
            </span>
            <span className="text-foreground/25 text-xs font-medium">
              {t('subscription.daysShort')}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Traffic Refresh ─── */}
      <div className="mb-5 flex items-center justify-between px-0.5">
        <Button
          variant="ghost"
          onClick={() => refreshTrafficMutation.mutate()}
          disabled={refreshTrafficMutation.isPending || trafficRefreshCooldown > 0}
          className="text-foreground/35 hover:text-foreground/50 flex h-auto items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
          aria-label={t('common.refresh')}
        >
          <RefreshIcon
            className={`h-3 w-3 ${refreshTrafficMutation.isPending ? 'animate-spin' : ''}`}
          />
          {trafficRefreshCooldown > 0 ? `${trafficRefreshCooldown}s` : t('common.refresh')}
        </Button>
        <Link
          to={`/subscriptions/${subscription.id}`}
          className="text-foreground/25 hover:text-foreground/40 text-[11px] font-medium transition-colors"
        >
          {t('dashboard.viewSubscription')} &rarr;
        </Link>
      </div>

      {/* ─── Sparkline ─── */}
      {dailyUsage.length >= 2 && (
        <div className="border-border/50 bg-muted/30 rounded-[14px] border p-3.5 pb-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-foreground/40 text-[11px] font-medium tracking-wider uppercase">
              {t('dashboard.usageLast14Days')}
            </span>
            <span className="text-foreground/25 font-mono text-[11px]">
              {t('dashboard.maxUsage', { amount: formatTraffic(Math.max(...dailyUsage)) })}
            </span>
          </div>
          <Sparkline data={dailyUsage} width={440} height={44} color={zone.mainVar} />
        </div>
      )}
    </div>
  );
}
