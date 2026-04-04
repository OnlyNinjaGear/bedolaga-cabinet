import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { UseMutationResult } from '@tanstack/react-query';
import type { TrialInfo } from '../../types';
import { useCurrency } from '../../hooks/useCurrency';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '@/components/ui/button';

interface TrialOfferCardProps {
  trialInfo: TrialInfo;
  balanceKopeks: number;
  balanceRubles: number;
  activateTrialMutation: UseMutationResult<unknown, unknown, void, unknown>;
  trialError: string | null;
}

export default function TrialOfferCard({
  trialInfo,
  balanceKopeks,
  balanceRubles,
  activateTrialMutation,
  trialError,
}: TrialOfferCardProps) {
  const { t } = useTranslation();
  const { formatAmount, currencySymbol } = useCurrency();
  const { isDark } = useTheme();
  const isFree = !trialInfo.requires_payment;
  const canAfford = balanceKopeks >= trialInfo.price_kopeks;

  return (
    <div
      className="bg-card relative overflow-hidden rounded-3xl text-center shadow-sm"
      style={{
        border: isFree
          ? '1px solid color-mix(in srgb, var(--primary) 20%, transparent)'
          : '1px solid color-mix(in srgb, var(--color-warning-400) 20%, transparent)',
        padding: '32px 28px 28px',
      }}
    >
      {/* Animated glow background */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2"
        style={{
          top: -100,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: isFree
            ? 'radial-gradient(circle, color-mix(in srgb, var(--primary) 8%, transparent) 0%, transparent 70%)'
            : 'radial-gradient(circle, color-mix(in srgb, var(--color-warning-400) 7%, transparent) 0%, transparent 70%)',
          transition: 'background 0.5s ease',
        }}
        aria-hidden="true"
      />
      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: isDark ? 0.025 : 0.04,
          backgroundImage: isDark
            ? `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`
            : `linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px),
               linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
        aria-hidden="true"
      />

      {/* Icon */}
      <div
        className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          background: isDark
            ? isFree
              ? 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 50%, transparent), color-mix(in srgb, var(--primary) 30%, transparent))'
              : 'linear-gradient(135deg, color-mix(in srgb, var(--color-warning-400) 20%, transparent), color-mix(in srgb, var(--color-warning-400) 10%, transparent))'
            : isFree
              ? 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 15%, transparent), color-mix(in srgb, var(--primary) 8%, transparent))'
              : 'linear-gradient(135deg, color-mix(in srgb, var(--color-warning-400) 15%, transparent), color-mix(in srgb, var(--color-warning-400) 8%, transparent))',
          border: isFree
            ? '1px solid color-mix(in srgb, var(--primary) 25%, transparent)'
            : '1px solid color-mix(in srgb, var(--color-warning-400) 25%, transparent)',
          transition: 'all 0.5s ease',
        }}
      >
        {isFree ? (
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-warning-400)"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path
              d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {/* Glow effect */}
        <div
          className="animate-trial-glow absolute inset-[-1px] rounded-2xl"
          style={{
            boxShadow: isFree
              ? '0 0 20px color-mix(in srgb, var(--primary) 15%, transparent)'
              : '0 0 20px color-mix(in srgb, var(--color-warning-400) 12%, transparent)',
          }}
          aria-hidden="true"
        />
      </div>

      {/* Title */}
      <h2 className="text-foreground mb-1.5 text-[22px] font-bold tracking-tight">
        {isFree ? t('dashboard.trialOffer.freeTitle') : t('dashboard.trialOffer.paidTitle')}
      </h2>
      <p className="text-foreground/40 mb-5 text-sm">
        {isFree ? t('dashboard.trialOffer.freeDesc') : t('dashboard.trialOffer.paidDesc')}
      </p>

      {/* Price tag for paid trial */}
      {!isFree && trialInfo.price_rubles > 0 && (
        <div
          className="mb-5 inline-flex items-baseline gap-1 rounded-xl px-5 py-2"
          style={{
            background: 'color-mix(in srgb, var(--color-warning-400) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-warning-400) 15%, transparent)',
          }}
        >
          <span
            className="text-[32px] leading-none font-extrabold tracking-tight"
            style={{ color: 'var(--color-warning-400)' }}
          >
            {trialInfo.price_rubles.toFixed(0)}
          </span>
          <span
            className="text-base font-semibold opacity-70"
            style={{ color: 'var(--color-warning-400)' }}
          >
            {currencySymbol}
          </span>
        </div>
      )}

      {/* Trial stats */}
      <div className="mb-7 flex justify-center gap-8">
        {[
          { value: String(trialInfo.duration_days), label: t('subscription.trial.days') },
          {
            value: trialInfo.traffic_limit_gb === 0 ? '∞' : String(trialInfo.traffic_limit_gb),
            label: t('common.units.gb'),
          },
          {
            value: trialInfo.device_limit === 0 ? '∞' : String(trialInfo.device_limit),
            label: t('subscription.trial.devices'),
          },
        ].map((stat, i) => (
          <div key={i} className="text-center">
            <div className="text-foreground text-4xl leading-none font-extrabold tracking-tight">
              {stat.value}
            </div>
            <div className="text-foreground/30 mt-1 text-xs font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Balance info for paid trial */}
      {!isFree && trialInfo.price_rubles > 0 && (
        <div className="border-border/50 bg-muted/30 mb-4 space-y-2 rounded-xl border p-4 text-left">
          <div className="flex items-center justify-between">
            <span className="text-foreground/40 text-sm">{t('balance.currentBalance')}</span>
            <span
              className={`font-display text-sm font-semibold ${canAfford ? 'text-success-400' : 'text-warning-400'}`}
            >
              {formatAmount(balanceRubles)} {currencySymbol}
            </span>
          </div>
          {!canAfford && (
            <div className="text-warning-400 text-xs">
              {t('subscription.trial.insufficientBalance')}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {trialError && (
        <div className="border-error-500/30 bg-error-500/10 text-error-400 mb-4 rounded-xl border p-3 text-center text-sm">
          {trialError}
        </div>
      )}

      {/* CTA Button */}
      {!isFree && trialInfo.price_kopeks > 0 ? (
        canAfford ? (
          <Button
            onClick={() => !activateTrialMutation.isPending && activateTrialMutation.mutate()}
            disabled={activateTrialMutation.isPending}
            className="h-auto w-full rounded-[14px] py-4 text-base font-bold tracking-tight"
            style={{
              background:
                'linear-gradient(135deg, var(--color-warning-400), var(--color-warning-500))',
              color: 'var(--color-warning-950)',
              boxShadow: '0 4px 20px color-mix(in srgb, var(--color-warning-400) 20%, transparent)',
            }}
          >
            {activateTrialMutation.isPending
              ? t('common.loading')
              : t('subscription.trial.payAndActivate')}
          </Button>
        ) : (
          <Link
            to="/balance"
            className="block w-full rounded-[14px] py-4 text-center text-base font-bold tracking-tight transition-all duration-300"
            style={{
              background:
                'linear-gradient(135deg, var(--color-warning-400), var(--color-warning-500))',
              color: 'var(--color-warning-950)',
              boxShadow: '0 4px 20px color-mix(in srgb, var(--color-warning-400) 20%, transparent)',
            }}
          >
            {t('subscription.trial.topUpToActivate')}
          </Link>
        )
      ) : (
        <Button
          onClick={() => !activateTrialMutation.isPending && activateTrialMutation.mutate()}
          disabled={activateTrialMutation.isPending}
          className="h-auto w-full rounded-[14px] py-4 text-base font-bold tracking-tight"
          style={
            isDark
              ? {
                  background:
                    'linear-gradient(135deg, color-mix(in srgb, var(--primary) 12%, transparent) 0%, color-mix(in srgb, var(--primary) 4%, transparent) 100%)',
                  border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)',
                  color: 'var(--primary-foreground)',
                }
              : {
                  background: 'linear-gradient(135deg, var(--primary), var(--primary))',
                  color: 'var(--primary-foreground)',
                  boxShadow: '0 4px 20px color-mix(in srgb, var(--primary) 25%, transparent)',
                }
          }
        >
          {activateTrialMutation.isPending ? t('common.loading') : t('subscription.trial.activate')}
        </Button>
      )}
    </div>
  );
}
