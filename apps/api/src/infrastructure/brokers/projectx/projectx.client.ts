import {
  ProjectXAccountSearchResponse,
  ProjectXApiResponse,
  ProjectXCancelOrderResponse,
  ProjectXContractResponse,
  ProjectXCredentials,
  ProjectXModifyOrderRequest,
  ProjectXOrderSearchResponse,
  ProjectXPlaceOrderRequest,
  ProjectXPlaceOrderResponse,
  ProjectXPositionSearchResponse,
  ProjectXTradeSearchResponse,
  ProjectXValidateResponse,
  ProjectXLoginResponse,
} from "./projectx.types";

const DEFAULT_PROJECTX_BASE_URL = "https://api.topstepx.com";

export class ProjectXApiError extends Error {
  constructor(
    message: string,
    public readonly errorCode?: number,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "ProjectXApiError";
  }
}

export class ProjectXClient {
  private readonly baseUrl: string;
  private token: string | null = null;

  constructor(
    private readonly credentials: ProjectXCredentials,
    options?: {
      fetchImpl?: typeof fetch;
    },
  ) {
    this.baseUrl = (
      credentials.baseUrl ?? DEFAULT_PROJECTX_BASE_URL
    ).replace(/\/+$/, "");

    this.fetchImpl = options?.fetchImpl ?? fetch;
  }

  private readonly fetchImpl: typeof fetch;

  async authenticate(): Promise<ProjectXLoginResponse> {
    const response = await this.request<ProjectXLoginResponse>(
      "/api/Auth/loginKey",
      {
        method: "POST",
        body: {
          userName: this.credentials.username,
          apiKey: this.credentials.apiKey,
        },
        authenticated: false,
      },
    );

    if (!response.success || !response.token) {
      throw new ProjectXApiError(
        response.errorMessage ?? "ProjectX authentication failed",
        response.errorCode,
      );
    }

    this.token = response.token;

    return response;
  }

  async validateSession(): Promise<ProjectXValidateResponse> {
    const response = await this.request<ProjectXValidateResponse>(
      "/api/Auth/validate",
      {
        method: "POST",
        authenticated: true,
      },
    );

    if (!response.success || !response.newToken) {
      throw new ProjectXApiError(
        response.errorMessage ?? "ProjectX session validation failed",
        response.errorCode,
      );
    }

    this.token = response.newToken;

    return response;
  }

  async testConnection(): Promise<ProjectXAccountSearchResponse> {
    if (!this.token) {
      await this.authenticate();
    }

    return this.getAccounts(true);
  }

  async getAccounts(
    onlyActiveAccounts = true,
  ): Promise<ProjectXAccountSearchResponse> {
    return this.request<ProjectXAccountSearchResponse>("/api/Account/search", {
      method: "POST",
      body: {
        onlyActiveAccounts,
      },
      authenticated: true,
    });
  }

  async getAvailableContracts(
    live = false,
  ): Promise<ProjectXContractResponse> {
    return this.request<ProjectXContractResponse>("/api/Contract/available", {
      method: "POST",
      body: {
        live,
      },
      authenticated: true,
    });
  }

  async searchContracts(
    searchText: string,
    live = false,
  ): Promise<ProjectXContractResponse> {
    return this.request<ProjectXContractResponse>("/api/Contract/search", {
      method: "POST",
      body: {
        live,
        searchText,
      },
      authenticated: true,
    });
  }

  async getOpenOrders(accountId: number): Promise<ProjectXOrderSearchResponse> {
    return this.request<ProjectXOrderSearchResponse>("/api/Order/searchOpen", {
      method: "POST",
      body: {
        accountId,
      },
      authenticated: true,
    });
  }

  async getOrders(
    accountId: number,
    startTimestamp: string,
    endTimestamp?: string,
  ): Promise<ProjectXOrderSearchResponse> {
    return this.request<ProjectXOrderSearchResponse>("/api/Order/search", {
      method: "POST",
      body: {
        accountId,
        startTimestamp,
        ...(endTimestamp ? { endTimestamp } : {}),
      },
      authenticated: true,
    });
  }

  async getOpenPositions(
    accountId: number,
  ): Promise<ProjectXPositionSearchResponse> {
    return this.request<ProjectXPositionSearchResponse>(
      "/api/Position/searchOpen",
      {
        method: "POST",
        body: {
          accountId,
        },
        authenticated: true,
      },
    );
  }

  async getTrades(
    accountId: number,
    startTimestamp: string,
    endTimestamp?: string,
  ): Promise<ProjectXTradeSearchResponse> {
    return this.request<ProjectXTradeSearchResponse>("/api/Trade/search", {
      method: "POST",
      body: {
        accountId,
        startTimestamp,
        ...(endTimestamp ? { endTimestamp } : {}),
      },
      authenticated: true,
    });
  }

  async placeOrder(
    request: ProjectXPlaceOrderRequest,
  ): Promise<ProjectXPlaceOrderResponse> {
    return this.request<ProjectXPlaceOrderResponse>("/api/Order/place", {
      method: "POST",
      body: request,
      authenticated: true,
    });
  }

  async cancelOrder(
    accountId: number,
    orderId: number,
  ): Promise<ProjectXCancelOrderResponse> {
    return this.request<ProjectXCancelOrderResponse>("/api/Order/cancel", {
      method: "POST",
      body: {
        accountId,
        orderId,
      },
      authenticated: true,
    });
  }

  async modifyOrder(
    request: ProjectXModifyOrderRequest,
  ): Promise<ProjectXApiResponse> {
    return this.request<ProjectXApiResponse>("/api/Order/modify", {
      method: "POST",
      body: request,
      authenticated: true,
    });
  }

  private async request<T extends ProjectXApiResponse>(
    path: string,
    options: {
      method: "POST";
      body?: unknown;
      authenticated: boolean;
    },
  ): Promise<T> {
    const headers: Record<string, string> = {
      accept: "text/plain",
      "content-type": "application/json",
    };

    if (options.authenticated) {
      if (!this.token) {
        await this.authenticate();
      }

      headers.authorization = `Bearer ${this.token}`;
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: options.method,
      headers,
      body:
        options.body === undefined
          ? undefined
          : JSON.stringify(options.body),
    });

    let payload: T;

    try {
      payload = (await response.json()) as T;
    } catch {
      throw new ProjectXApiError(
        `ProjectX returned a non-JSON response`,
        undefined,
        response.status,
      );
    }

    if (!response.ok) {
      throw new ProjectXApiError(
        payload.errorMessage ??
          `ProjectX request failed with HTTP ${response.status}`,
        payload.errorCode,
        response.status,
      );
    }

    return payload;
  }
}
