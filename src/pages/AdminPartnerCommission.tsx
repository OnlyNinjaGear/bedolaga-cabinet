import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { partnerApi } from '../api/partners';
import { AdminBackButton } from '../components/admin';
import { Button } from '@/components/ui/button';

export default function AdminPartnerCommission() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Try to get current commission from navigate state
  const passedCommission = (location.state as { currentCommission?: number } | null)
    ?.currentCommission;

  const { data: partner } = useQuery({
    queryKey: ['admin-partner-detail', userId],
    queryFn: () => partnerApi.getPartnerDetail(Number(userId)),
    enabled: passedCommission === undefined && !!userId,
  });

  const currentCommission = passedCommission ?? partner?.commission_percent ?? 0;
  const [commissionValue, setCommissionValue] = useState(String(currentCommission));

  // Sync commission value when data loads asynchronously
  useEffect(() => {
    if (partner?.commission_percent != null && passedCommission === undefined) {
      setCommissionValue(String(partner.commission_percent));
    }
  }, [partner?.commission_percent, passedCommission]);

  const updateMutation = useMutation({
    mutationFn: (commission: number) => partnerApi.updateCommission(Number(userId), commission),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-detail', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] });
      navigate(`/admin/partners/${userId}`);
    },
  });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to={`/admin/partners/${userId}`} />
        <h1 className="text-foreground text-xl font-semibold">
          {t('admin.partnerDetail.commissionDialog.title')}
        </h1>
      </div>

      <div className="border-border bg-card rounded-xl border p-6">
        <p className="text-muted-foreground mb-4 text-sm">
          {t('admin.partnerDetail.commissionDialog.description')}
        </p>

        <div className="text-muted-foreground mb-2 text-sm">
          {t('admin.partnerDetail.commission.title')}: {currentCommission}%
        </div>

        <label className="text-muted-foreground mb-1 block text-sm font-medium">
          {t('admin.partnerDetail.commissionDialog.label')}
        </label>
        <input
          type="number"
          min="1"
          max="100"
          value={commissionValue}
          onChange={(e) => setCommissionValue(e.target.value)}
          className="border-border bg-muted text-foreground focus:border-primary mb-6 w-full rounded-lg border px-3 py-2 outline-none"
        />

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate(`/admin/partners/${userId}`)}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => {
              const val = Number(commissionValue);
              if (val >= 1 && val <= 100) updateMutation.mutate(val);
            }}
            disabled={
              updateMutation.isPending ||
              !commissionValue ||
              Number(commissionValue) < 1 ||
              Number(commissionValue) > 100
            }
            className="flex-1"
          >
            {updateMutation.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </div>

        {updateMutation.isError && (
          <div className="bg-error-500/10 text-error-400 mt-4 rounded-lg p-3 text-sm">
            {t('common.error')}
          </div>
        )}
      </div>
    </div>
  );
}
