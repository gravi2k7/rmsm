export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthUser = {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
};

export type LoginRequest = {
  email: string;
  password: string;
  twoFactorCode?: string;
};

export type LoginResponse =
  | {
      requiresTwoFactor: true;
    }
  | {
      tokens: AuthTokens;
      sessionId: string;
    };

export type RefreshTokenRequest = {
  refreshToken: string;
};

export type ApiAuthError = {
  status: number;
  message: string;
};
