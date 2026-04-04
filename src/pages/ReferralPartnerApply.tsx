import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { partnerApi, type PartnerApplicationRequest } from '../api/partners';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function ReferralPartnerApply() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<PartnerApplicationRequest>({
    company_name: '',
    website_url: '',
    telegram_channel: '',
    description: '',
    expected_monthly_referrals: undefined,
    desired_commission_percent: undefined,
  });

  // Guard: redirect if already approved or pending
  const { data: partnerStatus } = useQuery({
    queryKey: ['partner-status'],
    queryFn: partnerApi.getStatus,
  });

  useEffect(() => {
    if (
      partnerStatus?.partner_status === 'approved' ||
      partnerStatus?.partner_status === 'pending'
    ) {
      navigate('/referral', { replace: true });
    }
  }, [partnerStatus, navigate]);

  const applyMutation = useMutation({
    mutationFn: partnerApi.apply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-status'] });
      navigate('/referral');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const payload: PartnerApplicationRequest = {};
    if (form.company_name) payload.company_name = form.company_name;
    if (form.website_url) payload.website_url = form.website_url;
    if (form.telegram_channel) payload.telegram_channel = form.telegram_channel;
    if (form.description) payload.description = form.description;
    if (form.expected_monthly_referrals) {
      payload.expected_monthly_referrals = form.expected_monthly_referrals;
    }
    if (form.desired_commission_percent) {
      payload.desired_commission_percent = form.desired_commission_percent;
    }
    applyMutation.mutate(payload);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-foreground text-2xl font-bold">{t('referral.partner.applyTitle')}</h1>
      <p className="text-muted-foreground text-sm">{t('referral.partner.applyDesc')}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bento-card space-y-4">
          <div>
            <label className="text-muted-foreground mb-1 block text-sm font-medium">
              {t('referral.partner.fields.companyName')}
            </label>
            <Input
              type="text"
              className="w-full"
              value={form.company_name ?? ''}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              placeholder={t('referral.partner.fields.companyNamePlaceholder')}
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-sm font-medium">
              {t('referral.partner.fields.telegramChannel')}
            </label>
            <Input
              type="text"
              className="w-full"
              value={form.telegram_channel ?? ''}
              onChange={(e) => setForm({ ...form, telegram_channel: e.target.value })}
              placeholder={t('referral.partner.fields.telegramChannelPlaceholder')}
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-sm font-medium">
              {t('referral.partner.fields.websiteUrl')}
            </label>
            <Input
              type="url"
              className="w-full"
              value={form.website_url ?? ''}
              onChange={(e) => setForm({ ...form, website_url: e.target.value })}
              placeholder={t('referral.partner.fields.websiteUrlPlaceholder')}
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-sm font-medium">
              {t('referral.partner.fields.description')}
            </label>
            <Textarea
              className="min-h-20 w-full"
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t('referral.partner.fields.descriptionPlaceholder')}
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-sm font-medium">
              {t('referral.partner.fields.expectedReferrals')}
            </label>
            <Input
              type="number"
              min={0}
              max={2000000000}
              className="w-full"
              value={form.expected_monthly_referrals ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  expected_monthly_referrals: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              placeholder={t('referral.partner.fields.expectedReferralsPlaceholder')}
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-sm font-medium">
              {t('referral.partner.fields.desiredCommission')}
            </label>
            <Input
              type="number"
              min={1}
              max={100}
              className="w-full"
              value={form.desired_commission_percent ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  desired_commission_percent: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              placeholder={t('referral.partner.fields.desiredCommissionPlaceholder')}
            />
          </div>
        </div>

        {applyMutation.isError && (
          <div className="bg-error-500/10 text-error-400 rounded-lg p-3 text-sm">
            {t('referral.partner.applyError')}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            onClick={() => navigate('/referral')}
            variant="outline"
            className="flex-1 px-5"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={applyMutation.isPending}
            className={`flex-1 px-5 ${applyMutation.isPending ? 'opacity-50' : ''}`}
          >
            {applyMutation.isPending
              ? t('referral.partner.applying')
              : t('referral.partner.submitApplication')}
          </Button>
        </div>
      </form>
    </div>
  );
}
