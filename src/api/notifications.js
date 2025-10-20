import axiosClient from './axiosClient';

export const notificationsApi = {
  getAll: (unreadOnly = false, limit = 50) =>
    axiosClient.get('/notifications/get-notifications', {
      params: { unread_only: unreadOnly, limit },
    }),

  markAsRead: (notificationId) =>
    axiosClient.put(`/notifications/update-notification/${notificationId}`),

  markAllAsRead: () => axiosClient.put('/notifications/update-notifications/read-all'),

  getUnreadCount: () => axiosClient.get('/notifications/get-notifications-count-unread'),

  delete: (notificationId) =>
    axiosClient.delete(`/notifications/delete-notification/${notificationId}`),
};
