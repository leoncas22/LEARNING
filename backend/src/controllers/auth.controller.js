import { asyncHandler } from '../middleware/errorHandler.js';
import { setRefreshTokenCookie, clearRefreshTokenCookie, getRefreshTokenFromRequest } from '../utils/cookies.js';
import * as authService from '../services/auth.service.js';

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  setRefreshTokenCookie(res, refreshToken);
  res.status(200).json({ success: true, message: 'Login successful', data: { user, accessToken } });
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  await authService.logout(refreshToken);
  clearRefreshTokenCookie(res);
  res.status(200).json({ success: true, message: 'Logged out successfully', data: {} });
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  const { user, accessToken, refreshToken: newRefreshToken } = await authService.refreshSession(refreshToken);
  setRefreshTokenCookie(res, newRefreshToken);
  res.status(200).json({ success: true, message: 'Session refreshed', data: { user, accessToken } });
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);
  res.status(200).json({ success: true, message: 'Current user', data: user });
});

export const registerCompany = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.registerCompany(req.body);
  setRefreshTokenCookie(res, refreshToken);
  res.status(201).json({ success: true, message: 'Company registered successfully', data: { user, accessToken } });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  res.status(200).json({
    success: true,
    message: 'If the account exists, a password reset link has been sent.',
    data: {},
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  res.status(200).json({ success: true, message: 'Password has been reset successfully', data: {} });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.body.token);
  res.status(200).json({ success: true, message: 'Email verified successfully', data: {} });
});

export const resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerification(req.body.email);
  res.status(200).json({
    success: true,
    message: 'If the account exists and is unverified, a verification link has been sent.',
    data: {},
  });
});
