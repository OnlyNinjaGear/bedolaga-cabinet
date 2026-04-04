import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../lib/utils';
import { GripIcon, TrashIcon } from '../icons/LandingIcons';
import { LocalizedInput } from './LocalizedInput';
import type { AdminLandingFeature, LocaleDict, SupportedLocale } from '../../api/landings';
import { Button } from '@/components/ui/button';

export type FeatureWithId = AdminLandingFeature & { _id: string };

interface SortableFeatureProps {
  feature: FeatureWithId;
  index: number;
  locale: SupportedLocale;
  onUpdateIcon: (index: number, value: string) => void;
  onUpdateLocalized: (index: number, field: 'title' | 'description', value: LocaleDict) => void;
  onRemove: (index: number) => void;
}

export function SortableFeatureItem({
  feature,
  index,
  locale,
  onUpdateIcon,
  onUpdateLocalized,
  onRemove,
}: SortableFeatureProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: feature._id,
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
        'flex items-start gap-2 rounded-lg border p-3',
        isDragging ? 'border-primary/50 bg-muted' : 'border-border bg-card/50',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground hover:text-muted-foreground mt-2 shrink-0 cursor-grab touch-none active:cursor-grabbing"
      >
        <GripIcon />
      </button>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={feature.icon}
            onChange={(e) => onUpdateIcon(index, e.target.value)}
            placeholder={t('admin.landings.featureIcon')}
            className="border-border bg-card text-foreground focus:border-primary w-16 rounded-lg border px-2 py-1.5 text-center text-sm outline-none"
          />
          <LocalizedInput
            value={feature.title}
            onChange={(v) => onUpdateLocalized(index, 'title', v)}
            locale={locale}
            placeholder={t('admin.landings.featureTitle')}
            className="border-border bg-card text-foreground focus:border-primary min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none"
          />
        </div>
        <LocalizedInput
          value={feature.description}
          onChange={(v) => onUpdateLocalized(index, 'description', v)}
          locale={locale}
          placeholder={t('admin.landings.featureDesc')}
          className="border-border bg-card text-foreground focus:border-primary w-full rounded-lg border px-3 py-1.5 text-sm outline-none"
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(index)}
        className="text-muted-foreground hover:text-destructive mt-2 h-auto shrink-0 p-0"
      >
        <TrashIcon />
      </Button>
    </div>
  );
}
