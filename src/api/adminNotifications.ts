import apiClient from './client';

export interface AdminNotification {
  id: number;
  type:
    | 'user_registered'
    | 'payment_completed'
    | 'withdrawal_requested'
    | 'support_ticket'
    | 'error'
    | 'info';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface AdminNotificationsResponse {
  notifications: AdminNotification[];
  total: number;
  unread_count: number;
}

export const adminNotificationsApi = {
  getNotifications: async (
    params: { limit?: number; offset?: number; unread_only?: boolean } = {},
  ): Promise<AdminNotificationsResponse> => {
    try {
      const response = await apiClient.get<AdminNotificationsResponse>(
        '/cabinet/admin/notifications',
        { params },
      );
      return response.data;
    } catch {
      // Return mock data if endpoint doesn't exist yet
      return { notifications: [], total: 0, unread_count: 0 };
    }
  },

  markRead: async (id: number): Promise<void> => {
    try {
      await apiClient.patch(`/cabinet/admin/notifications/${id}/read`);
    } catch {
      /* ignore */
    }
  },

  markAllRead: async (): Promise<void> => {
    try {
      await apiClient.patch('/cabinet/admin/notifications/read-all');
    } catch {
      /* ignore */
    }
  },
};
