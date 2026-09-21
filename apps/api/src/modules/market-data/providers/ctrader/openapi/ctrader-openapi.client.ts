import { Logger } from "@nestjs/common";
import * as protobuf from "protobufjs";
import WebSocket from "ws";

import type {
  CTraderOpenApiClientOptions,
} from "./ctrader-openapi.types";

const APPLICATION_AUTH_REQ = 2100;
const APPLICATION_AUTH_RES = 2101;
const ACCOUNT_AUTH_REQ = 2102;
const ACCOUNT_AUTH_RES = 2103;
const GET_ACCOUNTS_BY_ACCESS_TOKEN_REQ = 2149;
const GET_ACCOUNTS_BY_ACCESS_TOKEN_RES = 2150;
const SYMBOL_BY_ID_REQ = 2116;
const SYMBOL_BY_ID_RES = 2117;
const HEARTBEAT_EVENT = 51;
const ERROR_RES = 2142;

const HEARTBEAT_INTERVAL_MS = 10_000;

interface PendingRequest {
  resolve: (message: OpenApiMessage) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export interface OpenApiMessage {
  payloadType: number;
  payload?: Uint8Array;
  clientMsgId?: string;
}

interface OpenApiErrorResponse {
  errorCode: string;
  description?: string;
  maintenanceEndTimestamp?: string | number;
}

export class CTraderOpenApiClient {
  private readonly logger = new Logger(CTraderOpenApiClient.name);

  private readonly protoRootPromise: Promise<protobuf.Root>;

  private socket: WebSocket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private requestSequence = 0;

  private readonly pending = new Map<string, PendingRequest>();
  private trendbarThrottleTail: Promise<void> = Promise.resolve();

  private connected = false;
  private connectingPromise: Promise<void> | null = null;
  private applicationAuthenticated = false;
  private accountAuthenticated = false;

  constructor(
    private readonly options: CTraderOpenApiClientOptions,
  ) {
    this.protoRootPromise = protobuf.load(
      `${__dirname}/proto/OpenApiMessages.proto`,
    );
  }

  get accountId(): number {
    return this.options.accountId;
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.connectingPromise = this.establishConnection();

    try {
      await this.connectingPromise;
    } finally {
      this.connectingPromise = null;
    }
  }

  private async establishConnection(): Promise<void> {
    await this.protoRootPromise;

    const url = `wss://${this.options.host}:${this.options.port}`;

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(url);

      this.socket = socket;

      const timeout = setTimeout(() => {
        socket.terminate();
        reject(
          new Error(
            `cTrader Open API connection timed out after ${this.options.connectTimeoutMs}ms`,
          ),
        );
      }, this.options.connectTimeoutMs);

      socket.once("open", () => {
        clearTimeout(timeout);
        this.connected = true;

        this.startHeartbeat();

        void this.authenticate()
          .then(() => resolve())
          .catch((error: unknown) => {
            const authError =
              error instanceof Error ? error : new Error(String(error));

            reject(authError);
          });
      });

      socket.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      socket.on("message", (data) => {
        void this.handleMessage(data);
      });

      socket.on("close", () => {
        this.handleDisconnect();
      });

      socket.on("error", (error) => {
        this.logger.error(`cTrader Open API socket error: ${error.message}`);
      });
    });
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();

    const socket = this.socket;

    this.socket = null;
    this.connected = false;
    this.applicationAuthenticated = false;
    this.accountAuthenticated = false;

    if (!socket) {
      return;
    }

    if (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    ) {
      socket.close();
    }

