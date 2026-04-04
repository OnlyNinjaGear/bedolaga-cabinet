import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../hooks/useCurrency';
import { adminUsersApi, type UserListItem, type UsersStatsResponse } from '../api/adminUsers';
import { usePlatform } from '../platform/hooks/usePlatform';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

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

const DownloadIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
);

const TelegramIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

function StatCard({ title, value, subtitle, color }: StatCardProps) {
  const colors = {
    blue: 'bg-primary/20 text-primary border-primary/30',
    green: 'bg-success-500/20 text-success-400 border-success-500/30',
    yellow: 'bg-warning-500/20 text-warning-400 border-warning-500/30',
    red: 'bg-error-500/20 text-error-400 border-error-500/30',
    purple: 'bg-primary/20 text-primary border-primary/30',
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="mb-1 text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{title}</div>
      {subtitle && <div className="mt-1 text-xs opacity-60">{subtitle}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-success-500/20 text-success-400 border-success-500/30',
    blocked: 'bg-error-500/20 text-error-400 border-error-500/30',
    deleted: 'bg-muted text-muted-foreground border-border',
    trial: 'bg-primary/20 text-primary border-primary/30',
    expired: 'bg-warning-500/20 text-warning-400 border-warning-500/30',
    disabled: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${styles[status] || styles.active}`}>
      {status}
    </span>
  );
}

interface UserRowProps {
  user: UserListItem;
  onClick: () => void;
  formatAmount: (rubAmount: number) => string;
}

function UserRow({ user, onClick, formatAmount }: UserRowProps) {
  const { t } = useTranslation();
  return (
    <div
      onClick={onClick}
      className="border-border bg-card/50 hover:border-border hover:bg-card flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all sm:items-center sm:gap-4 sm:p-4"
    >
      {/* Avatar */}
      <div className="from-primary to-primary/90 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-medium text-white sm:text-base">
        {user.first_name?.[0] || user.username?.[0] || '?'}
      </div>

      {/* Info - flex column on mobile, row on desktop */}
      <div className="min-w-0 flex-1">
        {/* Name and username */}
        <div className="mb-1 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
          <span className="text-foreground truncate font-medium">{user.full_name}</span>
          {user.username && (
            <span className="text-muted-foreground truncate text-xs sm:text-xs">
              @{user.username}
            </span>
          )}
        </div>

        {/* Telegram ID - full width on mobile */}
        <div className="text-muted-foreground mb-1 flex items-center gap-1 text-xs sm:mb-0">
          <TelegramIcon />
          <span className="truncate">{user.telegram_id}</span>
        </div>

        {/* Status badges - wrap on mobile */}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {user.status !== 'active' && <StatusBadge status={user.status} />}
          {user.has_subscription && user.subscription_status && (
            <span
              className={`rounded-full border px-2 py-0.5 text-xs ${
                user.subscription_status === 'active'
                  ? 'border-success-500/30 bg-success-500/20 text-success-400'
                  : user.subscription_status === 'trial'
                    ? 'border-primary/30 bg-primary/20 text-primary'
                    : user.subscription_status === 'limited'
                      ? 'border-yellow-500/30 bg-yellow-500/20 text-yellow-400'
                      : 'border-warning-500/30 bg-warning-500/20 text-warning-400'
              }`}
            >
              {user.subscription_status === 'active'
                ? t('admin.users.status.subscription')
                : user.subscription_status === 'trial'
                  ? t('admin.users.status.trial')
                  : user.subscription_status === 'limited'
                    ? t('subscription.trafficLimited')
                    : t('admin.users.status.expired')}
            </span>
          )}
        </div>
      </div>

      {/* Balance - smaller on mobile, show inline */}
      <div className="shrink-0 text-right">
        <div className="text-foreground text-sm font-medium sm:text-base">
          {formatAmount(user.balance_rubles)}
        </div>
        <div className="text-muted-foreground hidden text-xs sm:block">
          {user.purchase_count > 0
            ? t('admin.users.purchaseCount', { count: user.purchase_count })
            : t('admin.users.noPurchases')}
        </div>
      </div>

      <ChevronRightIcon />
    </div>
  );
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const { formatWithCurrency } = useCurrency();
  const navigate = useNavigate();
  const { capabilities } = usePlatform();

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [stats, setStats] = useState<UsersStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const limit = 20;

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = { offset, limit, sort_by: sortBy };
      if (search) params.search = search;
      if (emailSearch) params.email = emailSearch;
      if (statusFilter) params.status = statusFilter;

      const data = await adminUsersApi.getUsers(
        params as Parameters<typeof adminUsersApi.getUsers>[0],
      );
      setUsers(data.users);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  }, [offset, search, emailSearch, statusFilter, sortBy]);

  const loadStats = useCallback(async () => {
    try {
      const data = await adminUsersApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
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
            <h1 className="text-foreground text-xl font-bold">{t('admin.users.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('admin.users.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              setExporting(true);
              try {
                await adminUsersApi.exportCsv({
                  search: search || undefined,
                  status: statusFilter as 'active' | 'blocked' | 'deleted' | undefined,
                });
              } finally {
                setExporting(false);
              }
            }}
            disabled={exporting}
            title="Экспорт CSV"
          >
            <DownloadIcon className={exporting ? 'animate-pulse' : ''} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              loadUsers();
              loadStats();
            }}
          >
            <RefreshIcon className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard title={t('admin.users.stats.total')} value={stats.total_users} color="blue" />
          <StatCard
            title={t('admin.users.stats.active')}
            value={stats.active_users}
            color="green"
          />
          <StatCard
            title={t('admin.users.stats.withSubscription')}
            value={stats.users_with_active_subscription}
            color="purple"
          />
          <StatCard
            title={t('admin.users.stats.newToday')}
            value={stats.new_today}
            color="yellow"
          />
          <StatCard
            title={t('admin.users.stats.blocked')}
            value={stats.blocked_users}
            color="red"
          />
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3">
        {/* Search fields row */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOffset(0);
                }}
                placeholder={t('admin.users.search')}
                className="border-border bg-card text-foreground placeholder-muted-foreground focus:border-border w-full rounded-xl border py-2 pr-4 pl-10 focus:outline-none"
              />
              <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                <SearchIcon />
              </div>
            </div>
          </form>
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <input
                type="email"
                value={emailSearch}
                onChange={(e) => {
                  setEmailSearch(e.target.value);
                  setOffset(0);
                }}
                placeholder={t('admin.users.searchEmail')}
                className="border-border bg-card text-foreground placeholder-muted-foreground focus:border-border w-full rounded-xl border py-2 pr-4 pl-10 focus:outline-none"
              />
              <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                <SearchIcon />
              </div>
            </div>
          </form>
        </div>
        {/* Filters row */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select
            value={statusFilter || '__all__'}
            onValueChange={(v) => {
              setStatusFilter(v === '__all__' ? '' : v);
              setOffset(0);
            }}
          >
            <SelectTrigger className="border-border bg-card text-foreground rounded-xl border px-3 py-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t('admin.users.filters.allStatuses')}</SelectItem>
              <SelectItem value="active">{t('admin.users.status.active')}</SelectItem>
              <SelectItem value="blocked">{t('admin.users.status.blocked')}</SelectItem>
              <SelectItem value="deleted">{t('admin.users.status.deleted')}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortBy}
            onValueChange={(v) => {
              setSortBy(v);
              setOffset(0);
            }}
          >
            <SelectTrigger className="border-border bg-card text-foreground rounded-xl border px-3 py-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">{t('admin.users.filters.byDate')}</SelectItem>
              <SelectItem value="balance">{t('admin.users.filters.byBalance')}</SelectItem>
              <SelectItem value="last_activity">{t('admin.users.filters.byActivity')}</SelectItem>
              <SelectItem value="total_spent">{t('admin.users.filters.bySpent')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Users list */}
      <div className="mb-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center">{t('admin.users.noData')}</div>
        ) : (
          users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              onClick={() => navigate(`/admin/users/${user.id}`)}
              formatAmount={(amount) => formatWithCurrency(amount)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            {t('admin.users.pagination.showing', {
              from: offset + 1,
              to: Math.min(offset + limit, total),
              total,
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
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
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
