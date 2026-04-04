import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { partnerApi } from '../api/partners';
import { campaignsApi } from '../api/campaigns';
import { AdminBackButton } from '../components/admin';
import { Button } from '@/components/ui/button';

export default function AdminPartnerCampaignAssign() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch partner detail to know already assigned campaign IDs
  const { data: partner } = useQuery({
    queryKey: ['admin-partner-detail', userId],
    queryFn: () => partnerApi.getPartnerDetail(Number(userId)),
    enabled: !!userId,
  });

  // Fetch all campaigns
  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ['admin-campaigns-all'],
    queryFn: () => campaignsApi.getCampaigns(true, 0, 100),
  });

  const assignMutation = useMutation({
    mutationFn: (campaignId: number) => partnerApi.assignCampaign(Number(userId), campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-detail', userId] });
      navigate(`/admin/partners/${userId}`);
    },
  });

  const assignedIds = new Set(partner?.campaigns.map((c) => c.id) ?? []);
  const available =
    campaignsData?.campaigns.filter((c) => !assignedIds.has(c.id) && c.partner_user_id === null) ??
    [];
  const takenByOthers =
    campaignsData?.campaigns.filter((c) => !assignedIds.has(c.id) && c.partner_user_id !== null) ??
    [];

  const partnerName = partner
    ? partner.first_name || partner.username || `#${partner.user_id}`
    : '';

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to={`/admin/partners/${userId}`} />
        <div>
          <h1 className="text-foreground text-xl font-semibold">
            {t('admin.partnerDetail.campaigns.assignTitle')}
          </h1>
          {partnerName && <p className="text-muted-foreground text-sm">{partnerName}</p>}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      ) : available.length === 0 ? (
        <div className="border-border bg-card rounded-xl border p-6">
          <div className="text-muted-foreground py-4 text-center text-sm">
            {t('admin.partnerDetail.campaigns.noAvailable')}
          </div>
          <Button
            onClick={() => navigate(`/admin/campaigns/create?partnerId=${userId}`)}
            className="mt-2 w-full"
          >
            {t('admin.partnerDetail.campaigns.createNew')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {available.map((campaign) => (
            <div key={campaign.id} className="border-border bg-card rounded-xl border p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-medium">{campaign.name}</span>
                    {!campaign.is_active && (
                      <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">
                        {t('admin.campaigns.table.inactive')}
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                    <span className="font-mono">?start={campaign.start_parameter}</span>
                    <span>
                      {campaign.registrations_count}{' '}
                      {t('admin.campaigns.overview.registrations').toLowerCase()}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => assignMutation.mutate(campaign.id)}
                  disabled={assignMutation.isPending}
                  className="shrink-0"
                >
                  {t('admin.partnerDetail.campaigns.assign')}
                </Button>
              </div>
            </div>
          ))}

          {/* Show campaigns assigned to other partners as greyed out */}
          {takenByOthers.map((campaign) => (
            <div
              key={campaign.id}
              className="border-border/50 bg-card rounded-xl border p-4 opacity-50"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">{campaign.name}</span>
                    <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-xs text-purple-400">
                      {campaign.partner_name}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                    <span className="font-mono">?start={campaign.start_parameter}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {assignMutation.isError && (
        <div className="bg-error-500/10 text-error-400 mt-4 rounded-lg p-3 text-sm">
          {t('common.error')}
        </div>
      )}
    </div>
  );
}
