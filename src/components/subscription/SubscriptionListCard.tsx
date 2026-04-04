import { useTranslation } from 'react-i18next';
import { useHaptic } from '../../platform';
import type { SubscriptionListItem } from '../../types';
import { Button } from '@/components/ui/button';
import { CalendarClock, MonitorSmartphone } from 'lucide-react';

function formatDate(iso: string | null, locale?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(locale ?? undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function StatusBadge({
  status,
  isTrial,
  t,
}: {
  status: string;
  isTrial: boolean;
  t: (key: string, fallback: string) => string;
}) {
  const isActive = status === 'active' || status === 'trial';
  const isLimited = status === 'limited';
  const isExpired = status === 'expired' || status === 'disabled';

  if (isTrial) {
    return (
      <span className="border-warning-500/25 bg-warning-500/10 text-warning-500 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold">
        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
        {t('subscription.statusTrial', 'Тестовая')}
      </span>
    );
  }

  const color = isActive
    ? 'bg-success-500/15 text-success-500 border-success-500/20'
    : isLimited
      ? 'bg-warning-500/15 text-warning-500 border-warning-500/20'
      : 'bg-error-500/15 text-error-500 border-error-500/20';

  const label = isActive
    ? t('subscription.statusActive', 'Активна')
    : isLimited
      ? t('subscription.statusLimited', 'Ограничена')
      : isExpired
        ? t('subscription.statusExpired', 'Истекла')
        : status;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${color}`}
    >
      {label}
    </span>
  );
}

export default function SubscriptionListCard({
  subscription,
  onClick,
}: {
  subscription: SubscriptionListItem;
  onClick: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { impact } = useHaptic();

  const handleClick = () => {
    impact('light');
    onClick();
  };

  const isTrial = subscription.is_trial;
  const isActive = subscription.status === 'active' || subscription.status === 'trial';
  const isExpired = subscription.status === 'expired' || subscription.status === 'disabled';
  const trafficLimit = subscription.traffic_limit_gb;
  const trafficUsed = subscription.traffic_used_gb;
  const isUnlimited = trafficLimit === 0;
  const trafficPercent = isUnlimited
    ? 0
    : trafficLimit > 0
      ? Math.min(100, (trafficUsed / trafficLimit) * 100)
      : 0;
  const trafficColor =
    trafficPercent >= 90
      ? 'bg-error-500'
      : trafficPercent >= 70
        ? 'bg-warning-500'
        : 'bg-success-500';

  const cardClasses = isTrial
    ? 'border-amber-500/20 bg-amber-500/4'
    : isExpired
      ? 'border-destructive-500/15 bg-destructive-500/4'
      : 'border-border bg-card';

  return (
    <Button
      variant="ghost"
      onClick={handleClick}
      className={`flex h-auto w-full flex-col rounded-2xl border p-4 text-left hover:scale-[1.01] active:scale-[0.99] ${cardClasses}`}
    >
      {/* Header: tariff name + status badge + chevron */}
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-foreground truncate text-base font-semibold">
            {subscription.tariff_name || t('subscription.defaultName', 'Подписка')}
          </span>
          <StatusBadge status={subscription.status} isTrial={isTrial} t={t} />
        </div>
        <svg
          className="h-4 w-4 shrink-0 opacity-30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>

      {/* Traffic mini progress bar */}
      {isActive && (
        <div className="mt-3 w-full">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-muted-foreground text-[11px] font-medium">
              {t('subscription.traffic', 'Трафик')}
            </span>
            <span className="text-muted-foreground text-[11px] tabular-nums">
              {isUnlimited
                ? '∞'
                : `${trafficUsed.toFixed(1)} / ${trafficLimit} ${t('common.units.gb', 'ГБ')}`}
            </span>
          </div>
          {!isUnlimited && (
            <div className="bg-muted/30 h-6 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full transition-all ${trafficColor}`}
                style={{ width: `${Math.max(1, trafficPercent)}%` }}
              />
            </div>
          )}
          {isUnlimited && (
            <div className="bg-muted/30 h-6 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full transition-all ${trafficColor}`}
                style={{ width: `100%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="text-muted-foreground mt-2.5 flex w-full items-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <MonitorSmartphone className="size-3.5 opacity-50" />
          {subscription.device_limit}
        </span>
        <span className="flex items-center gap-1">
          <CalendarClock className="size-3.5 opacity-50" />
          {formatDate(subscription.end_date, i18n.language)}
        </span>
        {!isTrial &&
          (() => {
            const isDaily = subscription.is_daily;
            const enabled = isDaily ? !subscription.is_daily_paused : subscription.autopay_enabled;
            const label = isDaily
              ? t('subscription.dailyAutoCharge', 'Автосписание')
              : t('subscription.autopay', 'Автопродление');
            return (
              <span
                className={`flex items-center gap-1 ${enabled ? 'text-success-500/70' : 'text-error-500/50'}`}
              >
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  {enabled ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  )}
                </svg>
                {label}
              </span>
            );
          })()}
      </div>
    </Button>
  );
}
