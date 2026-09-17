import type { ApiError } from "../types/api";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "../auth/auth-storage";

export type ApiClientConfig = {
  baseUrl: string;
  getAccessToken?: () => Promise<string | null>;
  onSessionExpired?: () => Promise<void> | void;
};

export class ApiClient {
  private refreshPromise: Promise<string | null> | null = null;

  constructor(private readonly config: ApiClientConfig) {}

  private async resolveAccessToken(): Promise<string | null> {
    if (this.config.getAccessToken) {
      return this.config.getAccessToken();
    }

    return getAccessToken();
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<string | null> {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      await this.handleSessionExpired();
      return null;
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl.replace(/\/$/, "")}/auth/refresh`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        },
      );

      if (!response.ok) {
        await this.handleSessionExpired();
        return null;
      }

      const body = (await response.json()) as {
        success?: boolean;
        data?: {
          accessToken: string;
          refreshToken: string;
        };
      };

      if (!body.data?.accessToken || !body.data.refreshToken) {
        await this.handleSessionExpired();
        return null;
      }

      await setTokens(
        body.data.accessToken,
        body.data.refreshToken,
      );

      return body.data.accessToken;
    } catch {
      await this.handleSessionExpired();
      return null;
    }
  }

  private async handleSessionExpired(): Promise<void> {
    await clearTokens();
    await this.config.onSessionExpired?.();
  }

  private async execute<T>(
    path: string,
    options: RequestInit,
    token: string | null,
  ): Promise<{ response: Response; token: string | null }> {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");

    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(
      `${this.config.baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`,
      {
        ...options,
        headers,
      },
    );

    return { response, token };
  }

  private async parseError(response: Response): Promise<ApiError> {
    let message = `Request failed with status ${response.status}`;

    try {
      const body = (await response.json()) as {
        message?: string | string[];
        error?: {
          message?: string | string[];
          details?: {
            message?: string | string[];
          };
        };
      };

      const errorMessage =
        body.error?.message ??
        body.error?.details?.message ??
        body.message;

      if (Array.isArray(errorMessage)) {
        message = errorMessage.join(", ");
      } else if (errorMessage) {
        message = errorMessage;
      }
    } catch {
      // Keep the HTTP status message when the response is not JSON.
    }

    return {
      status: response.status,
      message,
    };
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const body = (await response.json()) as {
      success?: boolean;
      data?: T;
      error?: {
        message?: string | string[];
      };
    };

    if (
      body &&
      typeof body === "object" &&
      "success" in body &&
      "data" in body
    ) {
      return body.data as T;
    }

    return body as T;
  }

  async request<T>(
    path: string,
    options: RequestInit = {},
    requestConfig: { skipRefresh?: boolean } = {},
  ): Promise<T> {
    let token = await this.resolveAccessToken();

    let { response } = await this.execute(path, options, token);

    if (response.status === 401 && !requestConfig.skipRefresh) {
      token = await this.refreshAccessToken();

      if (!token) {
        throw await this.parseError(response);
      }

      ({ response } = await this.execute(path, options, token));
    }

    if (!response.ok) {
      throw await this.parseError(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return this.parseResponse<T>(response);
  }
}
