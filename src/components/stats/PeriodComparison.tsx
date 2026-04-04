import { useTranslation } from 'react-i18next';

import type { PeriodComparison as PeriodComparisonType } from './types';
import { TREND_STYLES } from './constants';
import { PARTNER_STATS } from '../../constants/partner';
import { useCurrency } from '../../hooks/useCurrency';

interface PeriodComparisonProps {
  data: PeriodComparisonType;
  title?: string;
  countLabel?: string;
  earningsLabel?: string;
  comparisonLabel?: string;
}

interface TrendBadgeProps {
  trend: 'up' | 'down' | 'stable';
  percent: number;
}

function TrendBadge({ trend, percent }: TrendBadgeProps) {
  const style = TREND_STYLES[trend];
  return (
    <span className={`text-sm font-medium ${style.className}`}>
      {style.arrow} {Math.abs(percent)}%
    </span>
  );
}

export function PeriodComparison({
  data,
  title,
  countLabel,
  earningsLabel,
  comparisonLabel,
}: PeriodComparisonProps) {
  const { t } = useTranslation();
  const { formatWithCurrency } = useCurrency();

  const resolvedTitle = title ?? t('referral.partner.stats.periodComparison');
  const resolvedCountLabel = countLabel ?? t('referral.partner.stats.referralsCount');
  const resolvedEarningsLabel = earningsLabel ?? t('referral.partner.stats.earningsAmount');
  const resolvedComparisonLabel = comparisonLabel ?? t('referral.partner.stats.vsLastWeek');

  return (
    <div className="bento-card">
      <h4 className="text-foreground mb-3 text-sm font-semibold">{resolvedTitle}</h4>
      <div className="grid grid-cols-2 gap-3">
        {/* Count comparison */}
        <div className="bg-card/30 rounded-xl p-3">
          <div className="text-muted-foreground text-xs">{resolvedCountLabel}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-foreground text-base font-semibold sm:text-lg">
              {data.current.referrals_count}
            </span>
            <TrendBadge
              trend={data.referrals_change.trend}
              percent={data.referrals_change.percent}
            />
          </div>
          <div className="text-muted-foreground mt-0.5 text-xs">{resolvedComparisonLabel}</div>
        </div>

        {/* Earnings comparison */}
        <div className="bg-card/30 rounded-xl p-3">
          <div className="text-muted-foreground text-xs">{resolvedEarningsLabel}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-success-400 text-base font-semibold sm:text-lg">
              {formatWithCurrency(data.current.earnings_kopeks / PARTNER_STATS.KOPEKS_DIVISOR)}
            </span>
            <TrendBadge trend={data.earnings_change.trend} percent={data.earnings_change.percent} />
          </div>
          <div className="text-muted-foreground mt-0.5 text-xs">{resolvedComparisonLabel}</div>
        </div>
      </div>
    </div>
  );
}
