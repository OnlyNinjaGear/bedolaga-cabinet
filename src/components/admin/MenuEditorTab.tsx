import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
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
import {
  menuLayoutApi,
  type MenuConfig,
  type MenuRowConfig,
  type MenuButtonConfig,
  BUILTIN_SECTIONS,
  BOT_LOCALES,
  STYLE_OPTIONS,
} from '../../api/menuLayout';
import { Toggle } from './Toggle';
import { useNotify } from '../../platform/hooks/useNotify';
import { Button } from '@/components/ui/button';

const GripIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
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

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const LinkIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.03 8.591"
    />
  </svg>
);

const ArrowUpIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </svg>
);

const ArrowDownIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

function generateId(): string {
  return `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function generateRowId(): string {
  return `row_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function configsEqual(a: MenuConfig, b: MenuConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const DEFAULT_CONFIG: MenuConfig = { rows: [] };

interface MaxPerRowSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

function MaxPerRowSelector({ value, onChange }: MaxPerRowSelectorProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map((n) => (
        <Button
          key={n}
          onClick={() => onChange(n)}
          variant={value === n ? 'default' : 'ghost'}
          size="icon"
          className={`h-7 w-7 text-xs font-semibold ${
            value === n
              ? ''
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-muted-foreground'
          }`}
        >
          {n}
        </Button>
      ))}
    </div>
  );
}

interface ButtonChipProps {
  button: MenuButtonConfig;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<MenuButtonConfig>) => void;
  onRemove: () => void;
  onMoveUp: (() => void) | null;
  onMoveDown: (() => void) | null;
  isBuiltin: boolean;
}

