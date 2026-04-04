import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { campaignsApi, CampaignListItem, CampaignBonusType } from '../api/campaigns';
import { PlusIcon, EditIcon, TrashIcon, CheckIcon, XIcon, ChartIcon } from '../components/icons';
import { usePlatform } from '../platform/hooks/usePlatform';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 50;

// Bonus type labels and colors
const bonusTypeConfig: Record<
  CampaignBonusType,
  { labelKey: string; color: string; bgColor: string }
> = {
  balance: {
    labelKey: 'admin.campaigns.bonusType.balance',
    color: 'text-success-400',
    bgColor: 'bg-success-500/20',
  },
  subscription: {
    labelKey: 'admin.campaigns.bonusType.subscription',
    color: 'text-primary',
    bgColor: 'bg-primary/20',
  },
  tariff: {
    labelKey: 'admin.campaigns.bonusType.tariff',
    color: 'text-primary',
    bgColor: 'bg-primary/20',
  },
  none: {
    labelKey: 'admin.campaigns.bonusType.none',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/20',
  },
};

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

// Locale mapping for formatting
const localeMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US', zh: 'zh-CN', fa: 'fa-IR' };

// Format number as rubles
const formatRubles = (kopeks: number) => {
  const locale = localeMap[i18n.language] || 'ru-RU';
  return (
    (kopeks / 100).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) +
    ' ₽'
  );
};

// Main Component
export default function AdminCampaigns() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Queries
  const {
    data: campaignsData,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['admin-campaigns'],
    queryFn: ({ pageParam = 0 }) => campaignsApi.getCampaigns(true, pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.campaigns.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });

  const { data: overview } = useQuery({
    queryKey: ['admin-campaigns-overview'],
    queryFn: () => campaignsApi.getOverview(),
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: campaignsApi.deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns-overview'] });
      setDeleteConfirm(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: campaignsApi.toggleCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
    },
  });

  const campaigns = campaignsData?.pages.flatMap((p) => p.campaigns) ?? [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Show back button only on web, not in Telegram Mini App */}
          {!capabilities.hasBackButton && (
            <button
              onClick={() => navigate('/admin')}
              className="border-border bg-card hover:border-border flex h-10 w-10 items-center justify-center rounded-xl border transition-colors"
            >
              <BackIcon />
            </button>
          )}
          <div>
            <h1 className="text-foreground text-xl font-semibold">{t('admin.campaigns.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('admin.campaigns.subtitle')}</p>
          </div>
        </div>
        <Button onClick={() => navigate('/admin/campaigns/create')}>
          <PlusIcon />
          {t('admin.campaigns.createButton')}
        </Button>
      </div>

      {/* Overview */}
      {overview && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="border-border bg-card rounded-xl border p-4">
            <div className="text-foreground text-2xl font-bold">{overview.total}</div>
            <div className="text-muted-foreground text-sm">
              {t('admin.campaigns.overview.totalCampaigns')}
            </div>
          </div>
          <div className="border-border bg-card rounded-xl border p-4">
            <div className="text-success-400 text-2xl font-bold">{overview.active}</div>
            <div className="text-muted-foreground text-sm">
              {t('admin.campaigns.overview.active')}
            </div>
          </div>
          <div className="border-border bg-card rounded-xl border p-4">
            <div className="text-primary text-2xl font-bold">{overview.total_registrations}</div>
            <div className="text-muted-foreground text-sm">
              {t('admin.campaigns.overview.registrations')}
            </div>
          </div>
          <div className="border-border bg-card rounded-xl border p-4">
            <div className="text-success-400 text-2xl font-bold">
              {formatRubles(overview.total_balance_issued_kopeks)}
            </div>
            <div className="text-muted-foreground text-sm">
              {t('admin.campaigns.overview.bonusesIssued')}
            </div>
          </div>
        </div>
      )}

      {/* Campaigns List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">{t('admin.campaigns.noData')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign: CampaignListItem) => (
            <div
              key={campaign.id}
              className={`bg-card rounded-xl border p-4 transition-colors ${
                campaign.is_active ? 'border-border' : 'border-border/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-foreground truncate font-medium">{campaign.name}</h3>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${bonusTypeConfig[campaign.bonus_type].bgColor} ${bonusTypeConfig[campaign.bonus_type].color}`}
                    >
                      {t(bonusTypeConfig[campaign.bonus_type].labelKey)}
                    </span>
                    {campaign.partner_name && (
                      <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
                        {campaign.partner_name}
                      </span>
                    )}
                    {!campaign.is_active && (
                      <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs">
                        {t('admin.campaigns.table.inactive')}
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span className="font-mono text-xs">?start={campaign.start_parameter}</span>
                    <span>
                      {t('admin.campaigns.table.registrations', {
                        count: campaign.registrations_count,
                      })}
                    </span>
                    <span>
                      {t('admin.campaigns.table.revenue', {
                        amount: formatRubles(campaign.total_revenue_kopeks),
                      })}
                    </span>
                    <span>
                      {t('admin.campaigns.table.conversion', { rate: campaign.conversion_rate })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Stats */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/admin/campaigns/${campaign.id}/stats`)}
                    title={t('admin.campaigns.table.statistics')}
                  >
                    <ChartIcon />
                  </Button>

                  {/* Toggle Active */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleMutation.mutate(campaign.id)}
                    className={
                      campaign.is_active
                        ? 'bg-success-500/20 text-success-400 hover:bg-success-500/30'
                        : ''
                    }
                    title={
                      campaign.is_active
                        ? t('admin.campaigns.table.deactivate')
                        : t('admin.campaigns.table.activate')
                    }
                  >
                    {campaign.is_active ? <CheckIcon /> : <XIcon />}
                  </Button>

                  {/* Edit */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/admin/campaigns/${campaign.id}/edit`)}
                    title={t('admin.campaigns.table.edit')}
                  >
                    <EditIcon />
                  </Button>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteConfirm(campaign.id)}
                    title={t('admin.campaigns.table.delete')}
                    disabled={campaign.registrations_count > 0}
                  >
                    <TrashIcon />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Load more */}
          {hasNextPage && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <div className="border-border border-t-accent-500 h-4 w-4 animate-spin rounded-full border-2" />
              ) : (
                t('admin.campaigns.loadMore', 'Load more')
              )}
            </Button>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.campaigns.confirm.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.campaigns.confirm.deleteText')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm(null)}>
              {t('admin.campaigns.confirm.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm !== null && deleteMutation.mutate(deleteConfirm)}
              className="bg-error-500 hover:bg-error-600"
            >
              {t('admin.campaigns.confirm.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
