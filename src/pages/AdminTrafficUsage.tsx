import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowData,
} from '@tanstack/react-table';
import {
  adminTrafficApi,
  type UserTrafficItem,
  type TrafficNodeInfo,
  type TrafficUsageResponse,
  type TrafficParams,
  type TrafficEnrichmentData,
} from '../api/adminTraffic';
import { usePlatform } from '../platform/hooks/usePlatform';

// ============ TanStack Table module augmentation ============

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    sticky?: boolean;
    align?: 'left' | 'center';
    bold?: boolean;
  }
}

// ============ Utils ============

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFlagEmoji = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const formatCurrency = (kopeks: number): string => {
  const rubles = kopeks / 100;
  if (rubles === 0) return '0';
  if (rubles < 10) return rubles.toFixed(2);
  if (rubles < 1000) return Math.round(rubles).toString();
  return `${(rubles / 1000).toFixed(1)}k`;
};

const formatShortDate = (iso: string | null): string => {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '\u2014';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(2)}`;
};

const toBackendSortField = (columnId: string): string => {
  if (columnId === 'user') return 'full_name';
  return columnId;
};

// ============ Risk assessment helpers ============

const bytesToGbPerDay = (bytes: number, days: number): number =>
  days > 0 ? bytes / days / 1024 ** 3 : 0;

const getRatio = (gbPerDay: number, threshold: number): number =>
  threshold > 0 ? gbPerDay / threshold : 0;

const getRowBgColor = (ratio: number): string | undefined => {
  if (ratio <= 0) return undefined;
  const clamped = Math.min(ratio, 1.5);
  const hue = 120 - Math.min(clamped, 1) * 120;
  const opacity = clamped <= 1 ? 0.06 + clamped * 0.07 : 0.13 + (clamped - 1) * 0.14;
  return `hsla(${hue}, 70%, 45%, ${opacity})`;
};

const getNodeTextColor = (ratio: number): string => {
  const clamped = Math.min(Math.max(ratio, 0), 1.5);
  let hue: number;
  if (clamped <= 0.7) {
    hue = 210 - (clamped / 0.7) * 180; // 210 (blue) → 30 (amber)
  } else {
    hue = Math.max(0, 30 - ((clamped - 0.7) / 0.8) * 30); // 30 (amber) → 0 (red)
  }
  const saturation = 70 + clamped * 15;
  const lightness = 65 - clamped * 10;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

const getRiskLevel = (ratio: number): RiskLevel => {
  if (ratio < 0.5) return 'low';
  if (ratio < 0.8) return 'medium';
  if (ratio < 1.2) return 'high';
  return 'critical';
};

interface RiskResult {
  ratio: number;
  gbPerDay: number; // the dominant daily value (total or worst node)
  totalRatio: number;
  maxNodeRatio: number;
}

const getCompositeRisk = (
  row: UserTrafficItem,
  totalThreshold: number,
  nodeThreshold: number,
  days: number,
): RiskResult => {
  const dailyTotal = bytesToGbPerDay(row.total_bytes, days);
  const totalR = totalThreshold > 0 ? getRatio(dailyTotal, totalThreshold) : 0;

  let maxNodeR = 0;
  let worstNodeGbPerDay = 0;
  if (nodeThreshold > 0) {
    for (const b of Object.values(row.node_traffic)) {
      const daily = bytesToGbPerDay(b || 0, days);
      const r = getRatio(daily, nodeThreshold);
      if (r > maxNodeR) {
        maxNodeR = r;
        worstNodeGbPerDay = daily;
      }
    }
  }

  // The dominant metric determines what GB/d we show
  const ratio = Math.max(totalR, maxNodeR);
  const gbPerDay = totalR >= maxNodeR ? dailyTotal : worstNodeGbPerDay;

  return { ratio, gbPerDay, totalRatio: totalR, maxNodeRatio: maxNodeR };
};

const RISK_STYLES: Record<RiskLevel, { dot: string; text: string; bar: string; bg: string }> = {
  low: {
    dot: 'bg-success-400',
    text: 'text-success-400',
    bar: 'bg-success-400',
    bg: 'bg-success-400/10',
  },
  medium: {
    dot: 'bg-warning-400',
    text: 'text-warning-400',
    bar: 'bg-warning-400',
    bg: 'bg-warning-400/10',
  },
  high: {
    dot: 'bg-orange-400',
    text: 'text-orange-400',
    bar: 'bg-orange-400',
    bg: 'bg-orange-400/10',
  },
  critical: {
    dot: 'bg-error-400 animate-pulse',
    text: 'text-error-400',
    bar: 'bg-error-400',
    bg: 'bg-error-400/10',
  },
};

const formatGbPerDay = (gbPerDay: number): string => {
  if (gbPerDay < 0.01) return '<0.01';
  if (gbPerDay < 10) return gbPerDay.toFixed(2);
  if (gbPerDay < 100) return gbPerDay.toFixed(1);
  return Math.round(gbPerDay).toString();
};

// ============ Icons ============

const SearchIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const RefreshIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
);

const SortIcon = ({ direction }: { direction: false | 'asc' | 'desc' }) => (
  <svg
    className="ml-1 inline h-3 w-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    {direction === 'asc' ? (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    ) : direction === 'desc' ? (
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    ) : (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
      />
    )}
  </svg>
);

const FilterIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
    />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const ServerIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m19.5 0a3 3 0 01-3 3H5.25a3 3 0 01-3-3m19.5 0a3 3 0 00-3-3H5.25a3 3 0 00-3 3m16.5 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008z"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
    />
  </svg>
);

const XIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const StatusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const GlobeIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
    />
  </svg>
);

const ShieldIcon = () => (
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
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
    />
  </svg>
);

const ServerSmallIcon = () => (
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
      d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
    />
  </svg>
);

// ============ Progress Bar ============

function ProgressBar({ loading }: { loading: boolean }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (loading) {
      setProgress(0);
      setVisible(true);
      // Fast initial progress, then slow down
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev < 30) return prev + 8;
          if (prev < 60) return prev + 3;
          if (prev < 85) return prev + 1;
          if (prev < 95) return prev + 0.3;
          return prev;
        });
      }, 100);
    } else {
      if (visible) {
        setProgress(100);
        clearInterval(intervalRef.current);
        const timer = setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [loading, visible]);

  if (!visible) return null;

  return (
    <div className="bg-muted/50 absolute top-0 right-0 left-0 z-50 h-0.5 overflow-hidden rounded-full">
      <div
        className="from-primary to-primary/70 h-full rounded-full bg-gradient-to-r transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ============ Components ============

const PERIODS = [1, 3, 7, 14, 30] as const;

function PeriodSelector({
  value,
  onChange,
  label,
  dateMode,
  customStart,
  customEnd,
  onToggleDateMode,
  onCustomStartChange,
  onCustomEndChange,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  dateMode: boolean;
  customStart: string;
  customEnd: string;
  onToggleDateMode: () => void;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
}) {
  const { t } = useTranslation();

  // Limit: last 31 days
  const today = new Date().toISOString().split('T')[0];
  const minDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (dateMode) {
    return (
      <div className="flex items-center gap-2">
        <CalendarIcon />
        <span className="text-muted-foreground text-xs">{t('admin.trafficUsage.dateFrom')}</span>
        <input
          type="date"
          value={customStart}
          min={minDate}
          max={customEnd || today}
          onChange={(e) => onCustomStartChange(e.target.value)}
          className="border-border bg-card text-foreground focus:border-border rounded-lg border px-2 py-1 text-xs focus:outline-none"
        />
        <span className="text-muted-foreground text-xs">{t('admin.trafficUsage.dateTo')}</span>
        <input
          type="date"
          value={customEnd}
          min={customStart || minDate}
          max={today}
          onChange={(e) => onCustomEndChange(e.target.value)}
          className="border-border bg-card text-foreground focus:border-border rounded-lg border px-2 py-1 text-xs focus:outline-none"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleDateMode}
          className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg"
          title={t('admin.trafficUsage.period')}
        >
          <XIcon />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="flex gap-1">
        {PERIODS.map((p) => (
          <Button
            key={p}
            variant="ghost"
            size="sm"
            onClick={() => onChange(p)}
            className={`h-auto rounded-lg px-2.5 py-1 text-xs font-medium ${
              value === p
                ? 'bg-primary hover:bg-primary text-white hover:text-white'
                : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {p}
            {t('admin.trafficUsage.days')}
          </Button>
        ))}
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={onToggleDateMode}
        className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg"
        title={t('admin.trafficUsage.customDates')}
      >
        <CalendarIcon />
      </Button>
    </div>
  );
}

