import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { withdrawalApi } from '../api/withdrawals';
import { AdminBackButton } from '../components/admin';
import { useCurrency } from '../hooks/useCurrency';

export default function AdminWithdrawalReject() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { formatWithCurrency } = useCurrency();

  const [comment, setComment] = useState('');

  // Try to get withdrawal summary from navigate state
  const passedDetail = location.state as {
    amountKopeks?: number;
    username?: string;
    firstName?: string;
  } | null;

  const rejectMutation = useMutation({
    mutationFn: (rejectComment: string) =>
      withdrawalApi.reject(Number(id), rejectComment || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawal-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      navigate(`/admin/withdrawals/${id}`);
    },
  });

  const displayName = passedDetail?.username
    ? `@${passedDetail.username}`
    : passedDetail?.firstName || '';

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to={`/admin/withdrawals/${id}`} />
        <div>
          <h1 className="text-foreground text-xl font-semibold">
            {t('admin.withdrawals.detail.rejectTitle')}
          </h1>
          {passedDetail?.amountKopeks != null && passedDetail.amountKopeks > 0 && (
            <p className="text-muted-foreground text-sm">
              #{id} {'\u2022'} {formatWithCurrency(passedDetail.amountKopeks / 100, 0)}
              {displayName && ` \u2022 ${displayName}`}
            </p>
          )}
        </div>
      </div>

      <div className="border-error-500/30 bg-card rounded-xl border p-6">
        <p className="text-muted-foreground mb-4 text-sm">
          {t('admin.withdrawals.detail.rejectDescription')}
        </p>

        <label className="text-muted-foreground mb-1 block text-sm font-medium">
          {t('admin.withdrawals.detail.commentPlaceholder')}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('admin.withdrawals.detail.commentPlaceholder')}
          className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus:border-primary mb-6 w-full rounded-lg border p-3 text-sm focus:outline-none"
          rows={3}
        />

        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/admin/withdrawals/${id}`)}
            className="bg-muted text-muted-foreground hover:bg-muted hover:text-foreground flex-1 rounded-lg px-4 py-3 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => rejectMutation.mutate(comment)}
            disabled={rejectMutation.isPending}
            className="bg-error-500 hover:bg-error-600 flex-1 rounded-lg px-4 py-3 font-medium text-white transition-colors disabled:opacity-50"
          >
            {rejectMutation.isPending
              ? t('admin.withdrawals.detail.rejecting')
              : t('admin.withdrawals.detail.confirmReject')}
          </button>
        </div>

        {rejectMutation.isError && (
          <div className="bg-error-500/10 text-error-400 mt-4 rounded-lg p-3 text-sm">
            {t('common.error')}
          </div>
        )}
      </div>
    </div>
  );
}
