import axiosClient from '../axiosClient';

export const webSocketApi = {
  getActiveUsers: (roomId) => axiosClient.get(`/ws/get-active-user-ids/${roomId}`),

  disconnectUser: (roomId, userId) => axiosClient.delete(`/ws/disconnect-user/${roomId}/${userId}`),
};
