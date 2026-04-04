import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { rbacApi, AuditLogEntry, AuditLogFilters } from '@/api/rbac';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { usePlatform } from '@/platform/hooks/usePlatform';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

// === Icons ===

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

const DownloadIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
);

const FilterIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
    />
  </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className || 'h-4 w-4'}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg
    className={className || 'h-4 w-4'}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
    />
  </svg>
);

const SearchIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

// === Constants ===

const RESOURCE_TYPES = [
  'users',
  'tickets',
  'stats',
  'sales_stats',
  'broadcasts',
  'tariffs',
  'promocodes',
  'promo_groups',
  'promo_offers',
  'campaigns',
  'partners',
  'withdrawals',
  'payments',
  'payment_methods',
  'servers',
  'remnawave',
  'traffic',
  'settings',
  'roles',
  'audit_log',
  'channels',
  'ban_system',
  'wheel',
  'apps',
  'email_templates',
  'pinned_messages',
  'landings',
  'updates',
] as const;

const STATUS_OPTIONS = ['success', 'denied', 'error'] as const;

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

const AUTO_REFRESH_INTERVAL = 30_000;

interface FiltersState {
  userId: string;
  action: string;
  resource: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

const INITIAL_FILTERS: FiltersState = {
  userId: '',
  action: '',
  resource: '',
  status: '',
  dateFrom: '',
  dateTo: '',
};

// === Utility functions ===

function translateAction(
  action: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any,
): string {
  return action
    .split(',')
    .map((perm: string) => {
      const trimmed = perm.trim();
      const [section, act] = trimmed.split(':', 2);
      if (!section || !act) return trimmed;
      const sectionLabel = t(`admin.roles.form.permissionSections.${section}`, section) as string;
      const actionLabel = t(`admin.roles.form.permissionActions.${act}`, act) as string;
      return `${sectionLabel}: ${actionLabel}`;
    })
    .join(', ');
}

function formatRelativeTime(
  dateString: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return t('admin.auditLog.time.justNow');
  if (diffMin < 60) return t('admin.auditLog.time.minutesAgo', { count: diffMin });
  if (diffHour < 24) return t('admin.auditLog.time.hoursAgo', { count: diffHour });
  if (diffDay < 30) return t('admin.auditLog.time.daysAgo', { count: diffDay });
  return date.toLocaleDateString();
}

function formatAbsoluteTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

// === Sub-components ===

interface StatusBadgeProps {
  status: string;
  label: string;
}

function StatusBadge({ status, label }: StatusBadgeProps) {
  const colorMap: Record<string, string> = {
    success: 'bg-success-500/20 text-success-400',
    denied: 'bg-red-500/20 text-red-400',
    error: 'bg-amber-500/20 text-amber-400',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${colorMap[status] || 'bg-muted text-muted-foreground'}`}
    >
      {label}
    </span>
  );
}

interface MethodBadgeProps {
  method: string;
}

function MethodBadge({ method }: MethodBadgeProps) {
  const colorMap: Record<string, string> = {
    GET: 'bg-blue-500/20 text-blue-400',
    POST: 'bg-success-500/20 text-success-400',
    PUT: 'bg-amber-500/20 text-amber-400',
    PATCH: 'bg-amber-500/20 text-amber-400',
    DELETE: 'bg-red-500/20 text-red-400',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-medium ${colorMap[method] || 'bg-muted text-muted-foreground'}`}
    >
      {method}
    </span>
  );
}

interface LogEntryCardProps {
  entry: AuditLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}

