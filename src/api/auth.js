import axiosClient from './axiosClient';

export const authApi = {
  register: (data) => axiosClient.post('/users/register-user', data),
  login: (data) => axiosClient.post('/users/login-user', data),
  logout: () => axiosClient.post('/users/logout-user'),
  getMe: () => axiosClient.get('/users/get-me'),
};
