import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { promocodesApi, PromoCode, PromoCodeType } from '../api/promocodes';
import { usePlatform } from '../platform/hooks/usePlatform';
import { Button } from '@/components/ui/button';
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

const PlusIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const CopyIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
    />
  </svg>
);

const ChartIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  </svg>
);

// Helper functions
const getTypeLabel = (type: PromoCodeType): string => {
  const labels: Record<PromoCodeType, string> = {
    balance: i18n.t('admin.promocodes.type.balance'),
    subscription_days: i18n.t('admin.promocodes.type.subscriptionDays'),
    trial_subscription: i18n.t('admin.promocodes.type.trialSubscription'),
    promo_group: i18n.t('admin.promocodes.type.promoGroup'),
    discount: i18n.t('admin.promocodes.type.discount'),
  };
  return labels[type] || type;
};

const getTypeColor = (type: PromoCodeType): string => {
  const colors: Record<PromoCodeType, string> = {
    balance: 'bg-success-500/20 text-success-400',
    subscription_days: 'bg-primary/20 text-primary',
    trial_subscription: 'bg-primary/20 text-primary',
    promo_group: 'bg-warning-500/20 text-warning-400',
    discount: 'bg-pink-500/20 text-pink-400',
  };
  return colors[type] || 'bg-muted text-muted-foreground';
};

const formatDate = (date: string | null): string => {
  if (!date) return '-';
  const localeMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US', zh: 'zh-CN', fa: 'fa-IR' };
  const locale = localeMap[i18n.language] || 'ru-RU';
  return new Date(date).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export default function AdminPromocodes() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Query
  const { data: promocodesData, isLoading } = useQuery({
    queryKey: ['admin-promocodes'],
    queryFn: () => promocodesApi.getPromocodes({ limit: 100 }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: promocodesApi.deletePromocode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promocodes'] });
      setDeleteConfirm(null);
    },
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const promocodes = promocodesData?.items || [];

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
            <h1 className="text-foreground text-xl font-semibold">{t('admin.promocodes.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('admin.promocodes.subtitle')}</p>
          </div>
        </div>
        <Button
          onClick={() => navigate('/admin/promocodes/create')}
          className="flex items-center justify-center gap-2"
        >
          <PlusIcon />
          {t('admin.promocodes.addPromocode')}
        </Button>
      </div>

      {/* Stats Overview */}
      {promocodes.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="border-border bg-card rounded-xl border p-4">
            <div className="text-foreground text-2xl font-bold">{promocodes.length}</div>
            <div className="text-muted-foreground text-xs">
              {t('admin.promocodes.stats.totalPromocodes')}
            </div>
          </div>
          <div className="border-border bg-card rounded-xl border p-4">
            <div className="text-success-400 text-2xl font-bold">
              {promocodes.filter((p) => p.is_active && p.is_valid).length}
            </div>
            <div className="text-muted-foreground text-xs">
              {t('admin.promocodes.stats.activeCount')}
            </div>
          </div>
          <div className="border-border bg-card rounded-xl border p-4">
            <div className="text-primary text-2xl font-bold">
              {promocodes.reduce((sum, p) => sum + p.current_uses, 0)}
            </div>
            <div className="text-muted-foreground text-xs">
              {t('admin.promocodes.stats.usagesCount')}
            </div>
          </div>
          <div className="border-border bg-card rounded-xl border p-4">
            <div className="text-warning-400 text-2xl font-bold">
              {promocodes.filter((p) => p.uses_left === 0 && p.max_uses > 0).length}
            </div>
            <div className="text-muted-foreground text-xs">
              {t('admin.promocodes.stats.exhausted')}
            </div>
          </div>
        </div>
      )}

      {/* Promocodes List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      ) : promocodes.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">{t('admin.promocodes.noPromocodes')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promocodes.map((promo: PromoCode) => (
            <div
              key={promo.id}
              className={`bg-card rounded-xl border p-4 transition-colors ${
                promo.is_active ? 'border-border' : 'border-border/50 opacity-60'
              }`}
            >
              {/* Mobile: stacked layout, Desktop: row layout */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  {/* Code with copy button */}
                  <div className="mb-2 flex items-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => handleCopyCode(promo.code)}
                      className="text-foreground hover:text-primary flex h-auto items-center gap-1.5 p-0 font-mono font-medium hover:bg-transparent"
                    >
                      {promo.code}
                      {copiedCode === promo.code ? <CheckIcon /> : <CopyIcon />}
                    </Button>
                  </div>
                  {/* Badges - wrap on mobile */}
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <span className={`rounded px-2 py-0.5 text-xs ${getTypeColor(promo.type)}`}>
                      {getTypeLabel(promo.type)}
                    </span>
                    {!promo.is_active && (
                      <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs">
                        {t('admin.promocodes.stats.inactive')}
                      </span>
                    )}
                    {promo.first_purchase_only && (
                      <span className="bg-warning-500/20 text-warning-400 rounded px-2 py-0.5 text-xs">
                        {t('admin.promocodes.firstPurchase')}
                      </span>
                    )}
                  </div>
                  {/* Info line */}
                  <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {promo.type === 'balance' && (
                      <span className="text-success-400">
                        +{promo.balance_bonus_rubles} {t('admin.promocodes.form.rub')}
                      </span>
                    )}
                    {(promo.type === 'subscription_days' ||
                      promo.type === 'trial_subscription') && (
                      <span className="text-primary">
                        +{promo.subscription_days} {t('admin.promocodes.form.days')}
                      </span>
                    )}
                    {promo.type === 'discount' && (
                      <span className="text-pink-400">
                        {t('admin.promocodes.discountForHours', {
                          percent: promo.balance_bonus_kopeks,
                          hours: promo.subscription_days,
                        })}
                      </span>
                    )}
                    <span>
                      {t('admin.promocodes.used')}: {promo.current_uses}/
                      {promo.max_uses === 0 ? '∞' : promo.max_uses}
                    </span>
                    {promo.valid_until && (
                      <span>
                        {t('admin.promocodes.until')}: {formatDate(promo.valid_until)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons - full width on mobile */}
                <div className="border-border flex items-center gap-2 border-t pt-3 sm:border-0 sm:pt-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/admin/promocodes/${promo.id}/stats`)}
                    className="hover:bg-primary/20 hover:text-primary flex-1 sm:flex-none"
                    title={t('admin.promocodes.actions.stats')}
                  >
                    <ChartIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/admin/promocodes/${promo.id}/edit`)}
                    className="flex-1 sm:flex-none"
                    title={t('admin.promocodes.actions.edit')}
                  >
                    <EditIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteConfirm(promo.id)}
                    className="hover:bg-error-500/20 hover:text-error-400 flex-1 sm:flex-none"
                    title={t('admin.promocodes.actions.delete')}
                  >
                    <TrashIcon />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.promocodes.confirm.deletePromocode')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.promocodes.confirm.deletePromocodeText')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm(null)}>
              {t('admin.promocodes.form.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm !== null && deleteMutation.mutate(deleteConfirm)}
              className="bg-error-500 hover:bg-error-600"
            >
              {t('admin.promocodes.confirm.deleteButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
