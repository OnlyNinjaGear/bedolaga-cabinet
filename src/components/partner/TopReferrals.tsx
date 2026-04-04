import { useTranslation } from 'react-i18next';

import type { CampaignReferralItem } from '../../api/partners';
import { PARTNER_STATS } from '../../constants/partner';
import { useCurrency } from '../../hooks/useCurrency';

interface TopReferralsProps {
  referrals: CampaignReferralItem[];
}

interface StatusBadgeProps {
  hasPaid: boolean;
  isActive: boolean;
}

function StatusBadge({ hasPaid, isActive }: StatusBadgeProps) {
  const { t } = useTranslation();

  if (isActive) {
    return <span className="badge-success">{t('referral.partner.stats.active')}</span>;
  }
  if (hasPaid) {
    return <span className="badge-info">{t('referral.partner.stats.paid')}</span>;
  }
  return <span className="badge-neutral">{t('referral.partner.stats.pending')}</span>;
}

export function TopReferrals({ referrals }: TopReferralsProps) {
  const { t, i18n } = useTranslation();
  const { formatWithCurrency } = useCurrency();

  if (referrals.length === 0) {
    return (
      <div className="bento-card py-6 text-center">
        <div className="text-muted-foreground text-sm">
          {t('referral.partner.stats.noReferrals')}
        </div>
      </div>
    );
  }

  return (
    <div className="bento-card">
      <h4 className="text-foreground mb-3 text-sm font-semibold">
        {t('referral.partner.stats.topReferrals')}
      </h4>
      <div className="space-y-2">
        {referrals.map((ref) => (
          <div
            key={ref.id}
            className="border-border/30 bg-card/30 flex items-center justify-between rounded-xl border p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-foreground min-w-0 truncate text-sm font-medium">
                  {ref.full_name}
                </span>
                <StatusBadge hasPaid={ref.has_paid} isActive={ref.is_active} />
              </div>
              <div className="text-muted-foreground mt-0.5 text-xs">
                {new Date(ref.created_at).toLocaleDateString(i18n.language)}
              </div>
            </div>
            <div className="text-success-400 text-sm font-semibold">
              {formatWithCurrency(ref.total_earnings_kopeks / PARTNER_STATS.KOPEKS_DIVISOR)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
