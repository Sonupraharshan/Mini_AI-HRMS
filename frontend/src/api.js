import axios from 'axios';

let configuredUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Automatically append /api if the user provided just the base Render/Vercel URL
if (configuredUrl && !configuredUrl.endsWith('/api') && !configuredUrl.endsWith('/api/')) {
  configuredUrl = configuredUrl.replace(/\/$/, '') + '/api';
}

const api = axios.create({
  baseURL: configuredUrl, // adjust for production
});

// Add a request interceptor to include JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
