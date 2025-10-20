import axiosClient from './axiosClient';

export const messagesApi = {
  getRecentMessages: (roomId, limit = 200) =>
    axiosClient.get(`/messages/get-recent-messages/${roomId}`, { params: { limit } }),

  sendMessage: (roomId, data) => axiosClient.post(`/messages/create-message/${roomId}`, data),

  editMessage: (messageId, data) => axiosClient.put(`/messages/update-message/${messageId}`, data),

  deleteMessage: (messageId) => axiosClient.delete(`/messages/delete-message/${messageId}`),
};
