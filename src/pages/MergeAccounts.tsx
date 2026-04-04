import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/auth';
import { useToast } from '../components/Toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/data-display/Card';
import { Button } from '@/components/primitives/Button';
import { Button as ShadcnButton } from '@/components/ui/button';
import { staggerContainer, staggerItem } from '@/components/motion/transitions';
import { cn } from '@/lib/utils';
import ProviderIcon from '../components/ProviderIcon';
import type { MergeAccountPreview } from '../types';

// -- Icons --

function WarningIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
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
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function ClockIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
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
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CheckCircleIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
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
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

// -- Helpers --

function ProviderBadgeIcon({ provider }: { provider: string }) {
  return <ProviderIcon provider={provider} className="h-4 w-4" />;
}

function formatCountdown(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const min = Math.floor(clamped / 60);
  const sec = clamped % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatBalance(kopeks: number): string {
  return Math.floor(kopeks / 100).toLocaleString();
}

// -- Radio Indicator --

function RadioIndicator({ selected }: { selected: boolean }) {
  return (
    <div
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
        selected ? 'border-primary bg-primary' : 'border-border',
      )}
    >
      {selected && <div className="h-2 w-2 rounded-full bg-white" />}
    </div>
  );
}

// -- Account Card --

interface AccountCardProps {
  account: MergeAccountPreview;
  label: string;
  isSelected: boolean;
  onSelect: () => void;
  showRadio: boolean;
}

function AccountCard({ account, label, isSelected, onSelect, showRadio }: AccountCardProps) {
  const { t } = useTranslation();

  return (
    <Card className={cn('transition-colors', isSelected && 'border-primary/50')}>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auth methods */}
        <div>
          <span className="text-muted-foreground text-sm">{t('merge.authMethods')}:</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {account.auth_methods.map((method) => (
              <span
                key={method}
                className="bg-card text-foreground inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs"
              >
                <ProviderBadgeIcon provider={method} />
                {t(`profile.accounts.providers.${method}`)}
              </span>
            ))}
          </div>
        </div>

        {/* Subscription */}
        {account.subscription ? (
          <div className="space-y-1">
            <span className="text-muted-foreground text-sm">{t('merge.subscription')}:</span>
            <p className="text-foreground font-medium">
              {account.subscription.tariff_name ?? account.subscription.status}
            </p>
            {account.subscription.end_date && (
              <p className="text-muted-foreground text-sm">
                {t('merge.until', { date: formatDate(account.subscription.end_date) })}
              </p>
            )}
            <p className="text-muted-foreground text-sm">
              {t('merge.traffic')}: {account.subscription.traffic_limit_gb} GB, {t('merge.devices')}
              : {account.subscription.device_limit}
            </p>
          </div>
        ) : (
          <div>
            <span className="text-muted-foreground text-sm">{t('merge.subscription')}:</span>
            <p className="text-muted-foreground text-sm">{t('merge.noSubscription')}</p>
          </div>
        )}

        {/* Balance */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-muted-foreground text-sm">{t('merge.balance')}:</span>
          <span className="text-foreground font-medium">
            {formatBalance(account.balance_kopeks)} &#8381;
          </span>
        </div>

        {/* Radio selection */}
        {showRadio && account.subscription && (
          <ShadcnButton
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={onSelect}
            variant="ghost"
            className="mt-2 flex h-auto w-full items-center justify-start gap-2.5 px-3 py-2.5"
          >
            <RadioIndicator selected={isSelected} />
            <span className="text-foreground text-sm">{t('merge.keepThisSubscription')}</span>
          </ShadcnButton>
        )}
      </CardContent>
    </Card>
  );
}

// -- Loading Skeleton --

function LoadingSkeleton() {
  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={staggerItem}>
        <div className="flex items-center gap-3">
          <div className="bg-muted h-7 w-7 animate-pulse rounded" />
          <div className="bg-muted h-7 w-48 animate-pulse rounded" />
        </div>
      </motion.div>

      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div key={i} variants={staggerItem}>
          <Card>
            <div className="space-y-4">
              <div className="bg-muted h-5 w-40 animate-pulse rounded" />
              <div className="bg-muted h-4 w-64 animate-pulse rounded" />
              <div className="bg-muted h-4 w-48 animate-pulse rounded" />
              <div className="bg-muted h-4 w-32 animate-pulse rounded" />
            </div>
          </Card>
        </motion.div>
      ))}

      <motion.div variants={staggerItem}>
        <div className="bg-muted h-12 w-full animate-pulse rounded-xl" />
      </motion.div>

      <motion.div variants={staggerItem} className="flex justify-center">
        <div className="bg-muted h-4 w-32 animate-pulse rounded" />
      </motion.div>
    </motion.div>
  );
}