function ButtonChip({
  button,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  isBuiltin,
}: ButtonChipProps) {
  const { t } = useTranslation();

  const displayName =
    button.labels.ru ||
    button.labels.en ||
    (isBuiltin ? t(`admin.buttons.sections.${button.id}`) : button.id);

  const styleOption = STYLE_OPTIONS.find((s) => s.value === button.style);
  const colorDotClass = styleOption?.colorClass || 'bg-muted';

  return (
    <div
      className={`overflow-hidden rounded-xl border transition-colors ${
        button.enabled ? 'border-border/50 bg-card/50' : 'border-border/30 bg-card/30 opacity-60'
      }`}
    >
      {/* Collapsed header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex shrink-0 flex-col">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMoveUp ?? undefined}
            disabled={!onMoveUp}
            aria-label={t('admin.menuEditor.moveUp')}
            className="text-muted-foreground hover:text-muted-foreground h-auto p-1.5 disabled:cursor-default disabled:opacity-100"
          >
            <ArrowUpIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onMoveDown ?? undefined}
            disabled={!onMoveDown}
            aria-label={t('admin.menuEditor.moveDown')}
            className="text-muted-foreground hover:text-muted-foreground h-auto p-1.5 disabled:cursor-default disabled:opacity-100"
          >
            <ArrowDownIcon />
          </Button>
        </div>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colorDotClass}`} />
        <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
          {displayName}
        </span>
        {!isBuiltin && (
          <span className="text-muted-foreground" title="URL">
            <LinkIcon />
          </span>
        )}
        <Toggle checked={button.enabled} onChange={() => onUpdate({ enabled: !button.enabled })} />
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleExpand}
          className="text-muted-foreground hover:text-muted-foreground h-auto p-1"
        >
          <ChevronIcon expanded={isExpanded} />
        </Button>
        {!isBuiltin && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-auto p-1"
          >
            <TrashIcon />
          </Button>
        )}
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <div className="border-border/30 space-y-3 border-t px-3 py-3">
          {/* Color selector */}
          <div>
            <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
              {t('admin.buttons.color')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STYLE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant="ghost"
                  onClick={() => onUpdate({ style: opt.value })}
                  className={`h-7 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium ${
                    button.style === opt.value
                      ? 'border-primary bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
                      : 'border-border bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${opt.colorClass}`} />
                  {t(`admin.buttons.styles.${opt.value}`)}
                </Button>
              ))}
            </div>
          </div>

          {/* Emoji ID */}
          <div>
            <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
              {t('admin.buttons.emojiId')}
            </label>
            <input
              type="text"
              value={button.icon_custom_emoji_id}
              onChange={(e) => onUpdate({ icon_custom_emoji_id: e.target.value })}
              placeholder={t('admin.buttons.emojiPlaceholder')}
              className="border-border bg-muted/50 text-foreground placeholder-muted-foreground focus:border-primary w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none"
            />
          </div>

          {/* URL input + open mode (custom buttons only) */}
          {!isBuiltin && (
            <>
              <div>
                <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                  URL
                </label>
                <input
                  type="url"
                  value={button.url || ''}
                  onChange={(e) => onUpdate({ url: e.target.value || null })}
                  placeholder="https://..."
                  className="border-border bg-muted/50 text-foreground placeholder-muted-foreground focus:border-primary w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none"
                />
              </div>
              <div>
                <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                  {t('admin.menuEditor.openIn')}
                </label>
                <div className="flex gap-1.5">
                  {(['external', 'webapp'] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant="ghost"
                      onClick={() => onUpdate({ open_in: mode })}
                      className={`h-7 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium ${
                        button.open_in === mode
                          ? 'border-primary bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
                          : 'border-border bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      {t(`admin.menuEditor.openMode.${mode}`)}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Localized labels */}
          <div>
            <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
              {t('admin.buttons.customLabels')}
            </label>
            <div className="space-y-2">
              {BOT_LOCALES.map((locale) => (
                <div key={locale} className="flex items-center gap-2">
                  <span className="text-muted-foreground w-7 shrink-0 text-center text-[10px] font-semibold uppercase">
                    {locale}
                  </span>
                  <input
                    type="text"
                    value={button.labels[locale] || ''}
                    onChange={(e) =>
                      onUpdate({
                        labels: { ...button.labels, [locale]: e.target.value },
                      })
                    }
                    placeholder={t('admin.menuEditor.buttonTextPlaceholder')}
                    maxLength={100}
                    className="border-border bg-muted/50 text-foreground placeholder-muted-foreground focus:border-primary w-full rounded-lg border px-3 py-1.5 text-sm transition-colors focus:outline-none"
                  />
                </div>
              ))}
              <p className="text-muted-foreground text-[10px]">
                {t('admin.menuEditor.customLabelsHint')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SortableRowProps {
  row: MenuRowConfig;
  rowIndex: number;
  expandedButtons: Set<string>;
  usedBuiltinIds: Set<string>;
  onToggleExpand: (buttonId: string) => void;
  onUpdateRow: (rowId: string, updates: Partial<MenuRowConfig>) => void;
  onRemoveRow: (rowId: string) => void;
  onUpdateButton: (rowId: string, buttonId: string, updates: Partial<MenuButtonConfig>) => void;
  onRemoveButton: (rowId: string, buttonId: string) => void;
  onAddBuiltin: (rowId: string, sectionId: string) => void;
  onAddCustom: (rowId: string) => void;
  onReorderButton: (rowId: string, buttonIndex: number, direction: 'up' | 'down') => void;
}

function SortableRow({
  row,
  rowIndex,
  expandedButtons,
  usedBuiltinIds,
  onToggleExpand,
  onUpdateRow,
  onRemoveRow,
  onUpdateButton,
  onRemoveButton,
  onAddBuiltin,
  onAddCustom,
  onReorderButton,
}: SortableRowProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? 'relative' : undefined,
  };

  const allBuiltin = row.buttons.every((b) => b.type === 'builtin');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card/50 overflow-hidden rounded-2xl border transition-all ${
        isDragging ? 'border-primary/50 shadow-primary/20 shadow-xl' : 'border-border/50'
      }`}
    >
      {/* Row header */}
      <div className="border-border/30 flex items-center gap-3 border-b px-4 py-3">
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground hover:bg-muted/50 hover:text-muted-foreground shrink-0 cursor-grab touch-none rounded-lg p-1.5 active:cursor-grabbing"
          title={t('admin.menuEditor.dragToReorder')}
        >
          <GripIcon />
        </button>
        <span className="text-foreground text-sm font-semibold">
          {t('admin.menuEditor.row')} {rowIndex + 1}
        </span>
        <div className="flex-1" />
        <MaxPerRowSelector
          value={row.max_per_row}
          onChange={(value) => onUpdateRow(row.id, { max_per_row: value })}
        />
        {!allBuiltin && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemoveRow(row.id)}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-auto p-1.5"
          >
            <TrashIcon />
          </Button>
        )}
      </div>

      {/* Row body */}
      <div className="space-y-2 p-3">
        {row.buttons.map((button, btnIndex) => (
          <ButtonChip
            key={button.id}
            button={button}
            isExpanded={expandedButtons.has(button.id)}
            onToggleExpand={() => onToggleExpand(button.id)}
            onUpdate={(updates) => onUpdateButton(row.id, button.id, updates)}
            onRemove={() => onRemoveButton(row.id, button.id)}
            onMoveUp={btnIndex > 0 ? () => onReorderButton(row.id, btnIndex, 'up') : null}
            onMoveDown={
              btnIndex < row.buttons.length - 1
                ? () => onReorderButton(row.id, btnIndex, 'down')
                : null
            }
            isBuiltin={button.type === 'builtin'}
          />
        ))}

        {/* Inline add button panel */}
        <InlineAddPanel
          rowId={row.id}
          usedBuiltinIds={usedBuiltinIds}
          onAddBuiltin={onAddBuiltin}
          onAddCustom={onAddCustom}
        />
      </div>
    </div>
  );
}

