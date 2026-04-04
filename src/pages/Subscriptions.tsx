import { useQuery } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { subscriptionApi } from '../api/subscription';
import SubscriptionListCard from '../components/subscription/SubscriptionListCard';
import { Button } from '@/components/ui/button';

function EmptyState({ onBuy }: { onBuy: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="border-border bg-card rounded-2xl border p-10 text-center">
      <div className="bg-muted/30 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
        <svg
          className="h-8 w-8 opacity-40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75"
          />
        </svg>
      </div>
      <h3 className="text-foreground mb-2 text-xl font-semibold">
        {t('subscriptions.empty', 'Нет подписок')}
      </h3>
      <p className="text-muted-foreground mb-6 text-sm">
        {t('subscriptions.emptyDesc', 'У вас пока нет активных подписок')}
      </p>
      <Button onClick={onBuy} className="px-8">
        {t('subscriptions.buy', 'Купить подписку')}
      </Button>
    </div>
  );
}

export default function Subscriptions() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions-list'],
    queryFn: () => subscriptionApi.getSubscriptions(),
    staleTime: 30_000,
    refetchOnMount: 'always',
  });

  const subscriptions = data?.subscriptions ?? [];
  const isMultiTariff = data?.multi_tariff_enabled ?? false;

  // Single-tariff mode with one subscription: skip list, go directly to detail
  if (data && !isMultiTariff && subscriptions.length === 1) {
    return <Navigate to={`/subscriptions/${subscriptions[0].id}`} replace />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-foreground text-2xl font-bold">
          {t('subscriptions.title', 'Мои подписки')}
        </h1>
        {!isLoading && subscriptions.length > 0 && (
          <Button
            variant="outline"
            onClick={() => navigate('/subscription/purchase')}
            className="gap-1.5"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('subscriptions.buyAnother', 'Новый тариф')}
          </Button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="bg-muted/30 h-36 animate-pulse rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && subscriptions.length === 0 && (
        <EmptyState onBuy={() => navigate('/subscription/purchase')} />
      )}

      {/* Subscription grid */}
      {subscriptions.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {subscriptions.map((sub) => (
            <SubscriptionListCard
              key={sub.id}
              subscription={sub}
              onClick={() => navigate(`/subscriptions/${sub.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
