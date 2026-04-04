import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { partnerApi, type AdminPartnerApplicationItem } from '../api/partners';
import { AdminBackButton } from '../components/admin';
import { Button } from '@/components/ui/button';

export default function AdminApplicationReview() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [commission, setCommission] = useState('10');
  const [rejectComment, setRejectComment] = useState('');

  // Try to get application from navigate state, fallback to fetching
  const passedApp = (location.state as { application?: AdminPartnerApplicationItem } | null)
    ?.application;

  const { data: fetchedApps } = useQuery({
    queryKey: ['admin-partner-applications'],
    queryFn: () => partnerApi.getApplications({ status: 'pending' }),
    enabled: !passedApp && !!id,
  });

  const app = passedApp ?? fetchedApps?.items.find((a) => a.id === Number(id));

  const approveMutation = useMutation({
    mutationFn: ({ appId, commissionPercent }: { appId: number; commissionPercent: number }) =>
      partnerApi.approveApplication(appId, { commission_percent: commissionPercent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] });
      queryClient.invalidateQueries({ queryKey: ['admin-partner-stats'] });
      navigate('/admin/partners');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ appId, comment }: { appId: number; comment?: string }) =>
      partnerApi.rejectApplication(appId, { comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-partner-stats'] });
      navigate('/admin/partners');
    },
  });

  if (!app) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <AdminBackButton to="/admin/partners" />
          <h1 className="text-foreground text-xl font-semibold">
            {t('admin.partners.approveDialog.title')}
          </h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      </div>
    );
  }

  const displayName = app.first_name || app.username || `#${app.user_id}`;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to="/admin/partners" />
        <div>
          <h1 className="text-foreground text-xl font-semibold">
            {t('admin.partners.actions.review')}
          </h1>
          <p className="text-muted-foreground text-sm">{displayName}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Application Details */}
        <div className="border-border bg-card rounded-xl border p-4">
          <h3 className="text-foreground mb-4 font-medium">
            {t('admin.partners.tabs.applications')}
          </h3>
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-foreground font-medium">{displayName}</span>
                  {app.username && (
                    <span className="text-muted-foreground text-sm">@{app.username}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-muted-foreground space-y-2 text-sm">
              {app.company_name && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <span className="text-muted-foreground">
                    {t('admin.partners.applicationFields.companyName')}:
                  </span>{' '}
                  <span className="text-foreground">{app.company_name}</span>
                </div>
              )}
              {app.website_url && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <span className="text-muted-foreground">
                    {t('admin.partners.applicationFields.website')}:
                  </span>{' '}
                  <span className="text-foreground">{app.website_url}</span>
                </div>
              )}
              {app.telegram_channel && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <span className="text-muted-foreground">
                    {t('admin.partners.applicationFields.channel')}:
                  </span>{' '}
                  <span className="text-foreground">{app.telegram_channel}</span>
                </div>
              )}
              {app.description && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <span className="text-muted-foreground">
                    {t('admin.partners.applicationFields.description')}:
                  </span>{' '}
                  <span className="text-foreground">{app.description}</span>
                </div>
              )}
              {app.expected_monthly_referrals != null && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <span className="text-muted-foreground">
                    {t('admin.partners.applicationFields.expectedReferrals')}:
                  </span>{' '}
                  <span className="text-foreground">{app.expected_monthly_referrals}</span>
                </div>
              )}
              {app.desired_commission_percent != null && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <span className="text-muted-foreground">
                    {t('admin.partners.applicationFields.desiredCommission')}:
                  </span>{' '}
                  <span className="text-foreground">{app.desired_commission_percent}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Approve Section */}
        <div className="border-success-500/30 bg-card rounded-xl border p-4">
          <h3 className="text-foreground mb-2 text-lg font-semibold">
            {t('admin.partners.approveDialog.title')}
          </h3>
          <p className="text-muted-foreground mb-4 text-sm">
            {t('admin.partners.approveDialog.description', { name: displayName })}
          </p>
          <label className="text-muted-foreground mb-1 block text-sm font-medium">
            {t('admin.partners.approveDialog.commissionLabel')}
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            className="border-border bg-muted text-foreground focus:border-primary mb-4 w-full rounded-lg border px-3 py-2 outline-none"
            placeholder="10"
          />
          <Button
            onClick={() => {
              const val = Number(commission);
              if (val >= 1 && val <= 100) {
                approveMutation.mutate({ appId: app.id, commissionPercent: val });
              }
            }}
            disabled={
              approveMutation.isPending ||
              !commission ||
              Number(commission) < 1 ||
              Number(commission) > 100
            }
            className="bg-success-500 hover:bg-success-600 w-full"
          >
            {approveMutation.isPending ? t('common.saving') : t('admin.partners.actions.approve')}
          </Button>
        </div>

        {approveMutation.isError && (
          <div className="bg-error-500/10 text-error-400 rounded-lg p-3 text-sm">
            {t('common.error')}
          </div>
        )}

        {/* Reject Section */}
        <div className="border-error-500/30 bg-card rounded-xl border p-4">
          <h3 className="text-foreground mb-2 text-lg font-semibold">
            {t('admin.partners.rejectDialog.title')}
          </h3>
          <p className="text-muted-foreground mb-4 text-sm">
            {t('admin.partners.rejectDialog.description', { name: displayName })}
          </p>
          <label className="text-muted-foreground mb-1 block text-sm font-medium">
            {t('admin.partners.rejectDialog.commentLabel')}
          </label>
          <textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            className="border-border bg-muted text-foreground focus:border-primary mb-4 w-full rounded-lg border px-3 py-2 outline-none"
            rows={3}
            placeholder={t('admin.partners.rejectDialog.commentPlaceholder')}
          />
          <Button
            onClick={() =>
              rejectMutation.mutate({
                appId: app.id,
                comment: rejectComment || undefined,
              })
            }
            disabled={rejectMutation.isPending}
            variant="destructive"
            className="w-full"
          >
            {rejectMutation.isPending ? t('common.saving') : t('admin.partners.actions.reject')}
          </Button>

          {rejectMutation.isError && (
            <div className="bg-error-500/10 text-error-400 mt-4 rounded-lg p-3 text-sm">
              {t('common.error')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
