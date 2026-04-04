import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import i18n from '../i18n';
import { promoOffersApi, PromoOfferLog, OFFER_TYPE_CONFIG, OfferType } from '../api/promoOffers';
import { usePlatform } from '../platform/hooks/usePlatform';
import { Button } from '@/components/ui/button';

// Icons
const BackIcon = () => (
  <svg
    className="text-muted-foreground h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  </svg>
);

const SendIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
    />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const UserIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
    />
  </svg>
);

// Helper functions
const formatDateTime = (date: string | null): string => {
  if (!date) return '-';
  const localeMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US', zh: 'zh-CN', fa: 'fa-IR' };
  const locale = localeMap[i18n.language] || 'ru-RU';
  return new Date(date).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    created: i18n.t('admin.promoOffers.actions.created'),
    claimed: i18n.t('admin.promoOffers.actions.claimed'),
    consumed: i18n.t('admin.promoOffers.actions.consumed'),
    disabled: i18n.t('admin.promoOffers.actions.disabled'),
  };
  return labels[action] || action;
};

const getActionColor = (action: string): string => {
  const colors: Record<string, string> = {
    created: 'bg-primary/20 text-primary',
    claimed: 'bg-success-500/20 text-success-400',
    consumed: 'bg-primary/20 text-primary',
    disabled: 'bg-muted text-muted-foreground',
  };
  return colors[action] || 'bg-muted text-muted-foreground';
};

const getOfferTypeIcon = (offerType: string): string => {
  return OFFER_TYPE_CONFIG[offerType as OfferType]?.icon || '🎁';
};

const getOfferTypeLabel = (offerType: string): string => {
  const config = OFFER_TYPE_CONFIG[offerType as OfferType];
  return config ? i18n.t(config.labelKey) : offerType;
};

export default function AdminPromoOffers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { capabilities } = usePlatform();

  const [activeTab, setActiveTab] = useState<'templates' | 'logs'>('templates');

  // Queries
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['admin-promo-templates'],
    queryFn: promoOffersApi.getTemplates,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['admin-promo-logs'],
    queryFn: () => promoOffersApi.getLogs({ limit: 100 }),
    enabled: activeTab === 'logs',
  });

  const templates = templatesData?.items || [];
  const logs = logsData?.items || [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Show back button only on web, not in Telegram Mini App */}
          {!capabilities.hasBackButton && (
            <Button variant="outline" size="icon" onClick={() => navigate('/admin')}>
              <BackIcon />
            </Button>
          )}
          <div>
            <h1 className="text-foreground text-xl font-semibold">
              {t('admin.promoOffers.title')}
            </h1>
            <p className="text-muted-foreground text-sm">{t('admin.promoOffers.subtitle')}</p>
          </div>
        </div>
        <Button
          onClick={() => navigate('/admin/promo-offers/send')}
          className="flex items-center justify-center gap-2"
        >
          <SendIcon />
          {t('admin.promoOffers.sendButton')}
        </Button>
      </div>

      {/* Tabs */}
      <div className="bg-card mb-6 flex w-fit gap-1 rounded-lg p-1">
        <Button
          variant={activeTab === 'templates' ? 'secondary' : 'ghost'}
          onClick={() => setActiveTab('templates')}
        >
          {t('admin.promoOffers.tabs.templates', { count: templates.length })}
        </Button>
        <Button
          variant={activeTab === 'logs' ? 'secondary' : 'ghost'}
          onClick={() => setActiveTab('logs')}
        >
          {t('admin.promoOffers.tabs.logs')}
        </Button>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <>
          {templatesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          ) : templates.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">{t('admin.promoOffers.noData.templates')}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`bg-card rounded-xl border p-4 transition-colors ${
                    template.is_active ? 'border-border' : 'border-border/50 opacity-60'
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getOfferTypeIcon(template.offer_type)}</span>
                      <div>
                        <h3 className="text-foreground font-medium">{template.name}</h3>
                        <span className="text-muted-foreground text-xs">
                          {getOfferTypeLabel(template.offer_type)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/admin/promo-offers/templates/${template.id}/edit`)}
                    >
                      <EditIcon />
                    </Button>
                  </div>

                  <div className="space-y-2 text-sm">
                    {template.discount_percent > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t('admin.promoOffers.table.discount')}:
                        </span>
                        <span className="text-primary font-medium">
                          {template.discount_percent}%
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t('admin.promoOffers.table.offerDuration')}:
                      </span>
                      <span className="text-foreground">
                        {t('admin.promoOffers.table.hoursShort', { hours: template.valid_hours })}
                      </span>
                    </div>
                    {template.active_discount_hours && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t('admin.promoOffers.table.discountDuration')}:
                        </span>
                        <span className="text-foreground">
                          {t('admin.promoOffers.table.hoursShort', {
                            hours: template.active_discount_hours,
                          })}
                        </span>
                      </div>
                    )}
                    {template.test_duration_hours && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t('admin.promoOffers.table.testAccess')}:
                        </span>
                        <span className="text-foreground">
                          {t('admin.promoOffers.table.hoursShort', {
                            hours: template.test_duration_hours,
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="border-border mt-3 border-t pt-3">
                    <div className="flex items-center gap-2">
                      {template.is_active ? (
                        <span className="bg-success-500/20 text-success-400 rounded px-2 py-0.5 text-xs">
                          {t('admin.promoOffers.status.active')}
                        </span>
                      ) : (
                        <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs">
                          {t('admin.promoOffers.status.inactive')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <>
          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">{t('admin.promoOffers.noData.logs')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log: PromoOfferLog) => (
                <div key={log.id} className="border-border bg-card rounded-xl border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                        <UserIcon />
                      </div>
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="text-foreground font-medium">
                            {log.user?.full_name || log.user?.username || `User #${log.user_id}`}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${getActionColor(log.action)}`}
                          >
                            {getActionLabel(log.action)}
                          </span>
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {log.source && <span>{getOfferTypeLabel(log.source)}</span>}
                          {log.percent && log.percent > 0 && (
                            <span className="text-primary ml-2">{log.percent}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-1 pl-13 text-xs sm:pl-0">
                      <ClockIcon />
                      {formatDateTime(log.created_at)}
                    </div>
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
