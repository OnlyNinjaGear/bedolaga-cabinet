import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { partnerApi } from '../../api/partners';
import { PARTNER_STATS } from '../../constants/partner';
import { useCurrency } from '../../hooks/useCurrency';
import { DailyChart } from '../stats/DailyChart';
import { PeriodComparison } from '../stats/PeriodComparison';
import { StatCard } from '../stats/StatCard';
import { TopReferrals } from './TopReferrals';
import { Button } from '@/components/ui/button';

interface CampaignDetailStatsProps {
  campaignId: number;
}

export function CampaignDetailStats({ campaignId }: CampaignDetailStatsProps) {
  const { t } = useTranslation();
  const { formatWithCurrency } = useCurrency();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['partner-campaign-stats', campaignId],
    queryFn: () => partnerApi.getCampaignStats(campaignId),
    staleTime: PARTNER_STATS.STATS_STALE_TIME,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        {/* Skeleton loader */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: PARTNER_STATS.SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="bg-card/30 h-16 animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="bg-card/30 h-52 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="pt-2 text-center">
        <div className="text-error-400 text-sm">{t('referral.partner.stats.noData')}</div>
        <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-2">
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      {/* Period earnings */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatCard
          label={t('referral.partner.stats.today')}
          value={formatWithCurrency(data.earnings_today / PARTNER_STATS.KOPEKS_DIVISOR)}
          valueClassName="text-success-400"
        />
        <StatCard
          label={t('referral.partner.stats.week')}
          value={formatWithCurrency(data.earnings_week / PARTNER_STATS.KOPEKS_DIVISOR)}
          valueClassName="text-success-400"
        />
        <StatCard
          label={t('referral.partner.stats.month')}
          value={formatWithCurrency(data.earnings_month / PARTNER_STATS.KOPEKS_DIVISOR)}
          valueClassName="text-success-400"
        />
      </div>

      {/* Conversion rate */}
      <div className="bg-card/30 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            {t('referral.partner.stats.conversionRate')}
          </span>
          <span className="text-primary text-lg font-semibold">{data.conversion_rate}%</span>
        </div>
        <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all"
            style={{
              width: `${Math.min(data.conversion_rate, PARTNER_STATS.MAX_CONVERSION_RATE)}%`,
            }}
          />
        </div>
      </div>

      {/* Daily chart */}
      <DailyChart data={data.daily_stats} chartId={campaignId} />

      {/* Period comparison */}
      <PeriodComparison data={data.period_comparison} />

      {/* Top referrals */}
      <TopReferrals referrals={data.top_referrals} />
    </div>
  );
}