interface InlineAddPanelProps {
  rowId: string;
  usedBuiltinIds: Set<string>;
  onAddBuiltin: (rowId: string, sectionId: string) => void;
  onAddCustom: (rowId: string) => void;
}

function InlineAddPanel({ rowId, usedBuiltinIds, onAddBuiltin, onAddCustom }: InlineAddPanelProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const availableBuiltins = BUILTIN_SECTIONS.filter((id) => !usedBuiltinIds.has(id));

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        onClick={() => setIsOpen(true)}
        className="border-border/50 text-muted-foreground hover:border-border hover:text-muted-foreground h-auto w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-2.5 text-sm"
      >
        <PlusIcon />
        {t('admin.menuEditor.addButton')}
      </Button>
    );
  }

  return (
    <div className="border-border/50 bg-background/30 space-y-1 rounded-xl border p-2">
      {availableBuiltins.length > 0 && (
        <>
          <p className="text-muted-foreground px-2 pb-0.5 text-xs font-medium">
            {t('admin.menuEditor.builtinButtons')}
          </p>
          {availableBuiltins.map((id) => (
            <Button
              key={id}
              variant="ghost"
              onClick={() => {
                onAddBuiltin(rowId, id);
                setIsOpen(false);
              }}
              className="text-foreground h-auto w-full justify-start gap-2 px-3 py-2 text-sm"
            >
              {t(`admin.buttons.sections.${id}`)}
            </Button>
          ))}
          <div className="border-border/30 my-1 border-t" />
        </>
      )}
      <Button
        variant="ghost"
        onClick={() => {
          onAddCustom(rowId);
          setIsOpen(false);
        }}
        className="text-foreground h-auto w-full justify-start gap-2 px-3 py-2 text-sm"
      >
        <LinkIcon />
        {t('admin.menuEditor.addUrlButton')}
      </Button>
      <Button
        variant="ghost"
        onClick={() => setIsOpen(false)}
        className="text-muted-foreground hover:text-muted-foreground h-auto w-full justify-center py-1.5 text-xs"
      >
        {t('common.cancel')}
      </Button>
    </div>
  );
}

