// frontend/src/api.ts
import axios from 'axios';

// Create an instance of Axios
const api = axios.create({
  baseURL: 'http://192.168.0.3:8000', // <-- Swapped to your host machine's local IP
  timeout: 10000,
});

// Write ONE interceptor that injects the authorization token into EVERYTHING automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('user_token'); // Grab your stored login token
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default api;