import apiClient from './apiClient';

export async function login(email, password) {
  const res = await apiClient.post('/auth/login', { email, password });
  return res.data.data; // { user, accessToken }
}

export async function logout() {
  await apiClient.post('/auth/logout');
}

export async function fetchCurrentUser() {
  const res = await apiClient.get('/auth/me');
  return res.data.data; // user
}

export async function registerCompany(payload) {
  const res = await apiClient.post('/auth/register-company', payload);
  return res.data.data; // { user, accessToken }
}

export async function forgotPassword(email) {
  const res = await apiClient.post('/auth/forgot-password', { email });
  return res.data.message;
}

export async function resetPassword(token, password, confirmPassword) {
  const res = await apiClient.post('/auth/reset-password', { token, password, confirmPassword });
  return res.data.message;
}

export async function verifyEmail(token) {
  const res = await apiClient.post('/auth/verify-email', { token });
  return res.data.message;
}

export async function resendVerification(email) {
  const res = await apiClient.post('/auth/resend-verification', { email });
  return res.data.message;
}

export default {
  login,
  logout,
  fetchCurrentUser,
  registerCompany,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};