// -- Expired State --

function ExpiredState() {
  const { t } = useTranslation();

  return (
    <motion.div
      className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 px-4"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={staggerItem}>
        <div className="bg-warning-500/20 flex h-16 w-16 items-center justify-center rounded-full">
          <ClockIcon className="text-warning-400 h-8 w-8" />
        </div>
      </motion.div>

      <motion.div variants={staggerItem} className="text-center">
        <p className="text-foreground text-lg font-medium">{t('merge.expired')}</p>
      </motion.div>

      <motion.div variants={staggerItem}>
        <Link
          to="/profile/accounts"
          className="text-primary hover:text-primary/70 text-sm transition-colors"
        >
          {t('profile.accounts.goToAccounts')}
        </Link>
      </motion.div>
    </motion.div>
  );
}

// -- Error State --

function ErrorState() {
  const { t } = useTranslation();

  return (
    <motion.div
      className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 px-4"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={staggerItem}>
        <div className="bg-error-500/20 flex h-16 w-16 items-center justify-center rounded-full">
          <WarningIcon className="text-error-400 h-8 w-8" />
        </div>
      </motion.div>

      <motion.div variants={staggerItem} className="text-center">
        <p className="text-foreground text-lg font-medium">{t('merge.error')}</p>
      </motion.div>

      <motion.div variants={staggerItem}>
        <Link
          to="/profile/accounts"
          className="text-primary hover:text-primary/70 text-sm transition-colors"
        >
          {t('profile.accounts.goToAccounts')}
        </Link>
      </motion.div>
    </motion.div>
  );
}

// -- Main Component --

