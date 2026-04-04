import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { SalesStatsParams } from '../../api/adminSalesStats';
import { salesStatsApi } from '../../api/adminSalesStats';
import { SALES_STATS } from '../../constants/salesStats';
import { useCurrency } from '../../hooks/useCurrency';
import { StatCard } from '../stats';
import { TREND_STYLES } from '../stats/constants';

import { SimpleAreaChart } from './SimpleAreaChart';

interface RenewalsTabProps {
  params: SalesStatsParams;
}

export function RenewalsTab({ params }: RenewalsTabProps) {
  const { t } = useTranslation();
  const { formatWithCurrency } = useCurrency();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sales-stats', 'renewals', params],
    queryFn: () => salesStatsApi.getRenewals(params),
    staleTime: SALES_STATS.STALE_TIME,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="bg-card/30 h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-destructive py-8 text-center">{t('admin.salesStats.loadError')}</div>
    );
  }

  const dailyData = data.daily.map((item) => ({
    date: item.date,
    value: item.count,
  }));

  const trendStyle = TREND_STYLES[data.change.trend] ?? TREND_STYLES.stable;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label={t('admin.salesStats.renewals.total')} value={data.total_renewals} />
        <StatCard
          label={t('admin.salesStats.renewals.rate')}
          value={`${data.renewal_rate}%`}
          valueClassName="text-success-400"
        />
        <StatCard
          label={t('admin.salesStats.renewals.revenue')}
          value={formatWithCurrency(data.total_revenue_kopeks / SALES_STATS.KOPEKS_DIVISOR)}
          valueClassName="text-success-400"
        />
      </div>

      <div className="bento-card">
        <h4 className="text-foreground mb-3 text-sm font-semibold">
          {t('admin.salesStats.renewals.comparison')}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card/30 rounded-xl p-3">
            <div className="text-muted-foreground text-xs">
              {t('admin.salesStats.renewals.currentPeriod')}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-foreground text-base font-semibold sm:text-lg">
                {data.current_period.count}
              </span>
              <span className={`text-sm font-medium ${trendStyle.className}`}>
                {trendStyle.arrow} {Math.abs(data.change.percent)}%
              </span>
            </div>
          </div>
          <div className="bg-card/30 rounded-xl p-3">
            <div className="text-muted-foreground text-xs">
              {t('admin.salesStats.renewals.previousPeriod')}
            </div>
            <div className="text-muted-foreground mt-1 text-base font-semibold sm:text-lg">
              {data.previous_period.count}
            </div>
          </div>
        </div>
      </div>

      <SimpleAreaChart
        data={dailyData}
        title={t('admin.salesStats.renewals.dailyChart')}
        chartId="renewals-daily"
        valueLabel={t('admin.salesStats.renewals.renewals')}
        color={SALES_STATS.BAR_COLORS[2]}
      />
    </div>
  );
}
