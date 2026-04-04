import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type { Subscription } from '../../types';
import { subscriptionApi } from '../../api/subscription';
import { useTheme } from '../../hooks/useTheme';
import { useCurrency } from '../../hooks/useCurrency';
import { useHapticFeedback } from '../../platform/hooks/useHaptic';
import { getInsufficientBalanceError } from '../../utils/subscriptionHelpers';
import { Button } from '@/components/ui/button';

interface SubscriptionCardExpiredProps {
  subscription: Subscription;
  balanceKopeks?: number;
  balanceRubles?: number;
  className?: string;
}

export default function SubscriptionCardExpired({
  subscription,
  balanceKopeks = 0,
  balanceRubles = 0,
  className,
}: SubscriptionCardExpiredProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { formatAmount, currencySymbol } = useCurrency();
  const haptic = useHapticFeedback();

  const [isRenewing, setIsRenewing] = useState(false);
  const [renewError, setRenewError] = useState<string | null>(null);

  const formattedDate = new Date(subscription.end_date).toLocaleDateString();

  // Detect limited (traffic exhausted) state
  const isLimited = subscription.is_limited;

  // Detect daily subscription (disabled or expired)
  const isDaily = subscription.is_daily;
  const isDisabledDaily = subscription.status === 'disabled' && isDaily;

  // For daily subs, check if balance covers daily price; otherwise 100 kopeks minimum
  const dailyPrice = subscription.daily_price_kopeks ?? 0;
  const hasBalance = isDaily ? balanceKopeks >= dailyPrice && dailyPrice > 0 : balanceKopeks >= 100;

  const handleQuickRenew = async () => {
    setIsRenewing(true);
    setRenewError(null);
    haptic.buttonPressHeavy();

    try {
      if (isDisabledDaily) {
        // Resume daily subscription via toggle pause endpoint
        await subscriptionApi.togglePause(subscription.id);
      } else if (isDaily && subscription.tariff_id) {
        // Expired daily tariff — purchase for 1 day
        await subscriptionApi.purchaseTariff(subscription.tariff_id, 1);
      } else {
        await subscriptionApi.renewSubscription(30, subscription.id);
      }
      haptic.success();
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'subscription',
      });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options'] });
    } catch (err: unknown) {
      haptic.error();
      const insufficientData = getInsufficientBalanceError(err);
      if (insufficientData) {
        setRenewError(t('dashboard.expired.insufficientFunds'));
      } else if (err instanceof AxiosError) {
        const detail = err.response?.data?.detail;
        if (typeof detail === 'string') {
          setRenewError(detail);
        } else {
          setRenewError(t('dashboard.expired.renewError'));
        }
      } else {
        setRenewError(t('dashboard.expired.renewError'));
      }
    } finally {
      setIsRenewing(false);
    }
  };

  const handleTopUp = () => {
    haptic.buttonPress();
    const params = new URLSearchParams();
    params.set('returnTo', location.pathname);
    navigate(`/balance/top-up?${params.toString()}`);
  };

  // Color scheme: amber for limited, red for expired/disabled
  const accent = isLimited
    ? {
        r: 255,
        g: 184,
        b: 0,
        hex: '#FFB800',
        gradient: 'linear-gradient(135deg, #FFB800, #FF8C00)',
      }
    : {
        r: 255,
        g: 59,
        b: 92,
        hex: '#FF3B5C',
        gradient: 'linear-gradient(135deg, #FF3B5C, #FF6B35)',
      };

  return (
    <div
      className={`bg-card relative overflow-hidden rounded-3xl shadow-sm ${className ?? ''}`}
      style={{
        border: `1px solid rgba(${accent.r},${accent.g},${accent.b},0.15)`,
        padding: '28px 28px 24px',
      }}
    >
      {/* Glow */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: -60,
          right: -60,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${accent.r},${accent.g},${accent.b},0.08) 0%, transparent 70%)`,
        }}
        aria-hidden="true"
      />
      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: isDark ? 0.02 : 0.04,
          backgroundImage: isDark
            ? `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`
            : `linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px),
               linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
        aria-hidden="true"
      />

      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
          style={{
            background: `rgba(${accent.r},${accent.g},${accent.b},0.1)`,
            border: `1px solid rgba(${accent.r},${accent.g},${accent.b},0.15)`,
          }}
        >
          {isLimited ? (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke={accent.hex}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ) : (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke={accent.hex}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          )}
        </div>
        <h2 className="text-foreground text-lg font-bold tracking-tight">
          {isLimited
            ? t('subscription.trafficLimitedTitle')
            : isDisabledDaily
              ? t('dashboard.suspended.title')
              : subscription.is_trial
                ? t('dashboard.expired.trialTitle')
                : t('dashboard.expired.title')}
        </h2>
      </div>

      {/* Limited description */}
      {isLimited && (
        <p className="text-foreground/60 mb-4 text-sm">
          {t('subscription.trafficLimitedDescription')}
        </p>
      )}

      {/* Expired date + Balance row */}
      <div
        className="mb-5 flex items-center justify-between rounded-[14px]"
        style={{
          background: `rgba(${accent.r},${accent.g},${accent.b},0.04)`,
          border: `1px solid rgba(${accent.r},${accent.g},${accent.b},0.08)`,
          padding: '14px 18px',
        }}
      >
        <div className="flex items-center">
          <div className="text-foreground/30 mb-0.5 font-mono text-[10px] font-medium tracking-wider uppercase">
            {t('dashboard.expired.expiredDate')}
          </div>
          <div className="text-foreground/50 ml-3 text-base font-bold tracking-tight">
            {formattedDate}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-foreground/30 text-[10px] font-medium tracking-wider uppercase">
            {t('dashboard.expired.balance')}
          </span>
          <span
            className={`text-sm font-semibold ${hasBalance ? 'text-success-400' : 'text-foreground/30'}`}
          >
            {formatAmount(balanceRubles)} {currencySymbol}
          </span>
        </div>
      </div>

      {/* Renew error */}
      {renewError && (
        <div
          className="border-error-500/30 bg-error-500/10 text-error-400 mb-4 rounded-xl border p-3 text-center text-sm"
          role="alert"
        >
          {renewError}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2.5">
        {isLimited ? (
          <Link
            to={`/subscriptions/${subscription.id}`}
            className="text-primary-foreground flex flex-1 items-center justify-center gap-2 rounded-[14px] py-3.5 text-[15px] font-semibold tracking-tight transition-all duration-300"
            style={{
              background: accent.gradient,
              boxShadow: `0 4px 20px rgba(${accent.r},${accent.g},${accent.b},0.2)`,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('subscription.trafficLimited')}
          </Link>
        ) : (
          <>
            {/* Quick Renew or Top Up button (hidden for expired trials) */}
            {!subscription.is_trial && (
              <>
                {hasBalance ? (
                  <Button
                    type="button"
                    onClick={handleQuickRenew}
                    disabled={isRenewing}
                    className="text-primary-foreground flex h-auto flex-1 items-center justify-center gap-2 rounded-[14px] py-3.5 text-[15px] font-semibold tracking-tight"
                    style={{
                      background: accent.gradient,
                      boxShadow: `0 4px 20px rgba(${accent.r},${accent.g},${accent.b},0.2)`,
                    }}
                  >
                    {isRenewing ? (
                      <span
                        className="border-primary-foreground/30 border-t-primary-foreground h-4 w-4 animate-spin rounded-full border-2"
                        aria-hidden="true"
                      />
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                    )}
                    {isRenewing
                      ? t('common.loading')
                      : isDisabledDaily
                        ? t('dashboard.suspended.resume')
                        : t('dashboard.expired.quickRenew')}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleTopUp}
                    className="text-primary-foreground flex h-auto flex-1 items-center justify-center gap-2 rounded-[14px] py-3.5 text-[15px] font-semibold tracking-tight"
                    style={{
                      background: accent.gradient,
                      boxShadow: `0 4px 20px rgba(${accent.r},${accent.g},${accent.b},0.2)`,
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    {t('dashboard.expired.topUp')}
                  </Button>
                )}
              </>
            )}

            {/* Tariffs (go to purchase page) — full-width for trials */}
            <Link
              to="/subscription/purchase"
              style={
                subscription.is_trial
                  ? {
                      background: accent.gradient,
                      boxShadow: `0 4px 20px rgba(${accent.r},${accent.g},${accent.b},0.2)`,
                    }
                  : undefined
              }
              className={`flex items-center justify-center rounded-[14px] px-5 py-3.5 text-[15px] font-semibold tracking-tight transition-colors duration-200 ${
                subscription.is_trial
                  ? 'text-primary-foreground flex-1'
                  : 'bg-muted/30 border-border/50 text-foreground/50 border'
              }`}
            >
              {t('dashboard.expired.tariffs')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