export default function MergeAccounts() {
  const { t } = useTranslation();
  const { mergeToken } = useParams<{ mergeToken: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [expiresIn, setExpiresIn] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  // Fetch merge preview (no auth required)
  const { data, isLoading, error } = useQuery({
    queryKey: ['merge-preview', mergeToken],
    queryFn: () => {
      if (!mergeToken) return Promise.reject(new Error('Missing merge token'));
      return authApi.getMergePreview(mergeToken);
    },
    enabled: !!mergeToken,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // Auto-select subscription when data loads (only once)
  useEffect(() => {
    if (!data) return;
    // Don't overwrite if user already made a selection
    if (selectedUserId !== null) return;

    const primaryHasSub = !!data.primary.subscription;
    const secondaryHasSub = !!data.secondary.subscription;

    if (primaryHasSub && !secondaryHasSub) {
      setSelectedUserId(data.primary.id);
    } else if (!primaryHasSub && secondaryHasSub) {
      setSelectedUserId(data.secondary.id);
    } else if (!primaryHasSub && !secondaryHasSub) {
      // Neither has subscription — default to primary
      setSelectedUserId(data.primary.id);
    }
    // If both have subs — null until user picks
  }, [data, selectedUserId]);

  // Countdown timer (wall-clock based to avoid drift)
  useEffect(() => {
    if (!data) return;
    const startTime = Date.now();
    const totalSeconds = data.expires_in_seconds;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = totalSeconds - elapsed;
      if (remaining <= 0) {
        setExpiresIn(0);
        setIsExpired(true);
        clearInterval(interval);
      } else {
        setExpiresIn(remaining);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data]);

  // Execute merge
  const mergeMutation = useMutation({
    mutationFn: () => {
      if (!mergeToken || !selectedUserId) {
        return Promise.reject(new Error('Missing merge token or user selection'));
      }
      return authApi.executeMerge(mergeToken, selectedUserId);
    },
    onSuccess: async (response) => {
      if (!response.success) {
        showToast({ type: 'error', message: t('merge.error') });
        return;
      }

      if (!response.access_token || !response.refresh_token) {
        showToast({ type: 'error', message: t('merge.error') });
        return;
      }

      const { setTokens, setUser, checkAdminStatus } = useAuthStore.getState();
      setTokens(response.access_token, response.refresh_token);
      if (response.user) {
        setUser(response.user);
      }
      try {
        await checkAdminStatus();
      } catch {
        // Non-critical — admin status will be checked on next navigation
      }

      queryClient.clear();
      showToast({ type: 'success', message: t('merge.success') });
      navigate('/profile/accounts', { replace: true });
    },
    onError: () => {
      showToast({
        type: 'error',
        message: t('merge.error'),
      });
    },
  });

  const handleMerge = () => {
    if (!selectedUserId || mergeMutation.isPending || isExpired) return;
    mergeMutation.mutate();
  };

  const handleCancel = () => {
    navigate('/profile/accounts', { replace: true });
  };

  // Derived state
  const bothHaveSubscriptions =
    data && !!data.primary.subscription && !!data.secondary.subscription;
  const canConfirm = selectedUserId !== null && !isExpired && !mergeMutation.isPending;
  const combinedBalance = data ? data.primary.balance_kopeks + data.secondary.balance_kopeks : 0;

  // Missing token param
  if (!mergeToken) {
    return <ErrorState />;
  }

  // Loading
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Fetch error (404 = expired/invalid token)
  if (error || !data) {
    return <ErrorState />;
  }

  // Timer expired
  if (isExpired) {
    return <ExpiredState />;
  }

  return (
    <motion.div
      className="mx-auto max-w-lg space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header with warning */}
      <motion.div variants={staggerItem}>
        <Card className="border-warning-500/30 bg-warning-500/5">
          <div className="flex items-start gap-3">
            <WarningIcon className="text-warning-400 mt-0.5 h-6 w-6 shrink-0" />
            <div>
              <h1 className="text-foreground text-xl font-bold">{t('merge.title')}</h1>
              <p className="text-muted-foreground mt-1 text-sm">{t('merge.description')}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Subscription choice prompt (when both have subs) */}
      {bothHaveSubscriptions && !selectedUserId && (
        <motion.div variants={staggerItem}>
          <div className="border-primary/30 bg-primary/10 rounded-xl border px-4 py-3">
            <p className="text-primary text-sm font-medium">{t('merge.chooseSubscription')}</p>
          </div>
        </motion.div>
      )}

      {/* Account cards */}
      <div
        role={bothHaveSubscriptions ? 'radiogroup' : undefined}
        aria-label={bothHaveSubscriptions ? t('merge.chooseSubscription') : undefined}
      >
        <motion.div variants={staggerItem}>
          <AccountCard
            account={data.primary}
            label={t('merge.currentAccount')}
            isSelected={selectedUserId === data.primary.id}
            onSelect={() => setSelectedUserId(data.primary.id)}
            showRadio={!!bothHaveSubscriptions}
          />
        </motion.div>

        <motion.div variants={staggerItem} className="mt-6">
          <AccountCard
            account={data.secondary}
            label={t('merge.foundAccount')}
            isSelected={selectedUserId === data.secondary.id}
            onSelect={() => setSelectedUserId(data.secondary.id)}
            showRadio={!!bothHaveSubscriptions}
          />
        </motion.div>
      </div>

      {/* After merge summary */}
      <motion.div variants={staggerItem}>
        <Card>
          <CardHeader>
            <CardTitle>{t('merge.afterMerge')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <CheckCircleIcon className="text-success-400 mt-0.5 h-4 w-4 shrink-0" />
                <span className="text-foreground text-sm">{t('merge.allAuthMethodsMerged')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircleIcon className="text-success-400 mt-0.5 h-4 w-4 shrink-0" />
                <span className="text-foreground text-sm">
                  {t('merge.balanceSummed', { amount: formatBalance(combinedBalance) })}
                </span>
              </li>
              {bothHaveSubscriptions && (
                <li className="flex items-start gap-2.5">
                  <WarningIcon className="text-warning-400 mt-0.5 h-4 w-4 shrink-0" />
                  <span className="text-foreground text-sm">
                    {t('merge.unselectedSubscriptionDeleted')}
                  </span>
                </li>
              )}
              <li className="flex items-start gap-2.5">
                <CheckCircleIcon className="text-success-400 mt-0.5 h-4 w-4 shrink-0" />
                <span className="text-foreground text-sm">{t('merge.historyPreserved')}</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      {/* Confirm button */}
      <motion.div variants={staggerItem}>
        <Button
          fullWidth
          disabled={!canConfirm}
          loading={mergeMutation.isPending}
          onClick={handleMerge}
        >
          {mergeMutation.isPending ? t('merge.merging') : t('merge.confirm')}
        </Button>
      </motion.div>

      {/* Cancel link */}
      <motion.div variants={staggerItem} className="flex justify-center">
        <ShadcnButton
          type="button"
          variant="ghost"
          onClick={handleCancel}
          className="text-muted-foreground text-sm"
        >
          {t('merge.cancel')}
        </ShadcnButton>
      </motion.div>

      {/* Countdown timer */}
      <motion.div variants={staggerItem} className="flex items-center justify-center gap-1.5 pb-6">
        <ClockIcon className="text-muted-foreground h-4 w-4" />
        <span className="text-muted-foreground text-sm">
          {t('merge.expiresIn', { minutes: formatCountdown(expiresIn) })}
        </span>
      </motion.div>
    </motion.div>
  );
}
