import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'http://localhost:8000/api', // TODO replace
  withCredentials: true,
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      let detail = error.response.data.detail || 'Unknown error';

      if (error.response.status === 422 && Array.isArray(detail)) {
        detail = detail.map((d) => `${d.loc.join('.')}: ${d.msg}`).join('; ');
      }

      error.customMessage = detail;
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
