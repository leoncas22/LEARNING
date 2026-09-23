import { createContext, useCallback, useEffect, useState } from 'react';
import * as authService from '../services/authService';
import { setAccessToken, clearAccessToken } from '../lib/tokenStore';
import { registerAuthFailureHandler } from '../services/apiClient';

export const AuthContext = createContext(null);

const ROLE_HOME = {
  SUPER_ADMIN: '/admin',
  COMPANY_ADMIN: '/hr',
  INSTRUCTOR: '/instructor',
  EMPLOYEE: '/employee',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    clearAccessToken();
    setUser(null);
  }, []);

  // On app start there's no access token in memory yet (page reload wipes
  // it) — try /api/auth/me, which rides the HttpOnly refresh cookie via the
  // response interceptor's 401-refresh-retry path. If that fails, the user
  // simply isn't logged in.
  useEffect(() => {
    let cancelled = false;
    authService
      .fetchCurrentUser()
      .then((current) => {
        if (!cancelled) setUser(current);
      })
      .catch(() => {
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  useEffect(() => {
    registerAuthFailureHandler(clearSession);
  }, [clearSession]);

  const login = useCallback(async (email, password) => {
    const { user: loggedInUser, accessToken } = await authService.login(email, password);
    setAccessToken(accessToken);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const registerCompany = useCallback(async (payload) => {
    const { user: newUser, accessToken } = await authService.registerCompany(payload);
    setAccessToken(accessToken);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    registerCompany,
    logout,
    homePathForRole: (role) => ROLE_HOME[role] ?? '/',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