export function MenuEditorTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const notify = useNotify();

  // Fetch config
  const {
    data: serverConfig,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['menu-layout'],
    queryFn: menuLayoutApi.getConfig,
  });

  // Draft state
  const [draftConfig, setDraftConfig] = useState<MenuConfig>(DEFAULT_CONFIG);
  const [expandedButtons, setExpandedButtons] = useState<Set<string>>(new Set());
  const savedConfigRef = useRef<MenuConfig>(DEFAULT_CONFIG);
  const draftConfigRef = useRef(draftConfig);
  draftConfigRef.current = draftConfig;

  // Sync server data to draft (same pattern as ButtonsTab)
  useEffect(() => {
    if (serverConfig) {
      if (
        configsEqual(savedConfigRef.current, draftConfigRef.current) ||
        configsEqual(savedConfigRef.current, DEFAULT_CONFIG)
      ) {
        setDraftConfig(serverConfig);
        savedConfigRef.current = serverConfig;
      }
    }
  }, [serverConfig]);

  const hasUnsavedChanges = !configsEqual(draftConfig, savedConfigRef.current);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: menuLayoutApi.updateConfig,
    onSuccess: (data) => {
      savedConfigRef.current = data;
      setDraftConfig(data);
      queryClient.setQueryData(['menu-layout'], data);
    },
    onError: () => {
      notify.error(t('common.error'));
    },
  });

  const resetMutation = useMutation({
    mutationFn: menuLayoutApi.resetConfig,
    onSuccess: (data) => {
      savedConfigRef.current = data;
      setDraftConfig(data);
      queryClient.setQueryData(['menu-layout'], data);
    },
    onError: () => {
      notify.error(t('common.error'));
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
      setDraftConfig((prev) => {
        const oldIndex = prev.rows.findIndex((r) => r.id === active.id);
        const newIndex = prev.rows.findIndex((r) => r.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return { ...prev, rows: arrayMove(prev.rows, oldIndex, newIndex) };
      });
    }
  }, []);

  // Row CRUD
  const updateRow = useCallback((rowId: string, updates: Partial<MenuRowConfig>) => {
    setDraftConfig((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (r.id === rowId ? { ...r, ...updates } : r)),
    }));
  }, []);

  const removeRow = useCallback((rowId: string) => {
    setDraftConfig((prev) => ({
      ...prev,
      rows: prev.rows.filter((r) => r.id !== rowId),
    }));
  }, []);

  const addRow = useCallback(() => {
    setDraftConfig((prev) => ({
      ...prev,
      rows: [
        ...prev.rows,
        {
          id: generateRowId(),
          max_per_row: 2,
          buttons: [],
        },
      ],
    }));
  }, []);

  // Button CRUD
  const updateButton = useCallback(
    (rowId: string, buttonId: string, updates: Partial<MenuButtonConfig>) => {
      setDraftConfig((prev) => ({
        ...prev,
        rows: prev.rows.map((r) =>
          r.id === rowId
            ? {
                ...r,
                buttons: r.buttons.map((b) => (b.id === buttonId ? { ...b, ...updates } : b)),
              }
            : r,
        ),
      }));
    },
    [],
  );

  const removeButton = useCallback((rowId: string, buttonId: string) => {
    setDraftConfig((prev) => ({
      ...prev,
      rows: prev.rows.map((r) =>
        r.id === rowId ? { ...r, buttons: r.buttons.filter((b) => b.id !== buttonId) } : r,
      ),
    }));
  }, []);

  const addBuiltinButton = useCallback((rowId: string, sectionId: string) => {
    const newButton: MenuButtonConfig = {
      id: sectionId,
      type: 'builtin',
      style: 'default',
      icon_custom_emoji_id: '',
      enabled: true,
      labels: {},
      url: null,
      open_in: 'external',
    };
    setDraftConfig((prev) => ({
      ...prev,
      rows: prev.rows.map((r) =>
        r.id === rowId ? { ...r, buttons: [...r.buttons, newButton] } : r,
      ),
    }));
  }, []);

  const addCustomButton = useCallback((rowId: string) => {
    const newButton: MenuButtonConfig = {
      id: generateId(),
      type: 'custom',
      style: 'default',
      icon_custom_emoji_id: '',
      enabled: true,
      labels: {},
      url: '',
      open_in: 'external',
    };
    setDraftConfig((prev) => ({
      ...prev,
      rows: prev.rows.map((r) =>
        r.id === rowId ? { ...r, buttons: [...r.buttons, newButton] } : r,
      ),
    }));
  }, []);

  const reorderButton = useCallback(
    (rowId: string, buttonIndex: number, direction: 'up' | 'down') => {
      setDraftConfig((prev) => ({
        ...prev,
        rows: prev.rows.map((r) => {
          if (r.id !== rowId) return r;
          const newIndex = direction === 'up' ? buttonIndex - 1 : buttonIndex + 1;
          if (newIndex < 0 || newIndex >= r.buttons.length) return r;
          return { ...r, buttons: arrayMove(r.buttons, buttonIndex, newIndex) };
        }),
      }));
    },
    [],
  );

  // Expand/collapse
  const toggleExpand = useCallback((buttonId: string) => {
    setExpandedButtons((prev) => {
      const next = new Set(prev);
      if (next.has(buttonId)) {
        next.delete(buttonId);
      } else {
        next.add(buttonId);
      }
      return next;
    });
  }, []);

  // Collect used builtin IDs across all rows
  const usedBuiltinIds = useMemo(
    () =>
      new Set(
        draftConfig.rows.flatMap((r) =>
          r.buttons.filter((b) => b.type === 'builtin').map((b) => b.id),
        ),
      ),
    [draftConfig.rows],
  );

  // Handlers
  const handleSave = useCallback(() => {
    // Validate custom buttons have valid URLs
    const currentDraft = draftConfigRef.current;
    for (const row of currentDraft.rows) {
      for (const btn of row.buttons) {
        if (btn.type === 'custom') {
          if (!btn.url || (!btn.url.startsWith('http://') && !btn.url.startsWith('https://'))) {
            notify.error(t('admin.menuEditor.invalidUrl'));
            return;
          }
        }
      }
    }
    updateMutation.mutate(currentDraft);
  }, [updateMutation, notify, t]);

  const handleCancel = useCallback(() => {
    setDraftConfig(savedConfigRef.current);
  }, []);

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-12">
        <svg className="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        {t('common.loading')}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border px-4 py-3 text-sm">
        {t('common.error')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drag hint */}
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <GripIcon />
        {t('admin.menuEditor.dragHint')}
      </div>

      {/* Rows */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={draftConfig.rows.map((r) => r.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {draftConfig.rows.map((row, index) => (
              <SortableRow
                key={row.id}
                row={row}
                rowIndex={index}
                expandedButtons={expandedButtons}
                usedBuiltinIds={usedBuiltinIds}
                onToggleExpand={toggleExpand}
                onUpdateRow={updateRow}
                onRemoveRow={removeRow}
                onUpdateButton={updateButton}
                onRemoveButton={removeButton}
                onAddBuiltin={addBuiltinButton}
                onAddCustom={addCustomButton}
                onReorderButton={reorderButton}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add row */}
      <Button
        variant="ghost"
        onClick={addRow}
        className="border-border/50 text-muted-foreground hover:border-border hover:text-muted-foreground h-auto w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-4 text-sm font-medium"
      >
        <PlusIcon />
        {t('admin.menuEditor.addRow')}
      </Button>

      {/* Save / Cancel */}
      {hasUnsavedChanges && (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? t('common.saving') : t('common.save')}
          </Button>
          <Button variant="secondary" onClick={handleCancel} disabled={updateMutation.isPending}>
            {t('common.cancel')}
          </Button>
        </div>
      )}

      {/* Reset */}
      <div className="flex justify-end">
        <Button
          variant="secondary"
          onClick={() => {
            if (window.confirm(t('admin.menuEditor.resetConfirm'))) {
              resetMutation.mutate();
            }
          }}
          disabled={resetMutation.isPending}
        >
          {t('admin.buttons.resetAll')}
        </Button>
      </div>
    </div>
  );
}
