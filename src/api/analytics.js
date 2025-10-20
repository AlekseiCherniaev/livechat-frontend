import axiosClient from './axiosClient';

export const analyticsApi = {
  getRoomStats: (roomId) => axiosClient.get(`/analytics/get-room-stats?room_id=${roomId}`),
  getUserActivity: (userId) => axiosClient.get(`/analytics/get-user-activity?user_id=${userId}`),
  getTopActiveRooms: (limit = 50) =>
    axiosClient.get(`/analytics/get-top-active-rooms?limit=${limit}`),
  getMessagesPerMinute: (roomId, sinceMinutes) =>
    axiosClient.get(
      `/analytics/get-message-per-minutes?room_id=${roomId}&since_minutes=${sinceMinutes}`,
    ),
  getUserRetention: (days) => axiosClient.get(`/analytics/get-user-retention?days=${days}`),
  getMessageEditDeleteRatio: () => axiosClient.get('/analytics/get-message-edit-delete-ratio'),
  getTopSocialUsers: (limit) => axiosClient.get(`/analytics/get-top-social-users?limit=${limit}`),
};