function TariffFilter({
  available,
  selected,
  onChange,
}: {
  available: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (available.length === 0) return null;

  const allSelected = selected.size === 0;
  const activeCount = selected.size;

  const toggle = (tariff: string) => {
    const next = new Set(selected);
    if (next.has(tariff)) {
      next.delete(tariff);
    } else {
      next.add(tariff);
    }
    onChange(next);
  };

  const selectAll = () => onChange(new Set());

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className={`h-auto gap-1.5 px-3 py-1.5 text-xs font-medium ${
          activeCount > 0
            ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
            : 'border-border bg-card text-foreground hover:border-border hover:bg-muted'
        }`}
      >
        <FilterIcon />
        {t('admin.trafficUsage.tariff')}
        {activeCount > 0 && (
          <span className="bg-primary rounded-full px-1.5 text-[10px] text-white">
            {activeCount}
          </span>
        )}
        <ChevronDownIcon />
      </Button>

      {open && (
        <div className="border-border bg-card absolute top-full left-0 z-30 mt-1 w-56 rounded-xl border py-1 shadow-xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={selectAll}
            className={`h-auto w-full justify-start gap-2 px-3 py-2 text-xs ${
              allSelected ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                allSelected ? 'border-primary bg-primary' : 'border-border'
              }`}
            >
              {allSelected && (
                <svg
                  className="h-3 w-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </span>
            {t('admin.trafficUsage.allTariffs')}
          </Button>

          <div className="border-border mx-2 border-t" />

          <div className="max-h-48 overflow-y-auto">
            {available.map((tariff) => {
              const checked = selected.has(tariff);
              return (
                <Button
                  key={tariff}
                  variant="ghost"
                  size="sm"
                  onClick={() => toggle(tariff)}
                  className="text-muted-foreground hover:bg-muted h-auto w-full justify-start gap-2 px-3 py-2 text-xs"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked ? 'border-primary bg-primary' : 'border-border'
                    }`}
                  >
                    {checked && (
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    )}
                  </span>
                  {tariff}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-success-500',
  trial: 'bg-warning-500',
  expired: 'bg-error-500',
  disabled: 'bg-muted',
};

function StatusFilter({
  available,
  selected,
  onChange,
}: {
  available: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (available.length === 0) return null;

  const allSelected = selected.size === 0;
  const activeCount = selected.size;

  const toggle = (status: string) => {
    const next = new Set(selected);
    if (next.has(status)) {
      next.delete(status);
    } else {
      next.add(status);
    }
    onChange(next);
  };

  const selectAll = () => onChange(new Set());

  const statusLabel = (s: string) => {
    const key = `admin.trafficUsage.status${s.charAt(0).toUpperCase() + s.slice(1)}`;
    return t(key, s);
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className={`h-auto gap-1.5 px-3 py-1.5 text-xs font-medium ${
          activeCount > 0
            ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
            : 'border-border bg-card text-foreground hover:border-border hover:bg-muted'
        }`}
      >
        <StatusIcon />
        {t('admin.trafficUsage.status')}
        {activeCount > 0 && (
          <span className="bg-primary rounded-full px-1.5 text-[10px] text-white">
            {activeCount}
          </span>
        )}
        <ChevronDownIcon />
      </Button>

      {open && (
        <div className="border-border bg-card absolute top-full left-0 z-30 mt-1 w-56 rounded-xl border py-1 shadow-xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={selectAll}
            className={`h-auto w-full justify-start gap-2 px-3 py-2 text-xs ${
              allSelected ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                allSelected ? 'border-primary bg-primary' : 'border-border'
              }`}
            >
              {allSelected && (
                <svg
                  className="h-3 w-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </span>
            {t('admin.trafficUsage.allStatuses')}
          </Button>

          <div className="border-border mx-2 border-t" />

          <div className="max-h-48 overflow-y-auto">
            {available.map((s) => {
              const checked = selected.has(s);
              return (
                <Button
                  key={s}
                  variant="ghost"
                  size="sm"
                  onClick={() => toggle(s)}
                  className="text-muted-foreground hover:bg-muted h-auto w-full justify-start gap-2 px-3 py-2 text-xs"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked ? 'border-primary bg-primary' : 'border-border'
                    }`}
                  >
                    {checked && (
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    )}
                  </span>
                  <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[s] || 'bg-muted'}`} />
                  {statusLabel(s)}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function NodeFilter({
  available,
  selected,
  onChange,
}: {
  available: TrafficNodeInfo[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (available.length === 0) return null;

  const allSelected = selected.size === 0;
  const activeCount = selected.size;

  const toggle = (uuid: string) => {
    const next = new Set(selected);
    if (next.has(uuid)) {
      next.delete(uuid);
    } else {
      next.add(uuid);
    }
    onChange(next);
  };

  const selectAll = () => onChange(new Set());

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className={`h-auto gap-1.5 px-3 py-1.5 text-xs font-medium ${
          activeCount > 0
            ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
            : 'border-border bg-card text-foreground hover:border-border hover:bg-muted'
        }`}
      >
        <ServerIcon />
        {t('admin.trafficUsage.nodes')}
        {activeCount > 0 && (
          <span className="bg-primary rounded-full px-1.5 text-[10px] text-white">
            {activeCount}
          </span>
        )}
        <ChevronDownIcon />
      </Button>

      {open && (
        <div className="border-border bg-card absolute top-full left-0 z-30 mt-1 w-64 rounded-xl border py-1 shadow-xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={selectAll}
            className={`h-auto w-full justify-start gap-2 px-3 py-2 text-xs ${
              allSelected ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                allSelected ? 'border-primary bg-primary' : 'border-border'
              }`}
            >
              {allSelected && (
                <svg
                  className="h-3 w-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </span>
            {t('admin.trafficUsage.allNodes')}
          </Button>

          <div className="border-border mx-2 border-t" />

          <div className="max-h-48 overflow-y-auto">
            {available.map((node) => {
              const checked = selected.has(node.node_uuid);
              return (
                <Button
                  key={node.node_uuid}
                  variant="ghost"
                  size="sm"
                  onClick={() => toggle(node.node_uuid)}
                  className="text-muted-foreground hover:bg-muted h-auto w-full justify-start gap-2 px-3 py-2 text-xs"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked ? 'border-primary bg-primary' : 'border-border'
                    }`}
                  >
                    {checked && (
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    )}
                  </span>
                  {getFlagEmoji(node.country_code)} {node.node_name}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CountryFilter({
  available,
  selected,
  onChange,
}: {
  available: { code: string; count: number }[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (available.length === 0) return null;

  const allSelected = selected.size === 0;
  const activeCount = selected.size;

  const toggle = (code: string) => {
    const next = new Set(selected);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    onChange(next);
  };

  const selectAll = () => onChange(new Set());

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className={`h-auto gap-1.5 px-3 py-1.5 text-xs font-medium ${
          activeCount > 0
            ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
            : 'border-border bg-card text-foreground hover:border-border hover:bg-muted'
        }`}
      >
        <GlobeIcon />
        {activeCount > 0 && (
          <span className="bg-primary rounded-full px-1.5 text-[10px] text-white">
            {activeCount}
          </span>
        )}
        <ChevronDownIcon />
      </Button>

      {open && (
        <div className="border-border bg-card absolute top-full right-0 z-30 mt-1 w-48 rounded-xl border py-1 shadow-xl sm:right-auto sm:left-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={selectAll}
            className={`h-auto w-full justify-start gap-2 px-3 py-2 text-xs ${
              allSelected ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                allSelected ? 'border-primary bg-primary' : 'border-border'
              }`}
            >
              {allSelected && (
                <svg
                  className="h-3 w-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </span>
            All
          </Button>

          <div className="border-border mx-2 border-t" />

          <div className="max-h-48 overflow-y-auto">
            {available.map(({ code, count }) => {
              const checked = selected.has(code);
              return (
                <Button
                  key={code}
                  variant="ghost"
                  size="sm"
                  onClick={() => toggle(code)}
                  className="text-muted-foreground hover:bg-muted h-auto w-full justify-start gap-2 px-3 py-2 text-xs"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked ? 'border-primary bg-primary' : 'border-border'
                    }`}
                  >
                    {checked && (
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    )}
                  </span>
                  {getFlagEmoji(code)} {code.toUpperCase()}
                  <span className="text-muted-foreground ml-auto">{count}</span>
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Risk Badge ============

function RiskBadge({
  level,
  ratio,
  gbPerDay,
}: {
  level: RiskLevel;
  ratio: number;
  gbPerDay: number;
}) {
  const style = RISK_STYLES[level];
  const barWidth = Math.min(ratio * 100, 100);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`} />
        <span className={`text-[11px] font-semibold tabular-nums ${style.text}`}>
          {formatGbPerDay(gbPerDay)}
        </span>
        <span className={`text-[10px] ${style.text} opacity-60`}>GB/d</span>
      </div>
      {/* Mini progress bar showing ratio to threshold */}
      <div className={`h-1 w-full max-w-15 rounded-full ${style.bg}`}>
        <div
          className={`h-full rounded-full ${style.bar} transition-all`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

// ============ Main Page ============

export default function AdminTrafficUsage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { capabilities } = usePlatform();

  const [items, setItems] = useState<UserTrafficItem[]>([]);
  const [nodes, setNodes] = useState<TrafficNodeInfo[]>([]);
  const [availableTariffs, setAvailableTariffs] = useState<string[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [dateMode, setDateMode] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [selectedTariffs, setSelectedTariffs] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [enrichment, setEnrichment] = useState<Record<number, TrafficEnrichmentData> | null>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'total_bytes', desc: true }]);
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});
  const [totalThreshold, setTotalThreshold] = useState('');
  const [nodeThreshold, setNodeThreshold] = useState('');
  const [periodDays, setPeriodDays] = useState(30);

  const limit = 50;
  const hasData = items.length > 0 || nodes.length > 0;

  const sortBy = sorting[0] ? toBackendSortField(sorting[0].id) : 'total_bytes';
  const sortDesc = sorting[0]?.desc ?? true;
  const tariffsParam = selectedTariffs.size > 0 ? [...selectedTariffs].join(',') : undefined;
  const statusesParam = selectedStatuses.size > 0 ? [...selectedStatuses].join(',') : undefined;

  // Merge country filter into node UUIDs so backend filters data consistently
  const mergedNodesParam = useMemo(() => {
    const countryUuids =
      selectedCountries.size > 0
        ? new Set(
            nodes.filter((n) => selectedCountries.has(n.country_code)).map((n) => n.node_uuid),
          )
        : null;
    const nodeUuids = selectedNodes.size > 0 ? new Set(selectedNodes) : null;

    let merged: Set<string> | null = null;
    if (countryUuids && nodeUuids) {
      merged = new Set([...countryUuids].filter((id) => nodeUuids.has(id)));
    } else {
      merged = countryUuids || nodeUuids;
    }
    return merged && merged.size > 0 ? [...merged].join(',') : undefined;
  }, [nodes, selectedCountries, selectedNodes]);

  const buildParams = useCallback((): TrafficParams => {
    const params: TrafficParams = {
      limit,
      offset,
      search: committedSearch || undefined,
      sort_by: sortBy,
      sort_desc: sortDesc,
      tariffs: tariffsParam,
      statuses: statusesParam,
      nodes: mergedNodesParam,
    };
    if (dateMode && customStart && customEnd) {
      params.start_date = customStart;
      params.end_date = customEnd;
    } else {
      params.period = period;
    }
    return params;
  }, [
    period,
    offset,
    committedSearch,
    sortBy,
    sortDesc,
    tariffsParam,
    statusesParam,
    mergedNodesParam,
    dateMode,
    customStart,
    customEnd,
  ]);

  const applyData = useCallback((data: TrafficUsageResponse) => {
    setItems(data.items);
    setNodes(data.nodes);
    setTotal(data.total);
    setAvailableTariffs(data.available_tariffs);
    setAvailableStatuses(data.available_statuses);
    setPeriodDays(data.period_days);
  }, []);

  const loadData = useCallback(
    async (skipCache = false) => {
      const params = buildParams();

      // Check cache first — apply instantly without any loading state
      if (!skipCache) {
        const cached = adminTrafficApi.getCached(params);
        if (cached) {
          applyData(cached);
          setInitialLoading(false);
          return;
        }
      }

      try {
        setLoading(true);
        const data = await adminTrafficApi.getTrafficUsage(params, { skipCache });
        applyData(data);
      } catch {
        // silently fail — keep stale data visible
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [buildParams, applyData],
  );

  // Load on param change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load enrichment after main data arrives
  useEffect(() => {
    if (initialLoading || items.length === 0) return;
    let cancelled = false;
    const load = async () => {
      setEnrichmentLoading(true);
      try {
        const res = await adminTrafficApi.getEnrichment();
        if (!cancelled) setEnrichment(res.data);
      } catch {
        // silently fail — enrichment is optional
      } finally {
        if (!cancelled) setEnrichmentLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [initialLoading, items.length]);

  // Prefetch adjacent periods in background (only in period mode)
  useEffect(() => {
    if (dateMode) return;
    const prefetchPeriods = PERIODS.filter((p) => p !== period);
    const timer = setTimeout(() => {
      prefetchPeriods.forEach((p) => {
        const params: TrafficParams = {
          period: p,
          limit,
          offset: 0,
          sort_by: 'total_bytes',
          sort_desc: true,
        };
        if (!adminTrafficApi.getCached(params)) {
          adminTrafficApi.getTrafficUsage(params).catch(() => {});
        }
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [period, dateMode]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    setCommittedSearch(searchInput);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const exportData: {
        period: number;
        start_date?: string;
        end_date?: string;
        tariffs?: string;
        statuses?: string;
        nodes?: string;
        total_threshold_gb?: number;
        node_threshold_gb?: number;
      } = { period };
      if (dateMode && customStart && customEnd) {
        exportData.start_date = customStart;
        exportData.end_date = customEnd;
      }
      if (tariffsParam) exportData.tariffs = tariffsParam;
      if (statusesParam) exportData.statuses = statusesParam;
      if (mergedNodesParam) exportData.nodes = mergedNodesParam;

      if (totalThresholdNum > 0) exportData.total_threshold_gb = totalThresholdNum;
      if (nodeThresholdNum > 0) exportData.node_threshold_gb = nodeThresholdNum;

      await adminTrafficApi.exportCsv(exportData);
      setToast({ message: t('admin.trafficUsage.exportSuccess'), type: 'success' });
    } catch {
      setToast({ message: t('admin.trafficUsage.exportError'), type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handlePeriodChange = (p: number) => {
    setPeriod(p);
    setOffset(0);
  };

  const handleToggleDateMode = () => {
    if (dateMode) {
      // Switch back to period mode
      setDateMode(false);
      setCustomStart('');
      setCustomEnd('');
      setOffset(0);
    } else {
      // Switch to date mode — pre-fill with last N days
      const end = new Date();
      const start = new Date(end.getTime() - period * 24 * 60 * 60 * 1000);
      setCustomStart(start.toISOString().split('T')[0]);
      setCustomEnd(end.toISOString().split('T')[0]);
      setDateMode(true);
      setOffset(0);
    }
  };

  const handleCustomStartChange = (v: string) => {
    setCustomStart(v);
    setOffset(0);
  };

  const handleCustomEndChange = (v: string) => {
    setCustomEnd(v);
    setOffset(0);
  };

  const handleSortingChange = (updater: SortingState | ((old: SortingState) => SortingState)) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    setSorting(next);
    setOffset(0);
  };

  const handleTariffChange = (next: Set<string>) => {
    setSelectedTariffs(next);
    setOffset(0);
  };

  const handleStatusChange = (next: Set<string>) => {
    setSelectedStatuses(next);
    setOffset(0);
  };

  const handleNodeChange = (next: Set<string>) => {
    setSelectedNodes(next);
    setOffset(0);
  };

  const handleCountryChange = (next: Set<string>) => {
    setSelectedCountries(next);
    setOffset(0);
  };

  const handleRefresh = () => {
    loadData(true);
    setEnrichment(null);
    setEnrichmentLoading(true);
    adminTrafficApi
      .getEnrichment({ skipCache: true })
      .then((res) => setEnrichment(res.data))
      .catch(() => {})
      .finally(() => setEnrichmentLoading(false));
  };

  const availableCountries = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of nodes) {
      if (n.country_code) map.set(n.country_code, (map.get(n.country_code) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, count]) => ({ code, count }));
  }, [nodes]);

  // When country/node filter is active, show only matching node columns
  const displayNodes = useMemo(() => {
    let filtered = nodes;
    if (selectedCountries.size > 0) {
      filtered = filtered.filter((n) => selectedCountries.has(n.country_code));
    }
    if (selectedNodes.size > 0) {
      filtered = filtered.filter((n) => selectedNodes.has(n.node_uuid));
    }
    return filtered;
  }, [nodes, selectedCountries, selectedNodes]);

  const totalThresholdNum = Math.max(0, parseFloat(totalThreshold) || 0);
  const hasTotalThreshold = totalThresholdNum > 0;
  const nodeThresholdNum = Math.max(0, parseFloat(nodeThreshold) || 0);
  const hasNodeThreshold = nodeThresholdNum > 0;
  const hasAnyThreshold = hasTotalThreshold || hasNodeThreshold;

  const columns = useMemo<ColumnDef<UserTrafficItem>[]>(() => {
    const cols: ColumnDef<UserTrafficItem>[] = [
      {
        id: 'user',
        accessorFn: (row) => row.full_name,
        header: t('admin.trafficUsage.user'),
        enableSorting: true,
        size: 120,
        minSize: 40,
        maxSize: 200,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1.5">
              <div className="from-primary to-primary/90 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-medium text-white">
                {item.full_name?.[0] || '?'}
              </div>
              <div className="min-w-0">
                <div className="text-foreground truncate text-xs font-medium">{item.full_name}</div>
                {item.username ? (
                  <div className="text-muted-foreground truncate text-[10px] leading-tight">
                    @{item.username}
                  </div>
                ) : item.email ? (
                  <div className="text-muted-foreground truncate text-[10px] leading-tight">
                    {item.email}
                  </div>
                ) : null}
              </div>
            </div>
          );
        },
        meta: { sticky: true },
      },
      {
        accessorKey: 'tariff_name',
        header: t('admin.trafficUsage.tariff'),
        enableSorting: true,
        size: 120,
        minSize: 80,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-xs">
            {(getValue() as string | null) || t('admin.trafficUsage.noTariff')}
          </span>
        ),
      },
      {
        accessorKey: 'device_limit',
        header: t('admin.trafficUsage.devices'),
        enableSorting: true,
        size: 80,
        minSize: 60,
        meta: { align: 'center' as const },
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-xs">{getValue() as number}</span>
        ),
      },
      {
        accessorKey: 'traffic_limit_gb',
        header: t('admin.trafficUsage.trafficLimit'),
        enableSorting: true,
        size: 80,
        minSize: 60,
        meta: { align: 'center' as const },
        cell: ({ getValue }) => {
          const gb = getValue() as number;
          return (
            <span className="text-muted-foreground text-xs">{gb > 0 ? `${gb} GB` : '\u221E'}</span>
          );
        },
      },
      // ---- Enrichment columns ----
      {
        id: 'connected',
        header: t('admin.trafficUsage.connected'),
        size: 65,
        minSize: 50,
        enableSorting: true,
        meta: { align: 'center' as const },
        cell: ({ row }) => {
          const e = enrichment?.[row.original.user_id];
          if (enrichmentLoading && !enrichment)
            return <div className="bg-muted mx-auto h-4 w-8 animate-pulse rounded" />;
          return (
            <span className="text-muted-foreground text-xs">
              {e?.devices_connected ?? '\u2014'}
            </span>
          );
        },
      },
      {
        id: 'total_spent',
        header: t('admin.trafficUsage.totalSpent'),
        size: 75,
        minSize: 55,
        enableSorting: true,
        meta: { align: 'center' as const },
        cell: ({ row }) => {
          const e = enrichment?.[row.original.user_id];
          if (enrichmentLoading && !enrichment)
            return <div className="bg-muted mx-auto h-4 w-12 animate-pulse rounded" />;
          if (!e || e.total_spent_kopeks === 0)
            return <span className="text-muted-foreground text-xs">{'\u2014'}</span>;
          return (
            <span className="text-muted-foreground text-xs">
              {formatCurrency(e.total_spent_kopeks)}
            </span>
          );
        },
      },
      {
        id: 'sub_start',
        header: t('admin.trafficUsage.subStart'),
        size: 80,
        minSize: 65,
        enableSorting: true,
        meta: { align: 'center' as const },
        cell: ({ row }) => {
          const e = enrichment?.[row.original.user_id];
          if (enrichmentLoading && !enrichment)
            return <div className="bg-muted mx-auto h-4 w-14 animate-pulse rounded" />;
          return (
            <span className="text-muted-foreground text-xs">
              {formatShortDate(e?.subscription_start_date ?? null)}
            </span>
          );
        },
      },
      {
        id: 'sub_end',
        header: t('admin.trafficUsage.subEnd'),
        size: 80,
        minSize: 65,
        enableSorting: true,
        meta: { align: 'center' as const },
        cell: ({ row }) => {
          const e = enrichment?.[row.original.user_id];
          if (enrichmentLoading && !enrichment)
            return <div className="bg-muted mx-auto h-4 w-14 animate-pulse rounded" />;
          return (
            <span className="text-muted-foreground text-xs">
              {formatShortDate(e?.subscription_end_date ?? null)}
            </span>
          );
        },
      },
      {
        id: 'last_node',
        header: t('admin.trafficUsage.lastNode'),
        size: 100,
        minSize: 70,
        enableSorting: true,
        meta: { align: 'center' as const },
        cell: ({ row }) => {
          const e = enrichment?.[row.original.user_id];
          if (enrichmentLoading && !enrichment)
            return <div className="bg-muted mx-auto h-4 w-16 animate-pulse rounded" />;
          return (
            <span className="text-muted-foreground text-xs">{e?.last_node_name ?? '\u2014'}</span>
          );
        },
      },
      // ---- Dynamic node columns ----
      ...displayNodes.map(
        (node): ColumnDef<UserTrafficItem> => ({
          id: `node_${node.node_uuid}`,
          accessorFn: (row) => row.node_traffic[node.node_uuid] || 0,
          header: `${getFlagEmoji(node.country_code)} ${node.node_name}`,
          enableSorting: true,
          size: 110,
          minSize: 80,
          meta: { align: 'center' as const },
          cell: ({ getValue }) => {
            const bytes = getValue() as number;
            if (bytes <= 0) {
              return <span className="text-muted-foreground text-xs">{'\u2014'}</span>;
            }
            const dailyNode = bytesToGbPerDay(bytes, periodDays);
            const nodeRatio = hasNodeThreshold ? getRatio(dailyNode, nodeThresholdNum) : 0;
            const textColor = hasNodeThreshold ? getNodeTextColor(nodeRatio) : undefined;
            return (
              <div className="flex flex-col items-center">
                <span
                  className="text-muted-foreground text-xs"
                  style={{
                    color: textColor,
                    fontWeight: nodeRatio > 0.8 ? 600 : undefined,
                  }}
                >
                  {formatBytes(bytes)}
                </span>
                {hasNodeThreshold && (
                  <span
                    className="text-[9px] leading-tight opacity-60"
                    style={{ color: textColor }}
                  >
                    {formatGbPerDay(dailyNode)} GB/d
                  </span>
                )}
              </div>
            );
          },
        }),
      ),
    ];

    // Risk column — insert before total when any threshold is set
    if (hasAnyThreshold) {
      cols.push({
        id: 'risk',
        header: t('admin.trafficUsage.risk'),
        size: 100,
        minSize: 80,
        meta: { align: 'center' as const },
        accessorFn: (row) => {
          const result = getCompositeRisk(row, totalThresholdNum, nodeThresholdNum, periodDays);
          return result.ratio;
        },
        enableSorting: false,
        cell: ({ row }) => {
          const result = getCompositeRisk(
            row.original,
            totalThresholdNum,
            nodeThresholdNum,
            periodDays,
          );
          const level = getRiskLevel(result.ratio);
          return <RiskBadge level={level} ratio={result.ratio} gbPerDay={result.gbPerDay} />;
        },
      });
    }

    cols.push({
      accessorKey: 'total_bytes',
      header: t('admin.trafficUsage.total'),
      enableSorting: true,
      size: 110,
      minSize: 80,
      meta: { align: 'center' as const, bold: true },
      cell: ({ getValue }) => {
        const bytes = getValue() as number;
        if (bytes <= 0) {
          return <span className="text-foreground text-xs font-semibold">{'\u2014'}</span>;
        }
        const dailyTotal = bytesToGbPerDay(bytes, periodDays);
        return (
          <div className="flex flex-col items-center">
            <span className="text-foreground text-xs font-semibold">{formatBytes(bytes)}</span>
            {hasTotalThreshold && (
              <span className="text-muted-foreground text-[9px] leading-tight">
                {formatGbPerDay(dailyTotal)} GB/d
              </span>
            )}
          </div>
        );
      },
    });

    return cols;
  }, [
    displayNodes,
    t,
    hasAnyThreshold,
    hasTotalThreshold,
    hasNodeThreshold,
    totalThresholdNum,
    nodeThresholdNum,
    periodDays,
    enrichment,
    enrichmentLoading,
  ]);

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, columnSizing },
    onSortingChange: handleSortingChange,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    enableSortingRemoval: false,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="animate-fade-in relative">
      {/* Progress bar — shown during background refresh */}
      <ProgressBar loading={loading} />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border px-4 py-2 text-sm shadow-lg ${
            toast.type === 'success'
              ? 'border-success-500/30 bg-success-500/20 text-success-400'
              : 'border-error-500/30 bg-error-500/20 text-error-400'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!capabilities.hasBackButton && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/admin')}
              className="rounded-xl"
            >
              <ChevronLeftIcon />
            </Button>
          )}
          <div>
            <h1 className="text-foreground text-xl font-bold">{t('admin.trafficUsage.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('admin.trafficUsage.subtitle')}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={loading}
          className="hover:bg-muted rounded-lg"
        >
          <RefreshIcon className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <PeriodSelector
            value={period}
            onChange={handlePeriodChange}
            label={t('admin.trafficUsage.period')}
            dateMode={dateMode}
            customStart={customStart}
            customEnd={customEnd}
            onToggleDateMode={handleToggleDateMode}
            onCustomStartChange={handleCustomStartChange}
            onCustomEndChange={handleCustomEndChange}
          />
          <TariffFilter
            available={availableTariffs}
            selected={selectedTariffs}
            onChange={handleTariffChange}
          />
          <NodeFilter available={nodes} selected={selectedNodes} onChange={handleNodeChange} />
          <CountryFilter
            available={availableCountries}
            selected={selectedCountries}
            onChange={handleCountryChange}
          />
          <StatusFilter
            available={availableStatuses}
            selected={selectedStatuses}
            onChange={handleStatusChange}
          />

          {/* Threshold inputs */}
          <div className="border-border bg-card flex items-center gap-1.5 rounded-lg border px-2 py-1">
            <ShieldIcon />
            <input
              type="number"
              value={totalThreshold}
              onChange={(e) => setTotalThreshold(e.target.value)}
              placeholder={t('admin.trafficUsage.totalThreshold')}
              step="0.1"
              min="0"
              max="9999"
              className="text-foreground placeholder-muted-foreground w-20 [appearance:textfield] bg-transparent text-xs focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            {totalThreshold && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTotalThreshold('')}
                className="text-muted-foreground hover:text-muted-foreground h-auto w-auto p-0"
              >
                <XIcon />
              </Button>
            )}
          </div>
          <div className="border-border bg-card flex items-center gap-1.5 rounded-lg border px-2 py-1">
            <ServerSmallIcon />
            <input
              type="number"
              value={nodeThreshold}
              onChange={(e) => setNodeThreshold(e.target.value)}
              placeholder={t('admin.trafficUsage.nodeThreshold')}
              step="0.1"
              min="0"
              max="9999"
              className="text-foreground placeholder-muted-foreground w-20 [appearance:textfield] bg-transparent text-xs focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            {nodeThreshold && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setNodeThreshold('')}
                className="text-muted-foreground hover:text-muted-foreground h-auto w-auto p-0"
              >
                <XIcon />
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
            className="text-foreground hover:bg-muted h-auto gap-1.5 px-3 py-1.5 text-xs font-medium"
          >
            <DownloadIcon />
            {t('admin.trafficUsage.exportCsv')}
          </Button>
        </div>

        <form onSubmit={handleSearch}>
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('admin.trafficUsage.search')}
              className="border-border bg-card text-foreground placeholder-muted-foreground focus:border-border w-full rounded-xl border py-2 pr-4 pl-10 focus:outline-none"
            />
            <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
              <SearchIcon />
            </div>
          </div>
        </form>
      </div>

      {/* Table */}
      {initialLoading && !hasData ? (
        <div className="flex justify-center py-12">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      ) : !hasData && !loading ? (
        <div className="text-muted-foreground py-12 text-center">
          {t('admin.trafficUsage.noData')}
        </div>
      ) : (
        <div
          className={`transition-opacity duration-200 ${loading && hasData ? 'opacity-70' : 'opacity-100'}`}
        >
          <div className="border-border overflow-x-auto rounded-xl border">
            <table className="text-left text-sm" style={{ width: table.getCenterTotalSize() }}>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-border bg-card/80 border-b">
                    {headerGroup.headers.map((header) => {
                      const meta = header.column.columnDef.meta;
                      const isSticky = meta?.sticky;
                      const align = meta?.align === 'center' ? 'text-center' : 'text-left';
                      const isBold = meta?.bold;

                      return (
                        <th
                          key={header.id}
                          className={`relative overflow-hidden px-3 py-2 text-xs font-medium text-ellipsis whitespace-nowrap ${
                            isBold ? 'text-foreground font-semibold' : 'text-muted-foreground'
                          } ${align} ${
                            isSticky ? 'bg-card sticky left-0 z-10' : ''
                          } ${header.column.getCanSort() ? 'hover:text-foreground cursor-pointer select-none' : ''}`}
                          style={{ width: header.getSize(), maxWidth: header.getSize() }}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <SortIcon direction={header.column.getIsSorted()} />
                          )}
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-0 -right-2 z-20 h-full w-5 cursor-col-resize touch-none select-none"
                          >
                            <div
                              className={`absolute top-0 right-2 h-full w-1 ${
                                header.column.getIsResizing()
                                  ? 'bg-primary'
                                  : 'hover:bg-muted bg-transparent'
                              }`}
                            />
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => {
                  const compositeRatio = hasAnyThreshold
                    ? getCompositeRisk(
                        row.original,
                        totalThresholdNum,
                        nodeThresholdNum,
                        periodDays,
                      ).ratio
                    : 0;
                  const rowBg = hasAnyThreshold ? getRowBgColor(compositeRatio) : undefined;

                  return (
                    <tr
                      key={row.id}
                      className="border-border/50 hover:bg-card/50 cursor-pointer border-b transition-colors"
                      style={{ backgroundColor: rowBg }}
                      onClick={() => navigate(`/admin/users/${row.original.user_id}`)}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const meta = cell.column.columnDef.meta;
                        const isSticky = meta?.sticky;
                        const align = meta?.align === 'center' ? 'text-center' : 'text-left';

                        return (
                          <td
                            key={cell.id}
                            className={`overflow-hidden px-3 py-2 ${align} ${
                              isSticky ? 'bg-background sticky left-0 z-10' : ''
                            }`}
                            style={{
                              width: cell.column.getSize(),
                              maxWidth: cell.column.getSize(),
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            {offset + 1}
            {'\u2013'}
            {Math.min(offset + limit, total)} / {total}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="hover:bg-muted rounded-lg"
            >
              <ChevronLeftIcon />
            </Button>
            <span className="text-muted-foreground px-3 py-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="hover:bg-muted rounded-lg"
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
