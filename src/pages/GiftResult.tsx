import { useCallback, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { giftApi } from '../api/gift';
import { Spinner } from '@/components/ui/Spinner';
import { AnimatedCheckmark } from '@/components/ui/AnimatedCheckmark';
import { AnimatedCrossmark } from '@/components/ui/AnimatedCrossmark';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const MAX_POLL_MS = 10 * 60 * 1000; // 10 minutes

const KNOWN_WARNINGS = new Set(['telegram_unresolvable']);

// ============================================================
// Sub-components
// ============================================================

function PendingState() {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <Spinner className="h-16 w-16 border-3" />
      <div>
        <h1 className="text-foreground text-xl font-bold">
          {t('gift.processing', 'Processing your gift...')}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t('gift.pendingDesc', 'Please wait while we process your payment')}
        </p>
      </div>
    </motion.div>
  );
}

function CodeOnlySuccessState({
  purchaseToken,
  tariffName,
  periodDays,
}: {
  purchaseToken: string;
  tariffName: string | null;
  periodDays: number | null;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const shortCode = purchaseToken.slice(0, 12);
  const giftCode = `GIFT-${shortCode}`;
  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined;
  // Encode underscores as %5F so Telegram auto-link detection doesn't strip them
  const safeCode = shortCode.replace(/_/g, '%5F');
  const botLink = botUsername ? `https://t.me/${botUsername}?start=GIFT%5F${safeCode}` : null;
  const cabinetLink = `${window.location.origin}/gift?tab=activate&code=${safeCode}`;

  const fullMessage = [
    t('gift.shareText', 'I have a gift for you! Activate it here:'),
    '',
    botLink ? `${t('gift.shareModalActivateVia', 'Activate via bot:')} ${botLink}` : null,
    `${t('gift.shareModalActivateViaCabinet', 'Or via website:')} ${cabinetLink}`,
  ]
    .filter(Boolean)
    .join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <AnimatedCheckmark />

      <div>
        <h1 className="text-foreground text-xl font-bold">
          {t('gift.codeReadyTitle', 'Gift code is ready!')}
        </h1>
        {tariffName && periodDays !== null && (
          <p className="text-muted-foreground mt-1 text-sm">
            {tariffName} — {periodDays} {t('gift.days', 'days')}
          </p>
        )}
      </div>

      {/* Gift code display */}
      <div className="border-primary/20 bg-primary/5 w-full rounded-xl border p-4">
        <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
          {t('gift.codeLabel', 'Gift code')}
        </p>
        <p className="text-primary font-mono text-lg font-bold select-all">{giftCode}</p>
      </div>

      {/* Share message preview */}
      <div className="border-border/30 bg-card/40 w-full rounded-xl border p-4 text-left">
        <p className="text-foreground mb-3 text-sm font-medium">
          {t('gift.shareText', 'I have a gift for you! Activate it here:')}
        </p>

        {botLink && (
          <div className="mb-2">
            <p className="text-muted-foreground mb-1 text-xs font-medium">
              {t('gift.shareModalActivateVia', 'Activate via bot:')}
            </p>
            <p className="bg-background/60 text-primary truncate rounded-lg px-3 py-2 text-sm">
              {botLink}
            </p>
          </div>
        )}

        <div>
          <p className="text-muted-foreground mb-1 text-xs font-medium">
            {t('gift.shareModalActivateViaCabinet', 'Or via website:')}
          </p>
          <p className="bg-background/60 text-primary truncate rounded-lg px-3 py-2 text-sm">
            {cabinetLink}
          </p>
        </div>
      </div>

      {/* Copy button */}
      <Button
        type="button"
        onClick={handleCopy}
        variant={copied ? 'ghost' : 'default'}
        className={cn(
          'w-full',
          copied && 'bg-success-500/20 text-success-400 hover:bg-success-500/20',
        )}
      >
        {copied ? (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {t('common.copied', 'Copied!')}
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            {t('gift.copyMessage', 'Copy message')}
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={() => navigate('/gift?tab=myGifts')}
        className="w-full"
      >
        {t('gift.tabMyGifts', 'My Gifts')}
      </Button>
    </motion.div>
  );
}

function DeliveredState({
  recipientContact,
  tariffName,
  periodDays,
  giftMessage,
  warning,
}: {
  recipientContact: string | null;
  tariffName: string | null;
  periodDays: number | null;
  giftMessage: string | null;
  warning: string | null;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <AnimatedCheckmark />

      <div>
        <h1 className="text-foreground text-xl font-bold">
          {t('gift.successTitle', 'Gift sent!')}
        </h1>
        {tariffName && periodDays !== null && (
          <p className="text-muted-foreground mt-1 text-sm">
            {tariffName} — {periodDays} {t('gift.days', 'days')}
          </p>
        )}
        {recipientContact && (
          <p className="text-muted-foreground mt-2 text-sm">
            {t('gift.successDesc', {
              contact: recipientContact,
              defaultValue: `Sent to ${recipientContact}`,
            })}
          </p>
        )}
        {giftMessage && (
          <p className="text-muted-foreground mt-2 text-sm italic">&ldquo;{giftMessage}&rdquo;</p>
        )}
      </div>

      {warning && (
        <div className="border-warning-500/20 bg-warning-500/5 w-full rounded-xl border p-3">
          <p className="text-warning-400 text-sm">{t(`gift.warning.${warning}`)}</p>
        </div>
      )}

      <Button type="button" onClick={() => navigate('/')} className="w-full">
        {t('gift.backToDashboard', 'Back to dashboard')}
      </Button>
    </motion.div>
  );
}

function PendingActivationState({
  recipientContact,
  tariffName,
  periodDays,
  warning,
}: {
  recipientContact: string | null;
  tariffName: string | null;
  periodDays: number | null;
  warning: string | null;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 text-center"
    >
      {/* Info icon */}
      <div className="bg-warning-500/10 flex h-20 w-20 items-center justify-center rounded-full">
        <svg
          className="text-warning-400 h-10 w-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
      </div>

      <div>
        <h1 className="text-foreground text-xl font-bold">
          {t('gift.pendingActivationTitle', 'Gift pending activation')}
        </h1>
        {tariffName && periodDays !== null && (
          <p className="text-muted-foreground mt-1 text-sm">
            {tariffName} — {periodDays} {t('gift.days', 'days')}
          </p>
        )}
        {recipientContact && (
          <p className="text-muted-foreground mt-2 text-sm">
            {t('gift.successDesc', {
              contact: recipientContact,
              defaultValue: `Sent to ${recipientContact}`,
            })}
          </p>
        )}
        <p className="text-muted-foreground mt-2 text-sm">
          {t(
            'gift.pendingActivationDesc',
            'The recipient currently has an active subscription. Your gift will be activated once their current subscription expires.',
          )}
        </p>
      </div>

      {warning && (
        <div className="border-warning-500/20 bg-warning-500/5 w-full rounded-xl border p-3">
          <p className="text-warning-400 text-sm">{t(`gift.warning.${warning}`)}</p>
        </div>
      )}

      <Button type="button" onClick={() => navigate('/')} className="w-full">
        {t('gift.backToDashboard', 'Back to dashboard')}
      </Button>
    </motion.div>
  );
}

function FailedState() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <AnimatedCrossmark />

      <div>
        <h1 className="text-foreground text-xl font-bold">
          {t('gift.failedTitle', 'Something went wrong')}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t('gift.failedDesc', 'Your gift could not be processed. Please try again.')}
        </p>
      </div>

      <Button type="button" onClick={() => navigate('/gift')} className="w-full">
        {t('gift.tryAgain', 'Try again')}
      </Button>
    </motion.div>
  );
}

