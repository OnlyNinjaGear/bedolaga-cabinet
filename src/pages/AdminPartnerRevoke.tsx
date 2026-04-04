import { useParams, useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { partnerApi } from '../api/partners';
import { AdminBackButton } from '../components/admin';
import { Button } from '@/components/ui/button';

export default function AdminPartnerRevoke() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const revokeMutation = useMutation({
    mutationFn: () => partnerApi.revokePartner(Number(userId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-detail', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] });
      queryClient.invalidateQueries({ queryKey: ['admin-partner-stats'] });
      navigate(`/admin/partners/${userId}`);
    },
  });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to={`/admin/partners/${userId}`} />
        <h1 className="text-foreground text-xl font-semibold">
          {t('admin.partnerDetail.revokeDialog.title')}
        </h1>
      </div>

      <div className="border-error-500/30 bg-card rounded-xl border p-6">
        <div className="bg-error-500/10 mb-6 rounded-lg p-4">
          <p className="text-muted-foreground">
            {t('admin.partnerDetail.revokeDialog.description')}
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate(`/admin/partners/${userId}`)}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => revokeMutation.mutate()}
            disabled={revokeMutation.isPending}
            className="flex-1"
          >
            {revokeMutation.isPending
              ? t('common.saving')
              : t('admin.partnerDetail.dangerZone.revokeButton')}
          </Button>
        </div>

        {revokeMutation.isError && (
          <div className="bg-error-500/10 text-error-400 mt-4 rounded-lg p-3 text-sm">
            {t('common.error')}
          </div>
        )}
      </div>
    </div>
  );
}
