import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { partnerApi } from '../api/partners';
import { AdminBackButton } from '../components/admin';
import { useCurrency } from '../hooks/useCurrency';
import { Button } from '@/components/ui/button';

// Status badge config — keys must match backend PartnerStatus enum values
const statusConfig: Record<string, { labelKey: string; color: string; bgColor: string }> = {
  approved: {
    labelKey: 'admin.partnerDetail.status.approved',
    color: 'text-success-400',
    bgColor: 'bg-success-500/20',
  },
  pending: {
    labelKey: 'admin.partnerDetail.status.pending',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
  },
  rejected: {
    labelKey: 'admin.partnerDetail.status.rejected',
    color: 'text-error-400',
    bgColor: 'bg-error-500/20',
  },
  none: {
    labelKey: 'admin.partnerDetail.status.none',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
};

const unknownStatus = {
  labelKey: 'admin.partnerDetail.status.none',
  color: 'text-muted-foreground',
  bgColor: 'bg-muted',
};

export default function AdminPartnerDetail() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatWithCurrency } = useCurrency();

  const unassignMutation = useMutation({
    mutationFn: (campaignId: number) => partnerApi.unassignCampaign(Number(userId), campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-detail', userId] });
    },
  });

  // Fetch partner detail
  const {
    data: partner,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-partner-detail', userId],
    queryFn: () => partnerApi.getPartnerDetail(Number(userId)),
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <AdminBackButton to="/admin/partners" />
          <h1 className="text-foreground text-xl font-semibold">
            {t('admin.partnerDetail.title')}
          </h1>
        </div>
        <div className="border-error-500/30 bg-error-500/10 rounded-xl border p-6 text-center">
          <p className="text-error-400">{t('admin.partnerDetail.loadError')}</p>
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/partners')}
            className="mt-4 text-sm"
          >
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  const badge = statusConfig[partner.partner_status] || unknownStatus;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to="/admin/partners" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-foreground text-xl font-semibold">
              {partner.first_name || partner.username || `#${partner.user_id}`}
            </h1>
            <span className={`rounded px-2 py-0.5 text-xs ${badge.bgColor} ${badge.color}`}>
              {t(badge.labelKey)}
            </span>
          </div>
          {partner.username && <p className="text-muted-foreground text-sm">@{partner.username}</p>}
        </div>
      </div>

      <div className="space-y-6">
        {/* Referral Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="border-border bg-card rounded-xl border p-4 text-center">
            <div className="text-foreground text-2xl font-bold">{partner.total_referrals}</div>
            <div className="text-muted-foreground text-xs">
              {t('admin.partnerDetail.stats.totalReferrals')}
            </div>
          </div>
          <div className="border-border bg-card rounded-xl border p-4 text-center">
            <div className="text-success-400 text-2xl font-bold">{partner.paid_referrals}</div>
            <div className="text-muted-foreground text-xs">
              {t('admin.partnerDetail.stats.paidReferrals')}
            </div>
          </div>
          <div className="border-border bg-card rounded-xl border p-4 text-center">
            <div className="text-primary text-2xl font-bold">{partner.active_referrals}</div>
            <div className="text-muted-foreground text-xs">
              {t('admin.partnerDetail.stats.activeReferrals')}
            </div>
          </div>
          <div className="border-border bg-card rounded-xl border p-4 text-center">
            <div className="text-primary text-2xl font-bold">{partner.conversion_to_paid}%</div>
            <div className="text-muted-foreground text-xs">
              {t('admin.partnerDetail.stats.conversionRate')}
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="border-border bg-card rounded-xl border p-4">
          <h3 className="text-foreground mb-4 font-medium">
            {t('admin.partnerDetail.earnings.title')}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-muted-foreground mb-1 text-sm">
                {t('admin.partnerDetail.earnings.allTime')}
              </div>
              <div className="text-success-400 text-lg font-medium">
                {formatWithCurrency(partner.earnings_all_time / 100)}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-muted-foreground mb-1 text-sm">
                {t('admin.partnerDetail.earnings.today')}
              </div>
              <div className="text-foreground text-lg font-medium">
                {formatWithCurrency(partner.earnings_today / 100)}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-muted-foreground mb-1 text-sm">
                {t('admin.partnerDetail.earnings.week')}
              </div>
              <div className="text-foreground text-lg font-medium">
                {formatWithCurrency(partner.earnings_week / 100)}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-muted-foreground mb-1 text-sm">
                {t('admin.partnerDetail.earnings.month')}
              </div>
              <div className="text-foreground text-lg font-medium">
                {formatWithCurrency(partner.earnings_month / 100)}
              </div>
            </div>
          </div>
        </div>

        {/* Commission */}
        <div className="border-border bg-card rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-foreground font-medium">
                {t('admin.partnerDetail.commission.title')}
              </h3>
              <div className="text-primary mt-1 text-2xl font-bold">
                {partner.commission_percent ?? 0}%
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                navigate(`/admin/partners/${userId}/commission`, {
                  state: { currentCommission: partner.commission_percent ?? 0 },
                })
              }
            >
              {t('admin.partnerDetail.commission.update')}
            </Button>
          </div>
        </div>

        {/* Campaigns */}
        <div className="border-border bg-card rounded-xl border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-foreground font-medium">
              {t('admin.partnerDetail.campaigns.title')}
            </h3>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/admin/partners/${userId}/campaigns/assign`)}
              >
                {t('admin.partnerDetail.campaigns.assign')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/admin/campaigns/create?partnerId=${userId}`)}
              >
                {t('admin.partnerDetail.campaigns.createNew')}
              </Button>
            </div>
          </div>
          {partner.campaigns.length === 0 ? (
            <div className="text-muted-foreground py-4 text-center text-sm">
              {t('admin.partnerDetail.campaigns.noCampaigns')}
            </div>
          ) : (
            <div className="space-y-2">
              {partner.campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className={`bg-muted/50 rounded-lg p-3 ${
                    !campaign.is_active ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground font-medium">{campaign.name}</div>
                      <div className="text-muted-foreground font-mono text-xs">
                        ?start={campaign.start_parameter}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {campaign.is_active ? (
                        <span className="bg-success-500/20 text-success-400 rounded px-2 py-0.5 text-xs">
                          {t('admin.partnerDetail.campaigns.active')}
                        </span>
                      ) : (
                        <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs">
                          {t('admin.partnerDetail.campaigns.inactive')}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => unassignMutation.mutate(campaign.id)}
                        disabled={unassignMutation.isPending}
                        className="text-muted-foreground hover:bg-error-500/10 hover:text-error-400"
                        title={t('admin.partnerDetail.campaigns.unassign')}
                      >
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </Button>
                    </div>
                  </div>
                  <div className="border-border/50 mt-2 grid grid-cols-3 gap-2 border-t pt-2">
                    <div className="text-center">
                      <div className="text-foreground text-sm font-medium">
                        {campaign.registrations_count}
                      </div>
                      <div className="text-muted-foreground text-[10px]">
                        {t('admin.partnerDetail.campaigns.registrations', 'Регистрации')}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-foreground text-sm font-medium">
                        {campaign.referrals_count}
                      </div>
                      <div className="text-muted-foreground text-[10px]">
                        {t('admin.partnerDetail.campaigns.referrals', 'Рефералы')}
                      </div>
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-sm font-medium ${campaign.earnings_kopeks > 0 ? 'text-success-400' : 'text-muted-foreground'}`}
                      >
                        {formatWithCurrency(campaign.earnings_kopeks / 100)}
                      </div>
                      <div className="text-muted-foreground text-[10px]">
                        {t('admin.partnerDetail.campaigns.earnings', 'Доход')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-border bg-card rounded-xl border p-4">
          <h3 className="text-foreground mb-4 font-medium">
            {t('admin.partnerDetail.dangerZone.title')}
          </h3>
          <Button
            variant="destructive"
            onClick={() => navigate(`/admin/partners/${userId}/revoke`)}
            className="w-full"
          >
            {t('admin.partnerDetail.dangerZone.revokeButton')}
          </Button>
        </div>
      </div>
    </div>
  );
}
