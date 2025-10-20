import axiosClient from './axiosClient';

export const roomsApi = {
  create: (data) => axiosClient.post('/rooms/create-room', data),
  update: (roomId, data) => axiosClient.put(`/rooms/update-room/${roomId}`, data),
  delete: (roomId) => axiosClient.delete(`/rooms/delete-room/${roomId}`),

  getById: (roomId) => axiosClient.get(`/rooms/get-room/${roomId}`),
  getAll: () => axiosClient.get('/rooms/get-rooms'),
  getTop: (limit = 6, onlyPublic = false) =>
    axiosClient.get('/rooms/get-top-rooms', { params: { limit, only_public: onlyPublic } }),

  getUsers: (roomId) => axiosClient.get(`/rooms/get-users/${roomId}`),

  search: (text, limit = 20) =>
    axiosClient.get('/rooms/get-search-rooms', { params: { text, limit } }),

  sendJoinRequest: (data) => axiosClient.post('/rooms/create-join-request', data),
  handleJoinRequest: (requestId, accept = false) =>
    axiosClient.post(`/rooms/handle-join-request/${requestId}`, null, {
      params: { accept },
    }),
  getJoinRequestsByRoom: (roomId) => axiosClient.get(`/rooms/get-join-requests-by-room/${roomId}`),
  getJoinRequestsByUser: () => axiosClient.get('/rooms/get-join-requests-by-user'),

  removeUser: (roomId, userId) => axiosClient.delete(`/rooms/remove-user/${roomId}/${userId}`),
  leaveRoom: (roomId) => axiosClient.delete(`/rooms/leave-room/${roomId}`),
};
