import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminNotificationsApi, AdminNotification } from '@/api/adminNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ─── Icons ───

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

const BellIcon = ({ className }: { className?: string }) => (
  <svg
    className={className || 'h-5 w-5'}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
    />
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

const CheckAllIcon = ({ className }: { className?: string }) => (
  <svg
    className={className || 'h-4 w-4'}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12.75l6 6" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

// ─── Helpers ───

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

type NotificationType = AdminNotification['type'];

function typeIcon(type: NotificationType): string {
  switch (type) {
    case 'user_registered':
      return '👤';
    case 'payment_completed':
      return '💰';
    case 'withdrawal_requested':
      return '💸';
    case 'support_ticket':
      return '🎫';
    case 'error':
      return '⚠️';
    case 'info':
    default:
      return '🔔';
  }
}

function typeBadgeVariant(type: NotificationType): { label: string; className: string } {
  switch (type) {
    case 'user_registered':
      return {
        label: 'User',
        className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20',
      };
    case 'payment_completed':
      return {
        label: 'Payment',
        className: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20',
      };
    case 'withdrawal_requested':
      return {
        label: 'Withdrawal',
        className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20',
      };
    case 'support_ticket':
      return {
        label: 'Ticket',
        className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20',
      };
    case 'error':
      return {
        label: 'Error',
        className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20',
      };
    case 'info':
    default:
      return { label: 'Info', className: 'bg-muted text-muted-foreground border-border' };
  }
}

// ─── Skeleton ───

const NotificationSkeleton = () => (
  <div className="flex animate-pulse items-start gap-3 border-b p-4 last:border-b-0">
    <div className="bg-muted h-9 w-9 shrink-0 rounded-full" />
    <div className="flex-1 space-y-2">
      <div className="bg-muted h-4 w-2/3 rounded" />
      <div className="bg-muted h-3 w-full rounded" />
      <div className="bg-muted h-3 w-1/4 rounded" />
    </div>
  </div>
);

// ─── Notification Item ───

interface NotificationItemProps {
  notification: AdminNotification;
  onMarkRead: (id: number) => void;
}

const NotificationItem = ({ notification, onMarkRead }: NotificationItemProps) => {
  const badge = typeBadgeVariant(notification.type);

  return (
    <div
      onClick={() => {
        if (!notification.is_read) onMarkRead(notification.id);
      }}
      className={[
        'flex items-start gap-3 border-b p-4 transition-colors last:border-b-0',
        notification.is_read
          ? 'opacity-70'
          : 'cursor-pointer border-l-2 border-l-blue-500 bg-blue-500/5 hover:bg-blue-500/10',
      ].join(' ')}
    >
      {/* type icon */}
      <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg select-none">
        {typeIcon(notification.type)}
      </div>

      {/* content */}
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex flex-wrap items-center gap-2">
          <span className="text-sm leading-snug font-medium">{notification.title}</span>
          {!notification.is_read && (
            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-blue-500" />
          )}
          <Badge variant="outline" className={`px-1.5 py-0 text-xs ${badge.className}`}>
            {badge.label}
          </Badge>
        </div>
        <p className="text-muted-foreground line-clamp-2 text-sm">{notification.message}</p>
        <p className="text-muted-foreground/70 mt-1 text-xs">
          {relativeTime(notification.created_at)}
        </p>
      </div>
    </div>
  );
};

// ─── Main Page ───

const PAGE_SIZE = 20;

export default function AdminNotifications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(0);

  const unreadOnly = tab === 'unread';

  const queryKey = ['admin-notifications', tab, page];

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      adminNotificationsApi.getNotifications({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        unread_only: unreadOnly,
      }),
    placeholderData: (prev) => prev,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => adminNotificationsApi.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => adminNotificationsApi.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
  });

  const handleMarkRead = useCallback(
    (id: number) => {
      markReadMutation.mutate(id);
    },
    [markReadMutation],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const handleTabChange = (value: string) => {
    setTab(value as 'all' | 'unread');
    setPage(0);
  };

  const notifications = data?.notifications ?? [];
  const total = data?.total ?? 0;
  const unreadCount = data?.unread_count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasNextPage = page + 1 < totalPages;
  const hasPrevPage = page > 0;

  const emptyKey = unreadOnly
    ? 'admin.notifications.noUnread'
    : 'admin.notifications.noNotifications';

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-background/95 sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3 backdrop-blur">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="hover:bg-muted h-8 w-8 rounded-full"
          aria-label="Back"
        >
          <BackIcon />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{t('admin.notifications.title')}</h1>
          <p className="text-muted-foreground truncate text-xs">
            {t('admin.notifications.subtitle')}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Refresh"
        >
          <RefreshIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-4 p-4">
        <Tabs value={tab} onValueChange={handleTabChange}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="all">{t('admin.notifications.tabs.all')}</TabsTrigger>
              <TabsTrigger value="unread" className="relative">
                {t('admin.notifications.tabs.unread')}
                {unreadCount > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] leading-none font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={handleMarkAllRead}
                disabled={markAllReadMutation.isPending}
              >
                <CheckAllIcon />
                {t('admin.notifications.markAllRead')}
              </Button>
            )}
          </div>

          <TabsContent value="all" className="mt-4">
            <NotificationList
              notifications={notifications}
              isLoading={isLoading}
              emptyKey={emptyKey}
              onMarkRead={handleMarkRead}
            />
          </TabsContent>

          <TabsContent value="unread" className="mt-4">
            <NotificationList
              notifications={notifications}
              isLoading={isLoading}
              emptyKey={emptyKey}
              onMarkRead={handleMarkRead}
            />
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={!hasPrevPage || isFetching}
              className="gap-1"
            >
              <ChevronLeftIcon />
              Prev
            </Button>
            <span className="text-muted-foreground text-sm">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNextPage || isFetching}
              className="gap-1"
            >
              Next
              <ChevronRightIcon />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Notification List ───

interface NotificationListProps {
  notifications: AdminNotification[];
  isLoading: boolean;
  emptyKey: string;
  onMarkRead: (id: number) => void;
}

function NotificationList({
  notifications,
  isLoading,
  emptyKey,
  onMarkRead,
}: NotificationListProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <NotificationSkeleton key={i} />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <BellIcon className="text-muted-foreground/30 mb-4 h-12 w-12" />
          <p className="text-muted-foreground text-sm">{t(emptyKey)}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-4 pt-3 pb-0">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
        </CardTitle>
      </CardHeader>
      <CardContent className="mt-2 p-0">
        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} onMarkRead={onMarkRead} />
        ))}
      </CardContent>
    </Card>
  );
}
