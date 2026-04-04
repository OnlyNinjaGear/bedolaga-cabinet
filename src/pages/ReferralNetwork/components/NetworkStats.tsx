import { useTranslation } from 'react-i18next';
import type { NetworkGraphData } from '@/types/referralNetwork';
import { formatKopeksToRubles } from '../utils';

interface NetworkStatsProps {
  data: NetworkGraphData;
  className?: string;
}

export function NetworkStats({ data, className }: NetworkStatsProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`border-border/50 bg-background/80 rounded-xl border p-2 backdrop-blur-md sm:p-3 ${className ?? ''}`}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:gap-x-6 sm:gap-y-2">
        <div>
          <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            {t('admin.referralNetwork.stats.totalUsers')}
          </p>
          <p className="text-foreground font-mono text-sm font-semibold">
            {data.total_users.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            {t('admin.referralNetwork.stats.totalReferrers')}
          </p>
          <p className="text-foreground font-mono text-sm font-semibold">
            {data.total_referrers.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            {t('admin.referralNetwork.stats.totalCampaigns')}
          </p>
          <p className="text-foreground font-mono text-sm font-semibold">
            {data.total_campaigns.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            {t('admin.referralNetwork.stats.subscriptionRevenue')}
          </p>
          <p className="text-primary font-mono text-sm font-semibold">
            {formatKopeksToRubles(data.total_subscription_revenue_kopeks)} ₽
          </p>
        </div>
        <div className="border-border/30 col-span-2 border-t pt-1.5">
          <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            {t('admin.referralNetwork.stats.totalEarnings')}
          </p>
          <p className="text-foreground font-mono text-sm font-semibold">
            {formatKopeksToRubles(data.total_earnings_kopeks)} ₽
          </p>
        </div>
      </div>
    </div>
  );
}
