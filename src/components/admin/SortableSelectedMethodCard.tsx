import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../lib/utils';
import { GripIcon, TrashIcon } from '../icons/LandingIcons';
import type { AdminLandingPaymentMethod, EditableMethodField } from '../../api/landings';
import type { PaymentMethodSubOptionInfo } from '../../types';
import { Button } from '@/components/ui/button';

export type MethodWithId = AdminLandingPaymentMethod & { _id: string };

const ChevronDownIcon = ({ open }: { open: boolean }) => (
  <svg
    className={cn('h-5 w-5 transition-transform', open && 'rotate-180')}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

interface SortableSelectedMethodProps {
  method: MethodWithId;
  availableSubOptions: PaymentMethodSubOptionInfo[] | null;
  onUpdate: (methodId: string, field: EditableMethodField, value: string | number | null) => void;
  onSubOptionsChange: (methodId: string, subOptions: Record<string, boolean>) => void;
  onRemove: (methodId: string) => void;
}

export function SortableSelectedMethodCard({
  method,
  availableSubOptions,
  onUpdate,
  onSubOptionsChange,
  onRemove,
}: SortableSelectedMethodProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: method._id,
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
      className={cn(
        'rounded-lg border',
        isDragging ? 'border-primary/50 bg-muted' : 'border-border bg-card/50',
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground hover:text-muted-foreground shrink-0 cursor-grab touch-none active:cursor-grabbing"
        >
          <GripIcon />
        </button>
        <Button
          variant="ghost"
          onClick={() => setExpanded((v) => !v)}
          className="h-auto min-w-0 flex-1 justify-start p-0 text-start"
        >
          <span className="text-foreground truncate text-sm">{method.display_name}</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-muted-foreground h-auto shrink-0 p-0"
        >
          <ChevronDownIcon open={expanded} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(method.method_id)}
          className="text-muted-foreground hover:text-destructive h-auto shrink-0 p-0"
        >
          <TrashIcon />
        </Button>
      </div>
      {expanded && (
        <div className="border-border space-y-3 border-t px-3 py-3">
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">
              {t('admin.landings.methodDisplayName', 'Display name')}
            </label>
            <input
              type="text"
              value={method.display_name}
              onChange={(e) => onUpdate(method.method_id, 'display_name', e.target.value)}
              className="border-border bg-card text-foreground focus:border-primary w-full rounded-lg border px-3 py-1.5 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">
              {t('admin.landings.methodDescription', 'Description')}
            </label>
            <input
              type="text"
              value={method.description ?? ''}
              onChange={(e) => onUpdate(method.method_id, 'description', e.target.value || null)}
              placeholder={t('admin.landings.methodDescPlaceholder', 'Optional description')}
              className="border-border bg-card text-foreground focus:border-primary w-full rounded-lg border px-3 py-1.5 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">
              {t('admin.landings.methodIconUrl', 'Icon URL')}
            </label>
            <input
              type="text"
              value={method.icon_url ?? ''}
              onChange={(e) => onUpdate(method.method_id, 'icon_url', e.target.value || null)}
              placeholder="https://..."
              className="border-border bg-card text-foreground focus:border-primary w-full rounded-lg border px-3 py-1.5 text-sm outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                {t('admin.landings.methodMinAmount', 'Min amount (kopeks)')}
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={method.min_amount_kopeks ?? ''}
                onChange={(e) =>
                  onUpdate(
                    method.method_id,
                    'min_amount_kopeks',
                    e.target.value ? Math.max(0, Math.floor(Number(e.target.value))) : null,
                  )
                }
                placeholder="—"
                className="border-border bg-card text-foreground focus:border-primary w-full rounded-lg border px-3 py-1.5 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                {t('admin.landings.methodMaxAmount', 'Max amount (kopeks)')}
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={method.max_amount_kopeks ?? ''}
                onChange={(e) =>
                  onUpdate(
                    method.method_id,
                    'max_amount_kopeks',
                    e.target.value ? Math.max(0, Math.floor(Number(e.target.value))) : null,
                  )
                }
                placeholder="—"
                className="border-border bg-card text-foreground focus:border-primary w-full rounded-lg border px-3 py-1.5 text-sm outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">
              {t('admin.landings.methodCurrency', 'Currency')}
            </label>
            <input
              type="text"
              value={method.currency ?? ''}
              onChange={(e) => onUpdate(method.method_id, 'currency', e.target.value || null)}
              placeholder="RUB"
              className="border-border bg-card text-foreground focus:border-primary w-full rounded-lg border px-3 py-1.5 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">
              {t('admin.landings.methodReturnUrl', 'Return URL after payment')}
            </label>
            <input
              type="text"
              value={method.return_url ?? ''}
              onChange={(e) => onUpdate(method.method_id, 'return_url', e.target.value || null)}
              placeholder={t(
                'admin.landings.methodReturnUrlPlaceholder',
                'Default: cabinet success page. Use {token} for purchase token',
              )}
              className="border-border bg-card text-foreground focus:border-primary w-full rounded-lg border px-3 py-1.5 text-sm outline-none"
            />
          </div>
          {availableSubOptions && availableSubOptions.length > 0 && (
            <div>
              <label className="text-muted-foreground mb-1.5 block text-xs">
                {t('admin.landings.methodSubOptions', 'Payment sub-options')}
              </label>
              <div className="flex flex-wrap gap-2">
                {availableSubOptions.map((opt) => {
                  // Missing keys treated as enabled (opt-out model)
                  const enabled = method.sub_options?.[opt.id] !== false;
                  return (
                    <Button
                      key={opt.id}
                      type="button"
                      role="checkbox"
                      aria-checked={enabled}
                      onClick={() => {
                        const current =
                          method.sub_options ??
                          Object.fromEntries(availableSubOptions.map((o) => [o.id, true]));
                        onSubOptionsChange(method.method_id, { ...current, [opt.id]: !enabled });
                      }}
                      variant="ghost"
                      className={cn(
                        'flex h-auto items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs',
                        enabled
                          ? 'border-primary/30 bg-primary/10 text-primary/70 hover:bg-primary/10 hover:text-primary/70'
                          : 'border-border bg-card text-muted-foreground',
                      )}
                    >
                      <div
                        aria-hidden="true"
                        className={cn(
                          'flex h-3.5 w-3.5 items-center justify-center rounded',
                          enabled
                            ? 'bg-primary text-primary-foreground'
                            : 'border-border bg-muted border',
                        )}
                      >
                        {enabled && (
                          <svg
                            className="h-2.5 w-2.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {opt.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
