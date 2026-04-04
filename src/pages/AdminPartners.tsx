import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  partnerApi,
  type AdminPartnerItem,
  type AdminPartnerApplicationItem,
} from '../api/partners';
import { AdminBackButton } from '../components/admin';
import { useCurrency } from '../hooks/useCurrency';
import { Button } from '@/components/ui/button';

export default function AdminPartners() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatWithCurrency } = useCurrency();

  const [activeTab, setActiveTab] = useState<'partners' | 'applications'>('partners');

  // Queries
  const { data: stats } = useQuery({
    queryKey: ['admin-partner-stats'],
    queryFn: () => partnerApi.getStats(),
  });

  const { data: partnersData, isLoading: partnersLoading } = useQuery({
    queryKey: ['admin-partners'],
    queryFn: () => partnerApi.getPartners(),
  });

  const { data: applicationsData, isLoading: applicationsLoading } = useQuery({
    queryKey: ['admin-partner-applications'],
    queryFn: () => partnerApi.getApplications({ status: 'pending' }),
  });

  const partners = partnersData?.items || [];
  const applications = applicationsData?.items || [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to="/admin" />
        <div className="flex-1">
          <h1 className="text-foreground text-xl font-semibold">{t('admin.partners.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('admin.partners.subtitle')}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/partners/settings')}
          title={t('admin.partners.settings')}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="border-border bg-card rounded-xl border p-4">
            <div className="text-foreground text-2xl font-bold">{stats.total_partners}</div>
            <div className="text-muted-foreground text-sm">{t('admin.partners.totalPartners')}</div>
          </div>
          <div className="border-border bg-card rounded-xl border p-4">
            <div className="text-primary text-2xl font-bold">{stats.pending_applications}</div>
            <div className="text-muted-foreground text-sm">
              {t('admin.partners.pendingApplications')}
            </div>
          </div>
          <div className="border-border bg-card rounded-xl border p-4">
            <div className="text-foreground text-2xl font-bold">{stats.total_referrals}</div>
            <div className="text-muted-foreground text-sm">
              {t('admin.partners.totalReferrals')}
            </div>
          </div>
          <div className="border-border bg-card rounded-xl border p-4">
            <div className="text-success-400 text-2xl font-bold">
              {formatWithCurrency(stats.total_earnings_kopeks / 100)}
            </div>
            <div className="text-muted-foreground text-sm">{t('admin.partners.totalEarnings')}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-border bg-card/40 mb-4 flex gap-1 rounded-lg border p-1">
        <Button
          variant={activeTab === 'partners' ? 'secondary' : 'ghost'}
          onClick={() => setActiveTab('partners')}
          className="flex-1"
        >
          {t('admin.partners.tabs.partners')}
        </Button>
        <Button
          variant={activeTab === 'applications' ? 'secondary' : 'ghost'}
          onClick={() => setActiveTab('applications')}
          className="flex-1"
        >
          {t('admin.partners.tabs.applications')}
          {applications.length > 0 && (
            <span className="bg-primary/20 text-primary ml-2 rounded-full px-2 py-0.5 text-xs">
              {applications.length}
            </span>
          )}
        </Button>
      </div>

      {/* Partners Tab */}
      {activeTab === 'partners' && (
        <>
          {partnersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          ) : partners.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">{t('admin.partners.noPartners')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {partners.map((partner: AdminPartnerItem) => (
                <Button
                  key={partner.user_id}
                  variant="outline"
                  onClick={() => navigate(`/admin/partners/${partner.user_id}`)}
                  className="h-auto w-full justify-start rounded-xl p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="text-foreground truncate font-medium">
                          {partner.first_name || partner.username || `#${partner.user_id}`}
                        </h3>
                        {partner.username && (
                          <span className="text-muted-foreground text-sm">@{partner.username}</span>
                        )}
                      </div>
                      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <span>
                          {t('admin.partners.commission', {
                            percent: partner.commission_percent ?? 0,
                          })}
                        </span>
                        <span>
                          {t('admin.partners.referrals', { count: partner.total_referrals })}
                        </span>
                        <span className="text-success-400">
                          {formatWithCurrency(partner.total_earnings_kopeks / 100)}
                        </span>
                      </div>
                    </div>
                    <svg
                      className="text-muted-foreground h-5 w-5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Applications Tab */}
      {activeTab === 'applications' && (
        <>
          {applicationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          ) : applications.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">{t('admin.partners.noApplications')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app: AdminPartnerApplicationItem) => (
                <div key={app.id} className="border-border bg-card rounded-xl border p-4">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="text-foreground truncate font-medium">
                          {app.first_name || app.username || `#${app.user_id}`}
                        </h3>
                        {app.username && (
                          <span className="text-muted-foreground text-sm">@{app.username}</span>
                        )}
                      </div>
                      {app.company_name && (
                        <div className="text-muted-foreground text-sm">{app.company_name}</div>
                      )}
                    </div>
                  </div>

                  {/* Application details */}
                  <div className="text-muted-foreground mb-3 space-y-1 text-sm">
                    {app.website_url && (
                      <div>
                        {t('admin.partners.applicationFields.website')}: {app.website_url}
                      </div>
                    )}
                    {app.telegram_channel && (
                      <div>
                        {t('admin.partners.applicationFields.channel')}: {app.telegram_channel}
                      </div>
                    )}
                    {app.description && (
                      <div>
                        {t('admin.partners.applicationFields.description')}: {app.description}
                      </div>
                    )}
                    {app.expected_monthly_referrals != null && (
                      <div>
                        {t('admin.partners.applicationFields.expectedReferrals')}:{' '}
                        {app.expected_monthly_referrals}
                      </div>
                    )}
                    {app.desired_commission_percent != null && (
                      <div>
                        {t('admin.partners.applicationFields.desiredCommission')}:{' '}
                        {app.desired_commission_percent}%
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        navigate(`/admin/partners/applications/${app.id}/review`, {
                          state: { application: app },
                        })
                      }
                      className="flex-1"
                      variant="outline"
                    >
                      {t('admin.partners.actions.review')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