    this.rejectPending(new Error("cTrader Open API client disconnected"));
  }

  async sendRequest(
    payloadType: number,
    payloadTypeName: string,
    request: Record<string, unknown>,
  ): Promise<OpenApiMessage> {
    if (!this.connected || !this.socket) {
      throw new Error("cTrader Open API client is not connected");
    }

    const root = await this.protoRootPromise;

    const requestType = root.lookupType(payloadTypeName);
    const requestMessage = requestType.create(request);
    const payload = requestType.encode(requestMessage).finish();

    const clientMsgId = this.nextClientMessageId();

    const protoMessageType = root.lookupType("ProtoMessage");
    const protoMessage = protoMessageType.create({
      payloadType,
      payload,
      clientMsgId,
    });

    const encoded = protoMessageType.encode(protoMessage).finish();

    return new Promise<OpenApiMessage>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(clientMsgId);
        reject(
          new Error(
            `cTrader Open API request timed out: ${payloadTypeName}`,
          ),
        );
      }, this.options.requestTimeoutMs);

      this.pending.set(clientMsgId, {
        resolve,
        reject,
        timeout,
      });

      this.socket!.send(encoded, (error?: Error) => {
        if (!error) {
          return;
        }

        clearTimeout(timeout);
        this.pending.delete(clientMsgId);
        reject(error);
      });
    });
  }

  async requestSymbolDetails(request: {
    accountId: number;
    symbolIds: number[];
  }): Promise<{
    symbol?: Array<{
      symbolId?: string | number;
      schedule?: Array<{
        startSecond?: string | number;
        endSecond?: string | number;
      }>;
      scheduleTimeZone?: string;
    }>;
  }> {
    await this.connect();

    const response = await this.sendRequest(
      SYMBOL_BY_ID_REQ,
      "ProtoOASymbolByIdReq",
      {
        ctidTraderAccountId: request.accountId,
        symbolId: request.symbolIds,
      },
    );

    if (response.payloadType !== SYMBOL_BY_ID_RES) {
      throw new Error(
        `Unexpected cTrader symbol-details response: ${response.payloadType}`,
      );
    }

    const root = await this.protoRootPromise;
    const responseType = root.lookupType("ProtoOASymbolByIdRes");

    return responseType.decode(
      response.payload ?? new Uint8Array(),
    ) as unknown as {
      symbol?: Array<{
        symbolId?: string | number;
        schedule?: Array<{
          startSecond?: string | number;
          endSecond?: string | number;
        }>;
        scheduleTimeZone?: string;
      }>;
    };
  }

  async requestTrendbars(request: {
    accountId: number;
    symbolId: number;
    period: number;
    fromTimestamp: number;
    toTimestamp: number;
    count?: number;
  }): Promise<{
    trendbar?: Array<{
      volume?: string | number;
      period?: number;
      low?: string | number;
      deltaOpen?: string | number;
      deltaClose?: string | number;
      deltaHigh?: string | number;
      utcTimestampInMinutes?: string | number;
    }>;
    hasMore?: boolean;
  }> {
    await this.connect();

    const minimumIntervalMs = 200;

    let releaseSlot!: () => void;

    const previousSlot = this.trendbarThrottleTail;

    this.trendbarThrottleTail = new Promise<void>((resolve) => {
      releaseSlot = resolve;
    });

    await previousSlot;

    try {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, minimumIntervalMs);
      });

      const response = await this.sendRequest(
      2137,
      "ProtoOAGetTrendbarsReq",
      {
        ctidTraderAccountId: request.accountId,
        fromTimestamp: request.fromTimestamp,
        toTimestamp: request.toTimestamp,
        period: request.period,
        symbolId: request.symbolId,
        ...(request.count !== undefined ? { count: request.count } : {}),
      },
    );

    if (response.payloadType !== 2138) {
      throw new Error(
        `Unexpected cTrader trendbars response: ${response.payloadType}`,
      );
    }

    const root = await this.protoRootPromise;
    const responseType = root.lookupType("ProtoOAGetTrendbarsRes");

    return responseType.decode(
      response.payload ?? new Uint8Array(),
    ) as unknown as {
      trendbar?: Array<{
        volume?: string | number;
        period?: number;
        low?: string | number;
        deltaOpen?: string | number;
        deltaClose?: string | number;
        deltaHigh?: string | number;
        utcTimestampInMinutes?: string | number;
      }>;
      hasMore?: boolean;
    };
    } finally {
      releaseSlot();
    }
  }

  private async authenticate(): Promise<void> {
    const applicationResponse = await this.sendRequest(
      APPLICATION_AUTH_REQ,
      "ProtoOAApplicationAuthReq",
      {
        clientId: this.options.clientId,
        clientSecret: this.options.clientSecret,
      },
    );

    if (applicationResponse.payloadType !== APPLICATION_AUTH_RES) {
      throw new Error(
        `Unexpected cTrader application auth response: ${applicationResponse.payloadType}`,
      );
    }

    this.applicationAuthenticated = true;

    const accountsResponse = await this.sendRequest(
      GET_ACCOUNTS_BY_ACCESS_TOKEN_REQ,
      "ProtoOAGetAccountListByAccessTokenReq",
      {
        accessToken: this.options.accessToken,
      },
    );

    if (accountsResponse.payloadType !== GET_ACCOUNTS_BY_ACCESS_TOKEN_RES) {
      throw new Error(
        `Unexpected cTrader account-list response: ${accountsResponse.payloadType}`,
      );
    }

    const root = await this.protoRootPromise;
    const accountsType = root.lookupType(
      "ProtoOAGetAccountListByAccessTokenRes",
    );

    const accountsPayload = accountsType.decode(
      accountsResponse.payload ?? new Uint8Array(),
    ) as protobuf.Message & {
      ctidTraderAccount?: Array<{
        ctidTraderAccountId?: number | string | { toString(): string };
        isLive?: boolean;
        traderLogin?: number | string | { toString(): string };
        brokerTitleShort?: string;
      }>;
    };

    const accounts = accountsPayload.ctidTraderAccount ?? [];

    if (accounts.length === 0) {
      throw new Error(
        "cTrader access token returned no granted trader accounts",
      );
    }

    this.logger.log(
      `cTrader Open API granted accounts: ${accounts
        .map((account) => {
          const id = account.ctidTraderAccountId?.toString() ?? "unknown";
          const live = account.isLive === true ? "LIVE" : "DEMO";
          const broker = account.brokerTitleShort
            ? ` ${account.brokerTitleShort}`
            : "";
          return `${id} [${live}]${broker}`;
        })
        .join(", ")}`,
    );

    const requestedAccount = accounts.find(
      (account) =>
        account.ctidTraderAccountId?.toString() ===
        String(this.options.accountId),
    );

    const selectedAccount =
      requestedAccount ??
      accounts.find((account) => account.isLive === true) ??
      accounts[0];

    if (!selectedAccount) {
      throw new Error("cTrader returned no trader accounts");
    }

    const selectedAccountId = Number(
      selectedAccount.ctidTraderAccountId?.toString(),
    );

    if (!Number.isSafeInteger(selectedAccountId) || selectedAccountId <= 0) {
      throw new Error("cTrader returned an invalid trader account ID");
    }

    const accountResponse = await this.sendRequest(
      ACCOUNT_AUTH_REQ,
      "ProtoOAAccountAuthReq",
      {
        ctidTraderAccountId: selectedAccountId,
        accessToken: this.options.accessToken,
      },
    );

    if (accountResponse.payloadType !== ACCOUNT_AUTH_RES) {
      throw new Error(
        `Unexpected cTrader account auth response: ${accountResponse.payloadType}`,
      );
    }

    this.accountAuthenticated = true;

    this.logger.log(
      `cTrader Open API account authenticated: ${selectedAccountId}`,
    );
  }

  private async handleMessage(data: WebSocket.RawData): Promise<void> {
    try {
      const bytes = this.toUint8Array(data);

      const root = await this.protoRootPromise;
      const protoMessageType = root.lookupType("ProtoMessage");

      const decoded = protoMessageType.decode(bytes) as protobuf.Message & {
        payloadType: number;
        payload?: Uint8Array;
        clientMsgId?: string;
      };

      const message: OpenApiMessage = {
        payloadType: decoded.payloadType,
        payload: decoded.payload,
        clientMsgId: decoded.clientMsgId,
      };

      if (message.payloadType === HEARTBEAT_EVENT) {
        return;
      }

      if (message.payloadType === ERROR_RES) {
        let error = new Error(
          "cTrader Open API error response",
        );

        if (message.payload) {
          try {
            const errorType = (
              await this.protoRootPromise
            ).lookupType("ProtoErrorRes");

            const decoded =
              errorType.decode(
                message.payload,
              ) as unknown as OpenApiErrorResponse;

            const description = decoded.description
              ? `: ${decoded.description}`
              : "";

            error = new Error(
              `cTrader Open API error [${decoded.errorCode}]${description}`,
            );
          } catch (decodeError) {
            this.logger.warn(
              `Failed to decode cTrader Open API error response: ${
                decodeError instanceof Error
                  ? decodeError.message
                  : String(decodeError)
              }`,
            );
          }
        }

        this.rejectPendingMessage(
          message.clientMsgId,
          error,
        );
        return;
      }

      if (message.clientMsgId) {
        const pending = this.pending.get(message.clientMsgId);

        if (pending) {
          clearTimeout(pending.timeout);
          this.pending.delete(message.clientMsgId);
          pending.resolve(message);
        }
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to decode cTrader Open API message: ${message}`);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (!this.connected || !this.socket) {
        return;
      }

      void this.sendHeartbeat().catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : String(error);

        this.logger.warn(
          `cTrader Open API heartbeat failed: ${message}`,
        );
      });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const root = await this.protoRootPromise;
    const heartbeatType = root.lookupType("ProtoHeartbeatEvent");

    const payload = heartbeatType.encode(
      heartbeatType.create({}),
    ).finish();

    const protoMessageType = root.lookupType("ProtoMessage");

    const protoMessage = protoMessageType.create({
      payloadType: HEARTBEAT_EVENT,
      payload,
    });

    const encoded = protoMessageType.encode(protoMessage).finish();

    this.socket.send(encoded);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleDisconnect(): void {
    this.connected = false;
    this.applicationAuthenticated = false;
    this.accountAuthenticated = false;

    this.stopHeartbeat();
    this.socket = null;

    this.rejectPending(
      new Error("cTrader Open API WebSocket disconnected"),
    );
  }

  private rejectPending(error: Error): void {
    for (const [clientMsgId, pending] of this.pending) {
      clearTimeout(pending.timeout);
      pending.reject(error);
      this.pending.delete(clientMsgId);
    }
  }

  private rejectPendingMessage(
    clientMsgId: string | undefined,
    error: Error,
  ): void {
    if (!clientMsgId) {
      return;
    }

    const pending = this.pending.get(clientMsgId);

    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pending.delete(clientMsgId);
    pending.reject(error);
  }

  private nextClientMessageId(): string {
    this.requestSequence += 1;

    return `rmsm-${Date.now()}-${this.requestSequence}`;
  }

  private toUint8Array(data: WebSocket.RawData): Uint8Array {
    if (data instanceof Uint8Array) {
      return data;
    }

    if (Array.isArray(data)) {
      return Buffer.concat(data);
    }

    return new Uint8Array(data);
  }
}
