import type {
  AuthTokens,
  AuthUser,
  LoginRequest,
  LoginResponse,
} from "../types/auth";
import { ApiClient } from "./client";

export class AuthApi {
  constructor(private readonly client: ApiClient) {}

  login(request: LoginRequest): Promise<LoginResponse> {
    return this.client.request<LoginResponse>(
      "auth/login",
      {
        method: "POST",
        body: JSON.stringify(request),
      },
      { skipRefresh: true },
    );
  }

  refresh(refreshToken: string): Promise<AuthTokens> {
    return this.client.request<AuthTokens>(
      "auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      },
      { skipRefresh: true },
    );
  }

  logout(refreshToken: string): Promise<void> {
    return this.client.request<void>(
      "auth/logout",
      {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      },
      { skipRefresh: true },
    );
  }

  me(): Promise<AuthUser> {
    return this.client.request<AuthUser>("auth/me");
  }
}