function LogEntryCard({ entry, isExpanded, onToggle }: LogEntryCardProps) {
  const { t } = useTranslation();
  const status = entry.status;
  const method = entry.request_method?.toUpperCase() ?? null;
  const requestPath = entry.request_path;
  const userName = entry.user_first_name || entry.user_email || t('admin.auditLog.unknownUser');

  return (
    <div className="border-border bg-card hover:border-border rounded-xl border transition-colors">
      {/* Main row */}
      <Button
        type="button"
        variant="ghost"
        onClick={onToggle}
        className="flex w-full flex-col gap-2 p-4 text-left sm:flex-row sm:items-center sm:gap-4"
        aria-expanded={isExpanded}
      >
        {/* Timestamp */}
        <div
          className="text-muted-foreground shrink-0 text-sm"
          title={formatAbsoluteTime(entry.created_at)}
        >
          {formatRelativeTime(entry.created_at, t)}
        </div>

        {/* User */}
        <div className="min-w-0 shrink-0">
          <span className="text-foreground text-sm font-medium">{userName}</span>
        </div>

        {/* Action + status */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <StatusBadge
            status={status}
            label={t(`admin.auditLog.status.${status}`, { defaultValue: status })}
          />
          <span className="text-foreground truncate text-sm font-medium">
            {translateAction(entry.action, t)}
          </span>
        </div>

        {/* Resource */}
        <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-sm">
          <span>
            {entry.resource_type
              ? t(`admin.roles.form.permissionSections.${entry.resource_type}`, entry.resource_type)
              : null}
          </span>
          {entry.resource_id && (
            <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">
              #{entry.resource_id}
            </span>
          )}
        </div>

        {/* Method badge */}
        {method && (
          <div className="shrink-0">
            <MethodBadge method={method} />
          </div>
        )}

        {/* IP */}
        {entry.ip_address && (
          <div className="text-muted-foreground shrink-0 font-mono text-xs">{entry.ip_address}</div>
        )}

        {/* Expand indicator */}
        <ChevronDownIcon
          className={`text-muted-foreground h-4 w-4 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </Button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-border border-t p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* User agent */}
            {entry.user_agent && (
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  {t('admin.auditLog.details.userAgent')}
                </p>
                <p className="text-muted-foreground text-sm break-all">{entry.user_agent}</p>
              </div>
            )}

            {/* Request path */}
            {requestPath && (
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  {t('admin.auditLog.details.requestPath')}
                </p>
                <p className="text-muted-foreground font-mono text-sm break-all">{requestPath}</p>
              </div>
            )}

            {/* IP Address */}
            {entry.ip_address && (
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  {t('admin.auditLog.details.ipAddress')}
                </p>
                <p className="text-muted-foreground font-mono text-sm">{entry.ip_address}</p>
              </div>
            )}

            {/* Timestamp */}
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                {t('admin.auditLog.details.timestamp')}
              </p>
              <p className="text-muted-foreground text-sm">
                {formatAbsoluteTime(entry.created_at)}
              </p>
            </div>

            {/* Before/after diff */}
            {entry.details && 'before' in entry.details && entry.details.before != null && (
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  {t('admin.auditLog.details.before')}
                </p>
                <pre className="bg-background text-muted-foreground max-h-40 overflow-auto rounded-lg p-2 text-xs">
                  {JSON.stringify(entry.details.before, null, 2)}
                </pre>
              </div>
            )}

            {entry.details && 'after' in entry.details && entry.details.after != null && (
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  {t('admin.auditLog.details.after')}
                </p>
                <pre className="bg-background text-muted-foreground max-h-40 overflow-auto rounded-lg p-2 text-xs">
                  {JSON.stringify(entry.details.after, null, 2)}
                </pre>
              </div>
            )}

            {/* Query params */}
            {entry.details &&
              'query_params' in entry.details &&
              entry.details.query_params != null && (
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                    {t('admin.auditLog.details.queryParams')}
                  </p>
                  <pre className="bg-background text-muted-foreground max-h-40 overflow-auto rounded-lg p-2 text-xs">
                    {JSON.stringify(entry.details.query_params, null, 2)}
                  </pre>
                </div>
              )}

            {/* Request body */}
            {entry.details &&
              'request_body' in entry.details &&
              entry.details.request_body != null && (
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                    {t('admin.auditLog.details.requestBody')}
                  </p>
                  <pre className="bg-background text-muted-foreground max-h-60 overflow-auto rounded-lg p-2 text-xs">
                    {JSON.stringify(entry.details.request_body, null, 2)}
                  </pre>
                </div>
              )}
          </div>

          {/* Full details JSON */}
          {entry.details && (
            <div className="mt-4">
              <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                {t('admin.auditLog.details.fullDetails')}
              </p>
              <pre className="bg-background text-muted-foreground max-h-60 overflow-auto rounded-lg p-3 text-xs">
                {JSON.stringify(entry.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// === Main Page ===

export default function AdminAuditLog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { capabilities } = usePlatform();

  // Filter state
  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>(INITIAL_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  // UI state
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Build query params
  const queryParams = useMemo((): AuditLogFilters => {
    const params: AuditLogFilters = {
      limit: pageSize,
      offset: page * pageSize,
    };

    const parsedUserId = parseInt(appliedFilters.userId, 10);
    if (!isNaN(parsedUserId) && parsedUserId > 0) {
      params.user_id = parsedUserId;
    }
    if (appliedFilters.action.trim()) {
      params.action = appliedFilters.action.trim();
    }
    if (appliedFilters.resource) {
      params.resource_type = appliedFilters.resource;
    }
    if (appliedFilters.status) {
      params.status = appliedFilters.status;
    }
    if (appliedFilters.dateFrom) {
      params.date_from = appliedFilters.dateFrom;
    }
    if (appliedFilters.dateTo) {
      params.date_to = appliedFilters.dateTo;
    }

    return params;
  }, [appliedFilters, page, pageSize]);

  // Main query
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-audit-log', queryParams],
    queryFn: () => rbacApi.getAuditLog(queryParams),
    refetchInterval: autoRefresh ? AUTO_REFRESH_INTERVAL : false,
  });

  // RBAC users for filter chips
  const { data: rbacUsers } = useQuery({
    queryKey: ['rbac-users'],
    queryFn: () => rbacApi.getRbacUsers(),
    staleTime: 5 * 60 * 1000,
  });

  const entries = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Handlers
  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({ ...filters });
    setPage(0);
    setExpandedIds(new Set());
  }, [filters]);

  const handleClearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setPage(0);
    setExpandedIds(new Set());
  }, []);

  const handleToggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const exportParams: AuditLogFilters = {};
      const exportUserId = parseInt(appliedFilters.userId, 10);
      if (!isNaN(exportUserId) && exportUserId > 0) exportParams.user_id = exportUserId;
      if (appliedFilters.action.trim()) exportParams.action = appliedFilters.action.trim();
      if (appliedFilters.resource) exportParams.resource_type = appliedFilters.resource;
      if (appliedFilters.status) exportParams.status = appliedFilters.status;
      if (appliedFilters.dateFrom) exportParams.date_from = appliedFilters.dateFrom;
      if (appliedFilters.dateTo) exportParams.date_to = appliedFilters.dateTo;

      const blob = await rbacApi.exportAuditLog(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setExportError(t('admin.auditLog.exportError'));
    } finally {
      setExporting(false);
    }
  }, [appliedFilters, t]);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  }, []);

  // Status is filtered server-side via query params
  const filteredEntries = entries;

  const hasActiveFilters = useMemo(() => {
    return (
      appliedFilters.userId.trim() !== '' ||
      appliedFilters.action.trim() !== '' ||
      appliedFilters.resource !== '' ||
      appliedFilters.status !== '' ||
      appliedFilters.dateFrom !== '' ||
      appliedFilters.dateTo !== ''
    );
  }, [appliedFilters]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {!capabilities.hasBackButton && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/admin')}
              aria-label={t('admin.auditLog.back')}
            >
              <BackIcon />
            </Button>
          )}
          <div>
            <h1 className="text-foreground text-xl font-semibold">{t('admin.auditLog.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('admin.auditLog.subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <Button
            variant="outline"
            onClick={() => setAutoRefresh((prev) => !prev)}
            className={`flex items-center gap-1.5 ${
              autoRefresh ? 'border-primary/50 bg-primary/10 text-primary' : ''
            }`}
            title={t('admin.auditLog.autoRefresh.tooltip')}
          >
            <RefreshIcon className={`h-4 w-4 ${isFetching && autoRefresh ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('admin.auditLog.autoRefresh.label')}</span>
          </Button>

          {/* Manual refresh */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            title={t('admin.auditLog.refresh')}
          >
            <RefreshIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>

          {/* Export */}
          <PermissionGate permission="audit_log:export">
            <div className="flex items-center gap-2">
              {exportError && <p className="text-error-400 text-sm">{exportError}</p>}
              <Button
                onClick={() => {
                  setExportError(null);
                  handleExport();
                }}
                disabled={exporting}
              >
                <DownloadIcon />
                <span className="hidden sm:inline">
                  {exporting ? t('admin.auditLog.exporting') : t('admin.auditLog.exportCsv')}
                </span>
              </Button>
            </div>
          </PermissionGate>
        </div>
      </div>

      {/* Filters bar */}
      <div className="border-border bg-card mb-4 rounded-xl border">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setFiltersOpen((prev) => !prev)}
          className="flex w-full items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <FilterIcon />
            <span className="text-foreground text-sm font-medium">
              {t('admin.auditLog.filters.title')}
            </span>
            {hasActiveFilters && (
              <span className="bg-primary/20 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                {t('admin.auditLog.filters.active')}
              </span>
            )}
          </div>
          <ChevronDownIcon
            className={`text-muted-foreground h-5 w-5 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
          />
        </Button>

        {filtersOpen && (
          <div className="border-border border-t p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* User filter */}
              {rbacUsers && rbacUsers.length > 0 && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-muted-foreground mb-1 block text-sm font-medium">
                    {t('admin.auditLog.filters.user')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {rbacUsers.map((ru) => {
                      const isSelected = filters.userId === String(ru.user_id);
                      const displayName =
                        ru.first_name || ru.email || ru.username || `#${ru.user_id}`;
                      return (
                        <Button
                          key={ru.user_id}
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-pressed={isSelected}
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              userId: isSelected ? '' : String(ru.user_id),
                            }))
                          }
                          className={`flex items-center gap-1.5 ${
                            isSelected
                              ? 'border-primary bg-primary/20 text-primary/70'
                              : 'bg-background text-muted-foreground'
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded border text-xs ${
                              isSelected
                                ? 'border-primary bg-primary text-white'
                                : 'border-border bg-card'
                            }`}
                          >
                            {isSelected && '✓'}
                          </span>
                          <span>{displayName}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action search */}
              <div>
                <label
                  htmlFor="filter-action"
                  className="text-muted-foreground mb-1 block text-sm font-medium"
                >
                  {t('admin.auditLog.filters.action')}
                </label>
                <div className="relative">
                  <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                    <SearchIcon />
                  </span>
                  <input
                    id="filter-action"
                    type="text"
                    value={filters.action}
                    onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value }))}
                    className="border-border bg-background text-foreground placeholder-muted-foreground focus:border-primary w-full rounded-lg border py-2 pr-3 pl-9 text-sm transition-colors outline-none"
                    placeholder={t('admin.auditLog.filters.actionPlaceholder')}
                  />
                </div>
              </div>

              {/* Resource type */}
              <div>
                <label
                  htmlFor="filter-resource"
                  className="text-muted-foreground mb-1 block text-sm font-medium"
                >
                  {t('admin.auditLog.filters.resource')}
                </label>
                <Select
                  value={filters.resource || '__all__'}
                  onValueChange={(v) =>
                    setFilters((prev) => ({ ...prev, resource: v === '__all__' ? '' : v }))
                  }
                >
                  <SelectTrigger className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">
                      {t('admin.auditLog.filters.allResources')}
                    </SelectItem>
                    {RESOURCE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`admin.roles.form.permissionSections.${type}`, type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div>
                <label
                  htmlFor="filter-status"
                  className="text-muted-foreground mb-1 block text-sm font-medium"
                >
                  {t('admin.auditLog.filters.status')}
                </label>
                <Select
                  value={filters.status || '__all__'}
                  onValueChange={(v) =>
                    setFilters((prev) => ({ ...prev, status: v === '__all__' ? '' : v }))
                  }
                >
                  <SelectTrigger className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">
                      {t('admin.auditLog.filters.allStatuses')}
                    </SelectItem>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`admin.auditLog.status.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date from */}
              <div>
                <label
                  htmlFor="filter-date-from"
                  className="text-muted-foreground mb-1 block text-sm font-medium"
                >
                  {t('admin.auditLog.filters.dateFrom')}
                </label>
                <input
                  id="filter-date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                  className="border-border bg-background text-foreground focus:border-primary w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none"
                />
              </div>

              {/* Date to */}
              <div>
                <label
                  htmlFor="filter-date-to"
                  className="text-muted-foreground mb-1 block text-sm font-medium"
                >
                  {t('admin.auditLog.filters.dateTo')}
                </label>
                <input
                  id="filter-date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                  className="border-border bg-background text-foreground focus:border-primary w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none"
                />
              </div>
            </div>

            {/* Filter actions */}
            <div className="mt-4 flex items-center gap-3">
              <Button onClick={handleApplyFilters}>{t('admin.auditLog.filters.apply')}</Button>
              <Button variant="outline" onClick={handleClearFilters}>
                {t('admin.auditLog.filters.clear')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Results summary */}
      {!isLoading && !error && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {t('admin.auditLog.totalEntries', { count: total })}
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="page-size" className="text-muted-foreground text-sm">
              {t('admin.auditLog.pagination.pageSize')}
            </label>
            <Select value={String(pageSize)} onValueChange={(v) => handlePageSizeChange(Number(v))}>
              <SelectTrigger className="border-border bg-card text-foreground h-8 w-auto rounded-lg border px-2 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-error-400">{t('admin.auditLog.errors.loadFailed')}</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-3">
            {t('admin.auditLog.errors.retry')}
          </Button>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">{t('admin.auditLog.noEntries')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => (
            <LogEntryCard
              key={entry.id}
              entry={entry}
              isExpanded={expandedIds.has(entry.id)}
              onToggle={() => handleToggleExpand(entry.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(0)}
            disabled={page === 0}
            aria-label={t('admin.auditLog.pagination.first')}
          >
            &laquo;
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label={t('admin.auditLog.pagination.previous')}
          >
            &lsaquo;
          </Button>

          <span className="text-muted-foreground px-3 py-2 text-sm">
            {t('admin.auditLog.pagination.pageOf', {
              current: page + 1,
              total: totalPages,
            })}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            aria-label={t('admin.auditLog.pagination.next')}
          >
            &rsaquo;
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(totalPages - 1)}
            disabled={page >= totalPages - 1}
            aria-label={t('admin.auditLog.pagination.last')}
          >
            &raquo;
          </Button>
        </div>
      )}
    </div>
  );
}
