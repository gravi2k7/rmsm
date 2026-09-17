import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { AuthApi } from "../api/auth";
import { ApiClient } from "../api/client";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "./auth-storage";
import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
} from "../types/auth";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not configured");
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  login: (request: LoginRequest) => Promise<LoginResponse>;
  completeTwoFactorLogin: (
    request: LoginRequest,
  ) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  const apiClient = useMemo(
    () =>
      new ApiClient({
        baseUrl: API_BASE_URL,
        getAccessToken,
        onSessionExpired: () => {
          setUser(null);
          setStatus("unauthenticated");
        },
      }),
    [],
  );

  const authApi = useMemo(() => new AuthApi(apiClient), [apiClient]);

  const restoreSession = useCallback(async () => {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      setStatus("unauthenticated");
      return false;
    }

    try {
      const currentUser = await authApi.me();

      setUser(currentUser);
      setStatus("authenticated");

      return true;
    } catch {
      await clearTokens();
      setUser(null);
      setStatus("unauthenticated");

      return false;
    }
  }, [authApi]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const login = useCallback(
    async (request: LoginRequest): Promise<LoginResponse> => {
      const result = await authApi.login(request);

      if (!("tokens" in result)) {
        return result;
      }

      await setTokens(
        result.tokens.accessToken,
        result.tokens.refreshToken,
      );

      const currentUser = await authApi.me();

      setUser(currentUser);
      setStatus("authenticated");

      return result;
    },
    [authApi],
  );

  const completeTwoFactorLogin = useCallback(
    async (request: LoginRequest): Promise<LoginResponse> => {
      if (!request.twoFactorCode) {
        throw new Error("Two-factor authentication code is required.");
      }

      return login(request);
    },
    [login],
  );

  const logout = useCallback(async () => {
    const refreshToken = await getRefreshToken();

    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } finally {
      await clearTokens();
      setUser(null);
      setStatus("unauthenticated");
    }
  }, [authApi]);

  const refreshSession = useCallback(async () => {
    return restoreSession();
  }, [restoreSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login,
      completeTwoFactorLogin,
      logout,
      refreshSession,
    }),
    [
      status,
      user,
      login,
      completeTwoFactorLogin,
      logout,
      refreshSession,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
