import { Logger } from "@nestjs/common";

export interface MetaTrader5ClientConfig {
  gatewayUrl: string;
  gatewaySecret: string;
  timeoutMs: number;
  maxRetry: number;
  heartbeatSeconds: number;
}

export interface MetaTrader5Credentials {
  login: string;
  password: string;
  server: string;
  terminalPath?: string;
}

export interface Mt5WorkerEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class MetaTrader5Client {
  private readonly logger = new Logger(MetaTrader5Client.name);

  constructor(private readonly config: MetaTrader5ClientConfig) {}

  async testConnection(
    credentials: MetaTrader5Credentials,
  ): Promise<{
    sessionId: string;
    accountNumber: string;
    server: string;
    connectedAt: string;
  }> {
    const account = await this.request<{
      login: string;
      server: string;
    }>("POST", "/connect", credentials);

    return {
      sessionId: "direct-worker",
      accountNumber: String(account.login),
      server: account.server,
      connectedAt: new Date().toISOString(),
    };
  }

  async connect(): Promise<void> {
    await this.request("GET", "/health");
  }

  async login(
    credentials: MetaTrader5Credentials,
  ): Promise<{
    sessionId: string;
    accountNumber: string;
    server: string;
    connectedAt: string;
  }> {
    return this.testConnection(credentials);
  }

  async logout(): Promise<void> {
    try {
      await this.request("POST", "/disconnect", {});
    } catch (error) {
      this.logger.warn(
        `MT5 worker disconnect failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async reconnect(): Promise<void> {
    await this.connect();
  }

  async ping(): Promise<{
    connected: boolean;
    latencyMs: number;
    terminalAvailable: boolean;
  }> {
    const startedAt = Date.now();

    const health = await this.request<{
      mt5Connected: boolean;
    }>("GET", "/health");

    return {
      connected: Boolean(health.mt5Connected),
      latencyMs: Date.now() - startedAt,
      terminalAvailable: Boolean(health.mt5Connected),
    };
  }

  getSessionId(): string {
    return "direct-worker";
  }

  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const attempts = this.config.maxRetry + 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await this.fetchOnce<T>(method, path, body);
      } catch (error) {
        lastError = error;

        const retryable =
          error instanceof Mt5ClientError &&
          (error.retryable ||
            error.status === 502 ||
            error.status === 503 ||
            error.status === 504);

        if (!retryable || attempt === attempts) {
          throw error;
        }

        await this.sleep(1_000 * 2 ** (attempt - 1));
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("MT5 worker request failed");
  }

  private async fetchOnce<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const baseUrl = this.config.gatewayUrl.replace(/\/+$/, "");
    const url = `${baseUrl}${path}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Gateway-Key": this.config.gatewaySecret,
    };

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs,
    );

    try {
      const response = await fetch(url, {
        method,
        headers,
        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
        signal: controller.signal,
      });

      const parsed = await response.json().catch(() => undefined);

      if (!response.ok) {
        const message =
          parsed &&
          typeof parsed === "object" &&
          typeof (parsed as { error?: unknown }).error === "string"
            ? (parsed as { error: string }).error
            : `MT5 worker returned HTTP ${response.status}`;

        throw new Mt5ClientError(
          message,
          response.status,
          response.status >= 500,
        );
      }

      if (
        !parsed ||
        typeof parsed !== "object" ||
        (parsed as Mt5WorkerEnvelope<T>).success !== true
      ) {
        throw new Mt5ClientError(
          "MT5 worker returned an invalid response.",
          response.status,
          false,
        );
      }

      return (parsed as Mt5WorkerEnvelope<T>).data as T;
    } catch (error) {
      if (error instanceof Mt5ClientError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new Mt5ClientError(
          `MT5 worker request exceeded ${this.config.timeoutMs}ms`,
          undefined,
          true,
        );
      }

      throw new Mt5ClientError(
        error instanceof Error
          ? error.message
          : "MT5 worker network failure",
        undefined,
        true,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class Mt5ClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "Mt5ClientError";
  }
}
