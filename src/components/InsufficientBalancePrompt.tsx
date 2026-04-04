import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../hooks/useCurrency';
import { Button } from '@/components/ui/button';

interface InsufficientBalancePromptProps {
  /** Amount missing in kopeks */
  missingAmountKopeks: number;
  /** Optional custom message */
  message?: string;
  /** Compact mode for inline use */
  compact?: boolean;
  /** Additional className */
  className?: string;
  /** Callback to execute before opening top-up modal (e.g., save cart) */
  onBeforeTopUp?: () => Promise<void>;
}

export default function InsufficientBalancePrompt({
  missingAmountKopeks,
  message,
  compact = false,
  className = '',
  onBeforeTopUp,
}: InsufficientBalancePromptProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { formatAmount, currencySymbol } = useCurrency();
  const [isPreparingTopUp, setIsPreparingTopUp] = useState(false);

  const missingRubles = missingAmountKopeks / 100;
  const displayAmount = formatAmount(missingRubles);

  const handleTopUpClick = async () => {
    if (onBeforeTopUp) {
      setIsPreparingTopUp(true);
      try {
        await onBeforeTopUp();
      } catch {
        // Silently ignore errors - still navigate
      } finally {
        setIsPreparingTopUp(false);
      }
    }
    const params = new URLSearchParams();
    params.set('amount', String(Math.ceil(missingRubles)));
    params.set('returnTo', location.pathname);
    navigate(`/balance/top-up?${params.toString()}`);
  };

  if (compact) {
    return (
      <div
        className={`border-error-500/30 bg-error-500/10 flex items-center justify-between gap-3 rounded-xl border p-3 ${className}`}
      >
        <div className="text-error-400 flex items-center gap-2 text-sm">
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <span>
            {message || t('balance.insufficientFunds')}:{' '}
            <span className="font-semibold">
              {displayAmount} {currencySymbol}
            </span>
          </span>
        </div>
        <Button
          onClick={handleTopUpClick}
          disabled={isPreparingTopUp}
          size="sm"
          className="whitespace-nowrap"
        >
          {isPreparingTopUp ? (
            <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
          ) : (
            t('balance.topUp')
          )}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`border-error-500/30 from-error-500/10 to-warning-500/5 rounded-xl border bg-linear-to-br p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="bg-error-500/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <svg
            className="text-error-400 h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-error-400 mb-1 font-medium">{t('balance.insufficientFunds')}</div>
          <div className="text-muted-foreground text-sm">
            {message || t('balance.topUpToComplete')}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="text-foreground text-lg font-bold">
              {t('balance.missing')}:{' '}
              <span className="text-error-400">
                {displayAmount} {currencySymbol}
              </span>
            </div>
          </div>
        </div>
      </div>
      <Button
        onClick={handleTopUpClick}
        disabled={isPreparingTopUp}
        className="mt-4 flex w-full items-center justify-center gap-2"
      >
        {isPreparingTopUp ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <>
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('balance.topUpBalance')}
          </>
        )}
      </Button>
    </div>
  );
}