function PollErrorState() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <div className="bg-warning-500/10 flex h-20 w-20 items-center justify-center rounded-full">
        <svg
          className="text-warning-400 h-10 w-10"
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
      </div>

      <div>
        <h1 className="text-foreground text-xl font-bold">
          {t('gift.pollErrorTitle', 'Could not check gift status')}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t(
            'gift.pollErrorDesc',
            'Your purchase was successful. Check your dashboard for details.',
          )}
        </p>
      </div>

      <Button type="button" onClick={() => navigate('/')} className="w-full">
        {t('gift.backToDashboard', 'Back to dashboard')}
      </Button>
    </motion.div>
  );
}

function PollTimedOutState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <div className="bg-card/50 flex h-20 w-20 items-center justify-center rounded-full">
        <svg
          className="text-muted-foreground h-10 w-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div>
        <h1 className="text-foreground text-xl font-bold">
          {t('gift.pollTimeout', 'Taking longer than expected')}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t(
            'gift.pollTimeoutDesc',
            'Payment processing is taking longer than usual. You can try checking again.',
          )}
        </p>
      </div>
      <Button type="button" onClick={onRetry}>
        {t('gift.retry', 'Retry')}
      </Button>
    </motion.div>
  );
}

function NoTokenState() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <div className="bg-card/50 flex h-20 w-20 items-center justify-center rounded-full">
        <svg
          className="text-muted-foreground h-10 w-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>
      <div>
        <h1 className="text-foreground text-xl font-bold">{t('gift.noToken', 'Invalid link')}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t('gift.noTokenDesc', 'This gift link is invalid or has expired.')}
        </p>
      </div>
      <Button type="button" onClick={() => navigate('/gift')}>
        {t('gift.backToGift', 'Go back')}
      </Button>
    </motion.div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function GiftResult() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const mode = searchParams.get('mode');
  const rawUrlWarning = searchParams.get('warning');
  const urlWarning = rawUrlWarning && KNOWN_WARNINGS.has(rawUrlWarning) ? rawUrlWarning : null;

  const pollStart = useRef(Date.now());
  const [pollTimedOut, setPollTimedOut] = useState(false);

  const isBalanceMode = mode === 'balance';

  const {
    data: status,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['gift-status', token],
    queryFn: () => giftApi.getPurchaseStatus(token!),
    enabled: !!token && !pollTimedOut,
    refetchInterval: (query) => {
      // Balance mode: fetch once, no polling
      if (isBalanceMode) return false;

      const d = query.state.data;
      const s = d?.status;
      if (s === 'delivered' || s === 'failed' || s === 'pending_activation' || s === 'expired')
        return false;
      // Code-only gifts stay in 'paid' status — stop polling
      if (s === 'paid' && d?.is_code_only) return false;

      // Check poll timeout
      if (Date.now() - pollStart.current > MAX_POLL_MS) {
        setPollTimedOut(true);
        return false;
      }

      return 3000;
    },
    retry: 2,
  });

  const handleRetryPoll = useCallback(() => {
    pollStart.current = Date.now();
    setPollTimedOut(false);
    refetch();
  }, [refetch]);

  // No token
  if (!token) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div
          className="border-border/50 bg-background/50 w-full max-w-md rounded-2xl border p-8"
          aria-live="polite"
          aria-atomic="true"
        >
          <NoTokenState />
        </div>
      </div>
    );
  }

  const isCodeOnlyPaid =
    status?.status === 'paid' && status?.is_code_only && status?.purchase_token != null;
  const isDelivered = status?.status === 'delivered';
  const isPendingActivation = status?.status === 'pending_activation';
  const isFailed = status?.status === 'failed' || status?.status === 'expired';

  // Warning from status response (persisted on purchase) takes priority over URL param
  const statusWarning =
    status?.warning && KNOWN_WARNINGS.has(status.warning) ? status.warning : null;
  const warning = statusWarning ?? urlWarning;

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div
        className="border-border/50 bg-background/50 w-full max-w-md rounded-2xl border p-8"
        aria-live="polite"
        aria-atomic="true"
      >
        {isError ? (
          <PollErrorState />
        ) : isCodeOnlyPaid ? (
          <CodeOnlySuccessState
            purchaseToken={status.purchase_token!}
            tariffName={status.tariff_name}
            periodDays={status.period_days}
          />
        ) : isDelivered ? (
          <DeliveredState
            recipientContact={status.recipient_contact_value}
            tariffName={status.tariff_name}
            periodDays={status.period_days}
            giftMessage={status.gift_message}
            warning={warning}
          />
        ) : isPendingActivation ? (
          <PendingActivationState
            recipientContact={status.recipient_contact_value}
            tariffName={status.tariff_name}
            periodDays={status.period_days}
            warning={warning}
          />
        ) : isFailed ? (
          <FailedState />
        ) : pollTimedOut ? (
          <PollTimedOutState onRetry={handleRetryPoll} />
        ) : (
          <PendingState />
        )}
      </div>
    </div>
  );
}
