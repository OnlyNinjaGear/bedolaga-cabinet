import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { tariffsApi, TariffListItem } from '../api/tariffs';
import { useDestructiveConfirm, useNotify } from '@/platform';
import { usePlatform } from '../platform/hooks/usePlatform';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';

// Icons
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

const XIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const GiftIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
    />
  </svg>
);

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

const GripIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
    />
  </svg>
);

const SaveIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
);

// ============ Sortable Tariff Card ============

interface SortableTariffCardProps {
  tariff: TariffListItem;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onToggleTrial: () => void;
}

function SortableTariffCard({
  tariff,
  onEdit,
  onDelete,
  onToggle,
  onToggleTrial,
}: SortableTariffCardProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tariff.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? 'relative' : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card rounded-xl border p-4 transition-colors ${
        isDragging
          ? 'border-primary/50 shadow-primary/20 shadow-xl'
          : tariff.is_active
            ? 'border-border'
            : 'border-border/50 opacity-60'
      }`}
    >
      <div className="flex gap-3">
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground hover:bg-muted/50 hover:text-muted-foreground mt-1 shrink-0 cursor-grab touch-none rounded-lg p-2.5 active:cursor-grabbing sm:p-1.5"
          title={t('admin.tariffs.dragToReorder')}
        >
          <GripIcon />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h3 className="text-foreground truncate font-medium">{tariff.name}</h3>
                {tariff.is_daily ? (
                  <span className="bg-warning-500/20 text-warning-400 rounded px-2 py-0.5 text-xs">
                    {t('admin.tariffs.dailyType')}
                  </span>
                ) : (
                  <span className="bg-primary/20 text-primary rounded px-2 py-0.5 text-xs">
                    {t('admin.tariffs.periodType')}
                  </span>
                )}
                {tariff.is_trial_available && (
                  <span className="bg-success-500/20 text-success-400 rounded px-2 py-0.5 text-xs">
                    {t('admin.tariffs.trial')}
                  </span>
                )}
                {tariff.show_in_gift && (
                  <span className="inline-flex items-center gap-1 rounded bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                      />
                    </svg>
                    {t('admin.tariffs.giftBadge')}
                  </span>
                )}
                {!tariff.is_active && (
                  <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs">
                    {t('admin.tariffs.inactive')}
                  </span>
                )}
              </div>
              <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {tariff.is_daily && tariff.daily_price_kopeks > 0 && (
                  <span className="text-warning-400">
                    {(tariff.daily_price_kopeks / 100).toFixed(2)}{' '}
                    {t('admin.tariffs.currencyPerDay')}
                  </span>
                )}
                <span>
                  {tariff.traffic_limit_gb === 0
                    ? t('admin.tariffs.unlimited')
                    : `${tariff.traffic_limit_gb} GB`}
                </span>
                <span>{t('admin.tariffs.devices', { count: tariff.device_limit })}</span>
                <span>{t('admin.tariffs.servers', { count: tariff.servers_count })}</span>
                <span>
                  {t('admin.tariffs.subscriptions', { count: tariff.subscriptions_count })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className={`rounded-lg transition-colors ${
                  tariff.is_active
                    ? 'bg-success-500/20 text-success-400 hover:bg-success-500/30'
                    : 'bg-muted text-muted-foreground hover:bg-muted'
                }`}
                title={
                  tariff.is_active ? t('admin.tariffs.deactivate') : t('admin.tariffs.activate')
                }
              >
                {tariff.is_active ? <CheckIcon /> : <XIcon />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleTrial}
                className={`rounded-lg transition-colors ${
                  tariff.is_trial_available
                    ? 'bg-primary/20 text-primary hover:bg-primary/30'
                    : 'bg-muted text-muted-foreground hover:bg-muted'
                }`}
                title={t('admin.tariffs.toggleTrial')}
              >
                <GiftIcon />
              </Button>

              <Button variant="ghost" size="icon" onClick={onEdit} title={t('admin.tariffs.edit')}>
                <EditIcon />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="hover:bg-error-500/20 hover:text-error-400"
                title={t('admin.tariffs.delete')}
              >
                <TrashIcon />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Main Page ============

export default function AdminTariffs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmDelete = useDestructiveConfirm();
  const notify = useNotify();
  const { capabilities } = usePlatform();

  const [localTariffs, setLocalTariffs] = useState<TariffListItem[]>([]);
  const [orderChanged, setOrderChanged] = useState(false);

  // Queries
  const { data: tariffsData, isLoading } = useQuery({
    queryKey: ['admin-tariffs'],
    queryFn: () => tariffsApi.getTariffs(true),
  });

  // Sync fetched data to local state
  useEffect(() => {
    if (tariffsData?.tariffs && !orderChanged) {
      setLocalTariffs(tariffsData.tariffs);
    }
  }, [tariffsData, orderChanged]);

  // Save order mutation
  const saveOrderMutation = useMutation({
    mutationFn: (tariffIds: number[]) => tariffsApi.updateOrder(tariffIds),
    onSuccess: () => {
      setOrderChanged(false);
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] });
      notify.success(t('admin.tariffs.orderSaved'));
    },
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: tariffsApi.deleteTariff,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] });
      if (data.affected_subscriptions > 0) {
        notify.success(
          t('admin.tariffs.deleteSuccessWithSubscriptions', { count: data.affected_subscriptions }),
        );
      } else {
        notify.success(t('admin.tariffs.deleteSuccess'));
      }
    },
  });

  const handleDelete = async (tariff: TariffListItem) => {
    const confirmText =
      tariff.subscriptions_count > 0
        ? t('admin.tariffs.confirmDeleteWithSubscriptions', {
            count: tariff.subscriptions_count,
          })
        : t('admin.tariffs.confirmDeleteText');

    const confirmed = await confirmDelete(
      confirmText,
      t('common.delete'),
      t('admin.tariffs.confirmDelete'),
    );

    if (confirmed) {
      deleteMutation.mutate(tariff.id);
    }
  };

  const toggleMutation = useMutation({
    mutationFn: tariffsApi.toggleTariff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] });
    },
  });

  const toggleTrialMutation = useMutation({
    mutationFn: tariffsApi.toggleTrial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] });
    },
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalTariffs((prev) => {
        const oldIndex = prev.findIndex((t) => t.id === active.id);
        const newIndex = prev.findIndex((t) => t.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
      setOrderChanged(true);
    }
  }, []);

  const handleSaveOrder = () => {
    saveOrderMutation.mutate(localTariffs.map((t) => t.id));
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Show back button only on web, not in Telegram Mini App */}
          {!capabilities.hasBackButton && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/admin')}
              className="rounded-xl"
            >
              <BackIcon />
            </Button>
          )}
          <div>
            <h1 className="text-foreground text-xl font-semibold">{t('admin.tariffs.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('admin.tariffs.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {orderChanged && (
            <Button
              onClick={handleSaveOrder}
              disabled={saveOrderMutation.isPending}
              className="bg-success-500 hover:bg-success-600 text-white"
            >
              {saveOrderMutation.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <SaveIcon />
              )}
              {t('admin.tariffs.saveOrder')}
            </Button>
          )}
          <Button
            onClick={() => navigate('/admin/tariffs/create')}
            className="flex items-center justify-center gap-2"
          >
            <PlusIcon />
            {t('admin.tariffs.create')}
          </Button>
        </div>
      </div>

      {/* Drag hint */}
      <div className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
        <GripIcon />
        {t('admin.tariffs.dragToReorder')}
      </div>

      {/* Tariffs List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      ) : localTariffs.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">{t('admin.tariffs.noTariffs')}</p>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext
            items={localTariffs.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {localTariffs.map((tariff) => (
                <SortableTariffCard
                  key={tariff.id}
                  tariff={tariff}
                  onEdit={() => navigate(`/admin/tariffs/${tariff.id}/edit`)}
                  onDelete={() => handleDelete(tariff)}
                  onToggle={() => toggleMutation.mutate(tariff.id)}
                  onToggleTrial={() => toggleTrialMutation.mutate(tariff.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
