import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  promoOffersApi,
  PromoOfferTemplateUpdateRequest,
  OFFER_TYPE_CONFIG,
  OfferType,
} from '../api/promoOffers';
import { serversApi } from '../api/servers';
import { AdminBackButton } from '../components/admin';
import { createNumberInputHandler, toNumber } from '../utils/inputHelpers';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

const getOfferTypeIcon = (offerType: string): string => {
  return OFFER_TYPE_CONFIG[offerType as OfferType]?.icon || '🎁';
};

export default function AdminPromoOfferTemplateEdit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState('');
  const [messageText, setMessageText] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [validHours, setValidHours] = useState<number | ''>(24);
  const [discountPercent, setDiscountPercent] = useState<number | ''>(0);
  const [activeDiscountHours, setActiveDiscountHours] = useState<number | ''>(0);
  const [testDurationHours, setTestDurationHours] = useState<number | ''>(0);
  const [isActive, setIsActive] = useState(true);
  const [isTestAccess, setIsTestAccess] = useState(false);
  const [selectedSquadUuids, setSelectedSquadUuids] = useState<string[]>([]);

  // Fetch available servers for test_access squad selection
  const { data: serversData } = useQuery({
    queryKey: ['admin-servers-for-promo'],
    queryFn: () => serversApi.getServers(true),
    enabled: isTestAccess,
  });

  // Query template
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['admin-promo-templates'],
    queryFn: promoOffersApi.getTemplates,
  });

  const template = templatesData?.items.find((t) => t.id === Number(id));

  // Populate form when template loads
  useEffect(() => {
    if (template) {
      setName(template.name);
      setMessageText(template.message_text);
      setButtonText(template.button_text);
      setValidHours(template.valid_hours);
      setDiscountPercent(template.discount_percent);
      setActiveDiscountHours(template.active_discount_hours || 0);
      setTestDurationHours(template.test_duration_hours || 0);
      setIsActive(template.is_active);
      setIsTestAccess(template.offer_type === 'test_access');
      setSelectedSquadUuids(template.test_squad_uuids || []);
    }
  }, [template]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: PromoOfferTemplateUpdateRequest) =>
      promoOffersApi.updateTemplate(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promo-templates'] });
      navigate('/admin/promo-offers');
    },
  });

  const handleSubmit = () => {
    const data: PromoOfferTemplateUpdateRequest = {
      name,
      message_text: messageText,
      button_text: buttonText,
      valid_hours: toNumber(validHours, 1),
      discount_percent: toNumber(discountPercent),
      is_active: isActive,
    };
    const testHours = toNumber(testDurationHours);
    const discountHours = toNumber(activeDiscountHours);
    if (isTestAccess) {
      data.test_duration_hours = testHours > 0 ? testHours : undefined;
      data.test_squad_uuids = selectedSquadUuids;
    } else {
      data.active_discount_hours = discountHours > 0 ? discountHours : undefined;
    }
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <AdminBackButton to="/admin/promo-offers" />
          <h1 className="text-foreground text-xl font-semibold">
            {t('admin.promoOffers.form.editTemplate')}
          </h1>
        </div>
        <div className="py-12 text-center">
          <p className="text-error-400">{t('admin.promoOffers.notFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to="/admin/promo-offers" />
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getOfferTypeIcon(template.offer_type)}</span>
          <h1 className="text-foreground text-xl font-semibold">
            {t('admin.promoOffers.form.editTemplate')}
          </h1>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="border-border bg-card rounded-xl border p-6">
          <div className="space-y-4">
            <div>
              <label className="text-muted-foreground mb-2 block text-sm font-medium">
                {t('admin.promoOffers.form.templateName')}
                <span className="text-error-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`input ${name.length > 0 && !name.trim() ? 'border-error-500/50' : ''}`}
              />
            </div>

            <div>
              <label className="text-muted-foreground mb-2 block text-sm font-medium">
                {t('admin.promoOffers.form.messageText')}
                <span className="text-error-400">*</span>
              </label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
                className={`input resize-none ${messageText.length > 0 && !messageText.trim() ? 'border-error-500/50' : ''}`}
              />
            </div>

            <div>
              <label className="text-muted-foreground mb-2 block text-sm font-medium">
                {t('admin.promoOffers.form.buttonText')}
                <span className="text-error-400">*</span>
              </label>
              <input
                type="text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                className={`input ${buttonText.length > 0 && !buttonText.trim() ? 'border-error-500/50' : ''}`}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-muted-foreground mb-2 block text-sm font-medium">
                  {t('admin.promoOffers.form.validHours')}
                </label>
                <Input
                  type="number"
                  value={validHours}
                  onChange={createNumberInputHandler(setValidHours, 1)}
                  min={1}
                  placeholder="0"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  {t('admin.promoOffers.form.activationTime')}
                </p>
              </div>

              {!isTestAccess && (
                <div>
                  <label className="text-muted-foreground mb-2 block text-sm font-medium">
                    {t('admin.promoOffers.form.discountPercent')}
                  </label>
                  <Input
                    type="number"
                    value={discountPercent}
                    onChange={createNumberInputHandler(setDiscountPercent, 0, 100)}
                    min={0}
                    max={100}
                    placeholder="0"
                  />
                </div>
              )}
            </div>

            {isTestAccess ? (
              <>
                <div>
                  <label className="text-muted-foreground mb-2 block text-sm font-medium">
                    {t('admin.promoOffers.form.testDurationHours')}
                  </label>
                  <Input
                    type="number"
                    value={testDurationHours}
                    onChange={createNumberInputHandler(setTestDurationHours, 0)}
                    min={0}
                    placeholder="0"
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t('admin.promoOffers.form.defaultZero')}
                  </p>
                </div>
                <div>
                  <label className="text-muted-foreground mb-2 block text-sm font-medium">
                    {t('admin.promoOffers.form.testSquads', 'Тестовые серверы')}
                  </label>
                  {serversData?.servers && serversData.servers.length > 0 ? (
                    <div className="space-y-1.5">
                      {serversData.servers.map((server) => (
                        <label
                          key={server.squad_uuid || server.id}
                          className="border-border bg-muted/50 hover:border-primary/50 flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors"
                        >
                          <Checkbox
                            checked={selectedSquadUuids.includes(server.squad_uuid)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedSquadUuids([...selectedSquadUuids, server.squad_uuid]);
                              } else {
                                setSelectedSquadUuids(
                                  selectedSquadUuids.filter((u) => u !== server.squad_uuid),
                                );
                              }
                            }}
                          />
                          <span className="text-foreground">{server.display_name}</span>
                          {server.country_code && (
                            <span className="text-muted-foreground">{server.country_code}</span>
                          )}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {t('admin.promoOffers.form.noServers', 'Нет доступных серверов')}
                    </p>
                  )}
                  {selectedSquadUuids.length === 0 && (
                    <p className="text-warning-400 mt-1 text-xs">
                      {t(
                        'admin.promoOffers.form.selectSquadHint',
                        'Выберите хотя бы один сервер для тестового доступа',
                      )}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div>
                <label className="text-muted-foreground mb-2 block text-sm font-medium">
                  {t('admin.promoOffers.form.activeDiscountHours')}
                </label>
                <Input
                  type="number"
                  value={activeDiscountHours}
                  onChange={createNumberInputHandler(setActiveDiscountHours, 0)}
                  min={0}
                  placeholder="0"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  {t('admin.promoOffers.form.discountDurationHint')}
                </p>
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsActive(!isActive)}
                className={`relative h-6 w-11 rounded-full p-0 transition-colors ${
                  isActive ? 'bg-primary hover:bg-primary' : 'bg-muted hover:bg-muted'
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    isActive ? 'left-6' : 'left-1'
                  }`}
                />
              </Button>
              <span className="text-foreground text-sm">
                {t('admin.promoOffers.form.templateActive')}
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => navigate('/admin/promo-offers')}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || updateMutation.isPending}>
            {updateMutation.isPending ? t('admin.promoOffers.form.saving') : t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
