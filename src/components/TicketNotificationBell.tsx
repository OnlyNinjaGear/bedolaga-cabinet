import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ticketNotificationsApi } from '../api/ticketNotifications';
import { useAuthStore } from '../store/auth';
import { useToast } from './Toast';
import { useWebSocket, WSMessage } from '../hooks/useWebSocket';
import { useHeaderHeight } from '../hooks/useHeaderHeight';
import type { TicketNotification } from '../types';
import { Button } from '@/components/ui/button';

const BellIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

interface TicketNotificationBellProps {
  isAdmin?: boolean;
}

export default function TicketNotificationBell({ isAdmin = false }: TicketNotificationBellProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { mobile: dropdownTop, isMobileFullscreen } = useHeaderHeight();

  // Show toast for WebSocket notification
  const showWSNotificationToast = useCallback(
    (message: WSMessage) => {
      const isNewTicket = message.type === 'ticket.new';
      const isAdminReply = message.type === 'ticket.admin_reply';
      const isUserReply = message.type === 'ticket.user_reply';

      const icon = isNewTicket ? (
        <span className="text-lg">🎫</span>
      ) : isAdminReply ? (
        <span className="text-lg">💬</span>
      ) : (
        <span className="text-lg">📨</span>
      );

      const ticketTitle = message.title || '';

      let toastTitle: string;
      let toastMessage: string;

      if (isNewTicket) {
        toastTitle = t('notifications.newTicketTitle', 'New Ticket');
        toastMessage =
          message.message ||
          t('notifications.newTicket', 'New ticket: {{title}}', { title: ticketTitle });
      } else if (isUserReply) {
        toastTitle = t('notifications.newUserReplyTitle', 'User Reply');
        toastMessage =
          message.message ||
          t('notifications.newUserReply', 'User replied in ticket: {{title}}', {
            title: ticketTitle,
          });
      } else {
        toastTitle = t('notifications.newReplyTitle', 'New Reply');
        toastMessage =
          message.message ||
          t('notifications.newReply', 'New reply in ticket: {{title}}', { title: ticketTitle });
      }

      showToast({
        type: 'info',
        title: toastTitle,
        message: toastMessage,
        icon,
        onClick: () => {
          navigate(
            isAdmin
              ? `/admin/tickets?ticket=${message.ticket_id}`
              : `/support?ticket=${message.ticket_id}`,
          );
        },
        duration: 8000,
      });
    },
    [showToast, navigate, isAdmin, t],
  );

  // Handle WebSocket message
  const handleWSMessage = useCallback(
    (message: WSMessage) => {
      // Check if this notification is relevant for this user type
      const isAdminNotification =
        message.type === 'ticket.new' || message.type === 'ticket.user_reply';
      const isUserNotification = message.type === 'ticket.admin_reply';

      if ((isAdmin && isAdminNotification) || (!isAdmin && isUserNotification)) {
        // Show toast
        showWSNotificationToast(message);

        // Invalidate queries to refresh count and list
        queryClient.invalidateQueries({
          queryKey: isAdmin ? ['admin-ticket-notifications-count'] : ['ticket-notifications-count'],
        });
        queryClient.invalidateQueries({
          queryKey: isAdmin ? ['admin-ticket-notifications'] : ['ticket-notifications'],
        });
      }
    },
    [isAdmin, showWSNotificationToast, queryClient],
  );

  // WebSocket connection
  useWebSocket({
    onMessage: handleWSMessage,
  });

  // Fetch unread count (with slower polling as fallback when WS disconnects)
  const { data: unreadData } = useQuery({
    queryKey: isAdmin ? ['admin-ticket-notifications-count'] : ['ticket-notifications-count'],
    queryFn: isAdmin
      ? ticketNotificationsApi.getAdminUnreadCount
      : ticketNotificationsApi.getUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: 60000, // Poll every 60 seconds as fallback
    staleTime: 30000,
  });

  // Fetch notifications when dropdown is open
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: isAdmin ? ['admin-ticket-notifications'] : ['ticket-notifications'],
    queryFn: () =>
      isAdmin
        ? ticketNotificationsApi.getAdminNotifications(false, 10)
        : ticketNotificationsApi.getNotifications(false, 10),
    enabled: isAuthenticated && isOpen,
    staleTime: 5000,
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: isAdmin
      ? ticketNotificationsApi.markAllAdminAsRead
      : ticketNotificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: isAdmin ? ['admin-ticket-notifications'] : ['ticket-notifications'],
      });
      queryClient.invalidateQueries({
        queryKey: isAdmin ? ['admin-ticket-notifications-count'] : ['ticket-notifications-count'],
      });
    },
  });

  // Mark single as read mutation
  const markReadMutation = useMutation({
    mutationFn: isAdmin
      ? ticketNotificationsApi.markAdminAsRead
      : ticketNotificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: isAdmin ? ['admin-ticket-notifications'] : ['ticket-notifications'],
      });
      queryClient.invalidateQueries({
        queryKey: isAdmin ? ['admin-ticket-notifications-count'] : ['ticket-notifications-count'],
      });
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: TicketNotification) => {
    if (!notification.is_read) {
      markReadMutation.mutate(notification.id);
    }
    setIsOpen(false);
    navigate(
      isAdmin
        ? `/admin/tickets?ticket=${notification.ticket_id}`
        : `/support?ticket=${notification.ticket_id}`,
    );
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t('notifications.justNow', 'Just now');
    if (diffMins < 60)
      return t('notifications.minutesAgo', '{{count}} min ago', { count: diffMins });
    if (diffHours < 24) return t('notifications.hoursAgo', '{{count}} h ago', { count: diffHours });
    return t('notifications.daysAgo', '{{count}} d ago', { count: diffDays });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_ticket':
        return <span className="text-lg">🎫</span>;
      case 'admin_reply':
        return <span className="text-lg">💬</span>;
      case 'user_reply':
        return <span className="text-lg">📨</span>;
      default:
        return <span className="text-lg">🔔</span>;
    }
  };

  const unreadCount = unreadData?.unread_count || 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        size="icon"
        className={`relative rounded-xl border p-2 transition-all duration-200 ${
          isOpen
            ? 'border-border bg-muted text-primary'
            : 'border-border/50 bg-card/50 text-muted-foreground hover:bg-muted hover:text-primary'
        }`}
        title={t('notifications.ticketNotifications', 'Ticket notifications')}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="animate-scale-in-bounce bg-error-500 absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-xs font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="animate-scale-in border-border/50 bg-background/95 fixed right-4 left-4 z-50 mt-0 w-auto overflow-hidden rounded-2xl border shadow-2xl shadow-black/30 backdrop-blur-xl sm:absolute sm:top-auto sm:right-0 sm:left-auto sm:mt-2 sm:w-96"
          style={isMobileFullscreen ? { top: dropdownTop } : undefined}
        >
          {/* Header */}
          <div className="border-border/50 bg-card/30 flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-foreground text-sm font-semibold">
              {t('notifications.ticketNotifications', 'Ticket Notifications')}
            </h3>
            {unreadCount > 0 && (
              <Button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary/70 flex items-center gap-1.5 text-xs transition-colors disabled:opacity-50"
              >
                <CheckIcon />
                {t('notifications.markAllRead', 'Mark all read')}
              </Button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="text-muted-foreground p-8 text-center">
                <div className="border-primary mx-auto h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"></div>
              </div>
            ) : notificationsData?.items && notificationsData.items.length > 0 ? (
              notificationsData.items.map((notification: TicketNotification) => (
                <Button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  variant="ghost"
                  className={`border-border/50 hover:bg-card/50 h-auto w-full justify-start rounded-none border-b px-4 py-3 text-left transition-all duration-200 last:border-b-0 ${
                    !notification.is_read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="bg-card/50 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm leading-relaxed ${!notification.is_read ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                      >
                        {notification.message}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="shrink-0 pt-1">
                        <span className="bg-primary shadow-primary/50 block h-2.5 w-2.5 rounded-full shadow-lg"></span>
                      </div>
                    )}
                  </div>
                </Button>
              ))
            ) : (
              <div className="p-8 text-center">
                <div className="bg-card/50 text-muted-foreground mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
                  <BellIcon />
                </div>
                <p className="text-muted-foreground text-sm">
                  {t('notifications.noNotifications', 'No notifications')}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notificationsData?.items && notificationsData.items.length > 0 && (
            <div className="border-border/50 bg-card/30 border-t px-4 py-3">
              <Button
                onClick={() => {
                  setIsOpen(false);
                  navigate(isAdmin ? '/admin/tickets' : '/support');
                }}
                variant="ghost"
                className="text-primary hover:text-primary/70 w-full py-1 text-center text-sm transition-colors"
              >
                {t('notifications.viewAll', 'View all tickets')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
