import type {
  TradovateAccessTokenResponse,
  TradovateAccount,
  TradovateCashBalanceSnapshot,
  TradovateCommandResult,
  TradovateCredentials,
  TradovateFill,
  TradovateOrder,
  TradovatePlaceOrderRequest,
  TradovatePosition,
} from "./tradovate.types";

const DEFAULT_DEMO_BASE_URL = "https://demo.tradovateapi.com/v1";

export class TradovateApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "TradovateApiError";
  }
}

export class TradovateClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  private accessToken: string | null = null;
  private expirationTime = 0;

  constructor(
    private readonly credentials: TradovateCredentials,
    options?: {
      fetchImpl?: typeof fetch;
    },
  ) {
    this.baseUrl = (
      credentials.baseUrl ?? DEFAULT_DEMO_BASE_URL
    ).replace(/\/+$/, "");

    this.fetchImpl = options?.fetchImpl ?? fetch;
  }

  async authenticate(): Promise<TradovateAccessTokenResponse> {
    const response =
      await this.fetchImpl(
        `${this.baseUrl}/auth/accesstokenrequest`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            name: this.credentials.username,
            password: this.credentials.password,
          }),
        },
      );

    const payload =
      (await this.readJson<TradovateAccessTokenResponse>(response));

    if (
      !response.ok ||
      !payload.accessToken
    ) {
      throw new TradovateApiError(
        payload.errorText ??
          `Tradovate authentication failed with HTTP ${response.status}`,
        response.status,
      );
    }

    this.accessToken = payload.accessToken;
    this.expirationTime = payload.expirationTime
      ? Date.parse(payload.expirationTime)
      : Date.now() + 60 * 60 * 1000;

    return payload;
  }

  async testConnection(): Promise<TradovateAccount[]> {
    return this.getAccounts();
  }

  async getAccounts(): Promise<TradovateAccount[]> {
    return this.request<TradovateAccount[]>(
      "/account/list",
      "GET",
    );
  }

  async getCashBalance(
    accountId: number,
  ): Promise<TradovateCashBalanceSnapshot> {
    return this.request<TradovateCashBalanceSnapshot>(
      "/cashBalance/getcashbalancesnapshot",
      "POST",
      { accountId },
    );
  }

  async getOrders(): Promise<TradovateOrder[]> {
    return this.request<TradovateOrder[]>(
      "/order/list",
      "GET",
    );
  }

  async getFills(): Promise<TradovateFill[]> {
    return this.request<TradovateFill[]>(
      "/fill/list",
      "GET",
    );
  }

  async getPositions(): Promise<TradovatePosition[]> {
    return this.request<TradovatePosition[]>(
      "/position/list",
      "GET",
    );
  }

  async placeOrder(
    request: TradovatePlaceOrderRequest,
  ): Promise<TradovateCommandResult> {
    return this.request<TradovateCommandResult>(
      "/order/placeorder",
      "POST",
      request,
    );
  }

  async cancelOrder(
    orderId: number,
    clientOrderId?: string,
  ): Promise<TradovateCommandResult> {
    return this.request<TradovateCommandResult>(
      "/order/cancelorder",
      "POST",
      {
        orderId,
        ...(clientOrderId
          ? { clOrdId: clientOrderId }
          : {}),
        isAutomated: true,
      },
    );
  }

  async modifyOrder(
    request: {
      orderId: number;
      orderQty: number;
      orderType: "Market" | "Limit" | "Stop" | "StopLimit";
      price?: number;
      stopPrice?: number;
      clOrdId?: string;
    },
  ): Promise<TradovateCommandResult> {
    return this.request<TradovateCommandResult>(
      "/order/modifyorder",
      "POST",
      {
        ...request,
        isAutomated: true,
      },
    );
  }

  private async request<T>(
    path: string,
    method: "GET" | "POST",
    body?: unknown,
  ): Promise<T> {
    if (
      !this.accessToken ||
      Date.now() >= this.expirationTime - 60_000
    ) {
      await this.authenticate();
    }

    let response = await this.fetchImpl(
      `${this.baseUrl}${path}`,
      {
        method,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: `Bearer ${this.accessToken}`,
        },
        ...(body === undefined
          ? {}
          : { body: JSON.stringify(body) }),
      },
    );

    if (response.status === 401) {
      await this.authenticate();

      response = await this.fetchImpl(
        `${this.baseUrl}${path}`,
        {
          method,
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            authorization: `Bearer ${this.accessToken}`,
          },
          ...(body === undefined
            ? {}
            : { body: JSON.stringify(body) }),
        },
      );
    }

    const payload = await this.readJson<T>(response);

    if (!response.ok) {
      throw new TradovateApiError(
        `Tradovate request ${path} failed with HTTP ${response.status}`,
        response.status,
      );
    }

    return payload;
  }

  private async readJson<T>(
    response: Response,
  ): Promise<T> {
    try {
      return (await response.json()) as T;
    } catch {
      throw new TradovateApiError(
        "Tradovate returned a non-JSON response.",
        response.status,
      );
    }
  }
}
