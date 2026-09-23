import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from '../lib/tokenStore';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  // Required so the HttpOnly refresh-token cookie is sent to /api/auth/*.
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- 401 handling with a single-flight refresh queue ---
//
// If five requests fire at once and all get a 401 (access token just
// expired), we must NOT call /api/auth/refresh five times — that would
// race five rotations against the same refresh token, and every request
// after the first would see an already-revoked token. Instead: the first
// 401 triggers exactly one refresh call; every other 401 that arrives
// while that refresh is in flight just waits on the same promise.
let refreshPromise = null;

/**
 * Called by AuthContext once, after it mounts, so this module can trigger
 * a logout (clear state, redirect) without importing React/context code
 * here and creating a circular import.
 */
let onAuthFailure = () => {};
export function registerAuthFailureHandler(handler) {
  onAuthFailure = handler;
}

function requestRefresh() {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post('/auth/refresh')
      .then((res) => {
        const newToken = res.data.data.accessToken;
        setAccessToken(newToken);
        return newToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    const isAuthEndpoint = config?.url?.startsWith('/auth/login') || config?.url?.startsWith('/auth/refresh');

    if (response?.status === 401 && config && !config._retried && !isAuthEndpoint) {
      config._retried = true;
      try {
        const newToken = await requestRefresh();
        config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(config);
      } catch (refreshError) {
        clearAccessToken();
        onAuthFailure();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
