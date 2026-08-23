import { EventEmitter } from "node:events";
import type { Socket } from "node:net";
import type { TLSSocket, ConnectionOptions as TlsConnectionOptions } from "node:tls";
import { connect as tlsConnect } from "node:tls";

import {
  CTRADER_FIX_MESSAGE_TYPES,
  CTRADER_FIX_SOH,
  CTRADER_FIX_TAGS,
  CTRADER_FIX_VERSION,
} from "./ctrader-fix.constants";
import type {
  CTraderFixClientOptions,
  CTraderFixConnectionState,
  CTraderFixFields,
  CTraderInstrumentCatalog,
} from "./ctrader-fix.types";
import { CTraderFixMapper, type CTraderFixSnapshot } from "./ctrader-fix.mapper";
import { parseCTraderSecurityList } from "./ctrader-fix.security-list";

const SOH = CTRADER_FIX_SOH;

type CTraderFixSocket = TLSSocket | Socket;

type CTraderFixSocketFactory = (
  options: TlsConnectionOptions,
) => CTraderFixSocket;

interface PendingInstrumentCatalogRequest {
  readonly resolve: (catalog: CTraderInstrumentCatalog) => void;
  readonly reject: (error: Error) => void;
  readonly timer: NodeJS.Timeout;
}

export class CTraderFixClient extends EventEmitter {
  private socket: TLSSocket | Socket | null = null;
  private buffer = "";
  private sequenceNumber = 1;
  private loggedOn = false;
  private connected = false;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private lastMessageAt: Date | null = null;
  private lastQuoteAt: Date | null = null;

  private readonly quotes = new Map<string, ReturnType<CTraderFixMapper["toNormalizedQuote"]>>();
  /**
   * cTrader FIX market-data snapshots identify the instrument using
   * numeric tag 55 (providerInstrumentId), while RMSM persistence
   * resolves InstrumentAlias by providerSymbol.
   *
   * Keep the subscription mapping so inbound FIX snapshots can be
   * translated back to the RMSM provider symbol before emission.
   */
  private readonly providerInstrumentIdToSymbol = new Map<string, string>();

  private readonly pendingInstrumentCatalogRequests =
    new Map<string, PendingInstrumentCatalogRequest>();

  constructor(
    private readonly options: CTraderFixClientOptions,
    private readonly mapper: CTraderFixMapper = new CTraderFixMapper(),
    private readonly socketFactory: CTraderFixSocketFactory = tlsConnect,
  ) {
    super();
  }

  get state(): CTraderFixConnectionState {
    return {
      connected: this.connected,
      loggedOn: this.loggedOn,
      lastMessageAt: this.lastMessageAt,
      lastQuoteAt: this.lastQuoteAt,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  async connect(): Promise<void> {
    if (this.connected && this.loggedOn) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const socket = this.socketFactory({
        host: this.options.host,
        port: this.options.port,
        servername: this.options.host,
        rejectUnauthorized: true,
      });

      this.socket = socket;

      /*
       * Install socket handlers immediately after socket creation.
       *
       * This must happen BEFORE secureConnect. The cTrader TLS probe
       * confirms that the FIX Logon response is delivered through the
       * paused/readable stream, and application data may already be
       * buffered around the TLS secureConnect transition.
       */
      this.installSocketHandlers(socket);

      console.log(
        "[CTraderFixClient] SOCKET CREATED:",
        `${this.options.host}:${this.options.port}`,
        `tls=${this.options.tls}`,
      );

      console.log(
        "[CTraderFixClient] RUNTIME FIX CONFIG:",
        JSON.stringify({
          host: this.options.host,
          port: this.options.port,
          tls: this.options.tls,
          senderCompId: this.options.senderCompId,
          targetCompId: this.options.targetCompId,
          targetSubId: this.options.targetSubId,
          senderSubId: this.options.senderSubId,
          username: this.options.username,
          passwordLength: this.options.password.length,
          passwordSha256: require("node:crypto")
            .createHash("sha256")
            .update(this.options.password)
            .digest("hex"),
          heartbeatIntervalMs: this.options.heartbeatIntervalMs,
          connectTimeoutMs: this.options.connectTimeoutMs,
          resetSequenceOnLogon: this.options.resetSequenceOnLogon,
        }),
      );

      console.log(
        "[CTraderFixClient] SOCKET INITIAL STATE:",
        JSON.stringify({
          readable: socket.readable,
          writable: socket.writable,
          destroyed: socket.destroyed,
          readableEnded: socket.readableEnded,
          writableEnded: socket.writableEnded,
          readableFlowing: socket.readableFlowing,
          readableLength: socket.readableLength,
          pending: socket.pending,
          connecting: socket.connecting,
          authorized:
            "authorized" in socket
              ? (socket as TLSSocket).authorized
              : undefined,
          protocol:
            "getProtocol" in socket
              ? (socket as TLSSocket).getProtocol()
              : undefined,
        }),
      );

      let settled = false;

      const cleanup = () => {
        clearTimeout(timeout);
        socket.off("error", onError);
        socket.off("close", onClose);
        this.off("loggedOn", onLoggedOn);
      };

      const fail = (error: Error) => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();

        this.socket = null;
        this.connected = false;
        this.loggedOn = false;

        if (!socket.destroyed) {
          socket.destroy();
        }

        reject(error);
      };

      const succeed = () => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();

        this.reconnectAttempts = 0;

        resolve();
      };

      const onLoggedOn = () => {
        console.log("[CTraderFixClient] LOGON ACCEPTED");
        succeed();
      };

      const onClose = () => {
        if (!this.loggedOn) {
          fail(
            new Error(
              "cTrader FIX connection closed before logon",
            ),
          );
          return;
        }

        this.connected = false;
        this.loggedOn = false;
        this.clearHeartbeat();

        this.emit("disconnected");

        if (
          this.reconnectAttempts < this.options.maxReconnectAttempts ||
          this.options.maxReconnectAttempts === 0
        ) {
          this.scheduleReconnect();
        }
      };

      const onError = (error: Error) => {
        fail(error);
      };

      const timeout = setTimeout(() => {
        fail(new Error("cTrader FIX logon timeout"));
      }, this.options.connectTimeoutMs);

      this.once("loggedOn", onLoggedOn);
      socket.once("close", onClose);
      socket.once("error", onError);

      socket.once("secureConnect", () => {
        if (settled) {
          return;
        }

        console.log(
          "[CTraderFixClient] SECURE CONNECT:",
          `readable=${socket.readable}`,
          `writable=${socket.writable}`,
        );

        console.log(
          "[CTraderFixClient] TLS NEGOTIATED STATE:",
          JSON.stringify({
            protocol:
              "getProtocol" in socket
                ? (socket as TLSSocket).getProtocol()
                : undefined,
            authorized:
              "authorized" in socket
                ? (socket as TLSSocket).authorized
                : undefined,
            authorizationError:
              "authorizationError" in socket
                ? (socket as TLSSocket).authorizationError
                : undefined,
            encrypted:
              "encrypted" in socket
                ? (socket as TLSSocket).encrypted
                : undefined,
            readable: socket.readable,
            writable: socket.writable,
            destroyed: socket.destroyed,
            readableEnded: socket.readableEnded,
            writableEnded: socket.writableEnded,
            readableFlowing: socket.readableFlowing,
            readableLength: socket.readableLength,
            pending: socket.pending,
            connecting: socket.connecting,
          }),
        );

        this.connected = true;

        this.sendLogon();

        setTimeout(() => {
          console.log(
            "[CTraderFixClient] POST-LOGON MANUAL READ STATE:",
            JSON.stringify({
              readable: socket.readable,
              readableFlowing: socket.readableFlowing,
              readableLength: socket.readableLength,
              readableEnded: socket.readableEnded,
              destroyed: socket.destroyed,
            }),
          );

          let chunk: Buffer | null;

          while ((chunk = socket.read()) !== null) {
            console.log(
              "[CTraderFixClient] POST-LOGON MANUAL READ:",
              `bytes=${chunk.length}`,
            );

            const raw = chunk.toString("ascii");

            console.log(
              "[CTraderFixClient] POST-LOGON MANUAL RAW:",
              raw
                .replace(/\\x01/g, "|")
                .replace(/554=[^|]*/g, "554=***"),
            );

            this.buffer += raw;
            this.processBuffer();
          }
        }, 1000);

        setTimeout(() => {
          console.log(
            "[CTraderFixClient] POST-LOGON STREAM STATE:",
            JSON.stringify({
              readable: socket.readable,
              writable: socket.writable,
              readableFlowing: socket.readableFlowing,
              readableLength: socket.readableLength,
              readableEnded: socket.readableEnded,
              writableEnded: socket.writableEnded,
              destroyed: socket.destroyed,
              dataListeners: socket.listenerCount("data"),
              readableListeners: socket.listenerCount("readable"),
              endListeners: socket.listenerCount("end"),
              closeListeners: socket.listenerCount("close"),
              errorListeners: socket.listenerCount("error"),
            }),
          );
        }, 1000);
      });
    });
  }

  async disconnect(): Promise<void> {
    this.clearTimers();

    const socket = this.socket;

    this.socket = null;
    this.connected = false;
    this.loggedOn = false;

    if (!socket) {
      return;
    }

    if (!socket.destroyed) {
      try {
        this.sendLogout(socket);
      } catch {
        // The connection may already be half-closed.
      }

      socket.end();
    }
  }

  async subscribe(
    providerSymbol: string,
    requestId: string,
    providerInstrumentId: string,
  ): Promise<void> {
    if (!this.connected) {
      throw new Error("cTrader FIX connection is not connected");
    }

    if (!this.loggedOn) {
      throw new Error("cTrader FIX logon has not been accepted");
    }

    if (!/^\d+$/.test(providerInstrumentId)) {
      throw new Error(
        `cTrader FIX subscription requires numeric providerInstrumentId for ${providerSymbol}, got ${providerInstrumentId}`,
      );
    }

    const message = this.buildMessage([
      [CTRADER_FIX_TAGS.MSG_TYPE, CTRADER_FIX_MESSAGE_TYPES.MARKET_DATA_REQUEST],
      [CTRADER_FIX_TAGS.MD_REQ_ID, requestId],
      [CTRADER_FIX_TAGS.SUBSCRIPTION_REQUEST_TYPE, "1"],
      [CTRADER_FIX_TAGS.MARKET_DEPTH, "1"],
      [CTRADER_FIX_TAGS.MD_UPDATE_TYPE, "1"],
      [CTRADER_FIX_TAGS.NO_RELATED_SYM, "1"],
      [CTRADER_FIX_TAGS.SYMBOL, providerInstrumentId],
      [267, "2"],
      [269, "0"],
      [269, "1"],
    ]);

    this.providerInstrumentIdToSymbol.set(
      providerInstrumentId,
      providerSymbol,
    );

    console.log(
      "[CTraderFixClient] TX MARKET DATA REQUEST:",
      message.replace(/\x01/g, "|"),
    );

    this.write(message);
  }

  async requestInstrumentCatalog(
    timeoutMs = this.options.connectTimeoutMs,
  ): Promise<CTraderInstrumentCatalog> {
    if (!this.connected) {
      throw new Error("cTrader FIX connection is not connected");
    }

    if (!this.loggedOn) {
      throw new Error("cTrader FIX logon has not been accepted");
    }

    const requestId = `SECURITY-LIST-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    console.log(
      "[CTraderFixClient] SECURITY LIST REQUEST START:",
      JSON.stringify({
        connected: this.connected,
        loggedOn: this.loggedOn,
        requestId,
        timeoutMs,
        sequenceNumber: this.sequenceNumber,
      }),
    );

    return new Promise<CTraderInstrumentCatalog>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingInstrumentCatalogRequests.delete(requestId);

        reject(
          new Error(
            `cTrader FIX Security List request timed out: ${requestId}`,
          ),
        );
      }, timeoutMs);

      this.pendingInstrumentCatalogRequests.set(requestId, {
        resolve,
        reject,
        timer,
      });

      try {
        const securityListMessage = this.buildMessage([
          [
            CTRADER_FIX_TAGS.MSG_TYPE,
            CTRADER_FIX_MESSAGE_TYPES.SECURITY_LIST_REQUEST,
          ],
          [320, requestId],
          [559, "0"],
        ]);

        console.log(
          "[CTraderFixClient] TX SECURITY LIST:",
          securityListMessage
            .replace(/\\x01/g, "|")
            .replace(/554=[^|]*/g, "554=***"),
        );

        console.log(
          "[CTraderFixClient] TX SECURITY LIST STATE:",
          JSON.stringify({
            bytes: Buffer.byteLength(securityListMessage, "ascii"),
            socketDestroyed: this.socket?.destroyed,
            socketWritable: this.socket?.writable,
            sequenceNumber: this.sequenceNumber,
          }),
        );

        this.write(securityListMessage);

        console.log(
          "[CTraderFixClient] TX SECURITY LIST WRITE COMPLETE:",
          JSON.stringify({
            sequenceNumber: this.sequenceNumber,
          }),
        );
      } catch (error) {
        clearTimeout(timer);
        this.pendingInstrumentCatalogRequests.delete(requestId);

        reject(
          error instanceof Error
            ? error
            : new Error(String(error)),
        );
      }
    });
  }

  getLatestQuote(providerSymbol: string) {
    return this.quotes.get(providerSymbol);
  }

  private installSocketHandlers(
    socket: TLSSocket | Socket,
  ): void {
    /*
     * cTrader FIX responses arrive correctly on the Node readable stream.
     *
     * Do NOT install a "data" listener here. A data listener switches the
     * stream into flowing mode. cTrader's response is available through
     * socket.read() while the stream remains in paused/readable mode.
     *
     * FIX messages may arrive split across multiple TCP/TLS chunks, so
     * every readable chunk is appended to this.buffer and processBuffer()
     * extracts complete FIX messages.
     */
    socket.on("readable", () => {
      let chunk: Buffer | null;

      while ((chunk = socket.read()) !== null) {
        console.log(
          "[CTraderFixClient] RX DATA:",
          `bytes=${chunk.length}`,
        );

        const raw = chunk.toString("ascii");

        console.log(
          "[CTraderFixClient] RX RAW:",
          raw
            .replace(/\x01/g, "|")
            .replace(/554=[^|]*/g, "554=***"),
        );

        this.buffer += raw;
        this.processBuffer();
      }
    });

    socket.on("error", (error: Error) => {
      console.error(
        "[CTraderFixClient] SOCKET ERROR:",
        error.message,
      );

      this.emit("error", error);
    });

    socket.on("end", () => {
      console.error("[CTraderFixClient] SOCKET END");
    });

    socket.on("close", (hadError: boolean) => {
      console.error(
        "[CTraderFixClient] SOCKET CLOSE:",
        `hadError=${hadError}`,
      );

      this.connected = false;
      this.loggedOn = false;
      this.clearHeartbeat();

      this.emit("disconnected");

      if (
        this.reconnectAttempts < this.options.maxReconnectAttempts ||
        this.options.maxReconnectAttempts === 0
      ) {
        this.scheduleReconnect();
      }
    });
  }

  private processBuffer(): void {
    while (true) {
      const message = this.extractMessage();

      if (!message) {
        return;
      }

      console.log(
        "[CTraderFixClient] RX FIX MESSAGE:",
        message
          .replace(/\x01/g, "|")
          .replace(/554=[^|]*/g, "554=***"),
      );

      this.lastMessageAt = new Date();
      this.handleMessage(message);
    }
  }

  private extractMessage(): string | null {
    const begin =
      `8=${CTRADER_FIX_VERSION}${SOH}${CTRADER_FIX_TAGS.BODY_LENGTH}=`;

    const start = this.buffer.indexOf(begin);

    if (start < 0) {
      this.buffer = "";
      return null;
    }

    if (start > 0) {
      this.buffer = this.buffer.slice(start);
    }

    const bodyLengthStart = begin.length;
    const bodyLengthEnd = this.buffer.indexOf(
      SOH,
      bodyLengthStart,
    );

    if (bodyLengthEnd < 0) {
      return null;
    }

    const bodyLength = Number(
      this.buffer.slice(bodyLengthStart, bodyLengthEnd),
    );

    if (!Number.isFinite(bodyLength) || bodyLength < 0) {
      throw new Error("Invalid FIX body length");
    }

    /*
     * FIX BodyLength (tag 9) is measured in bytes, not JavaScript
     * string characters.
     *
     * Convert the complete buffered message to ASCII bytes before
     * locating the checksum boundary. cTrader FIX is ASCII here.
     */
    const encoded = Buffer.from(this.buffer, "ascii");

    const headerText = this.buffer.slice(0, bodyLengthEnd + 1);
    const bodyStartBytes = Buffer.byteLength(
      headerText,
      "ascii",
    );

    const checksumStartBytes =
      bodyStartBytes + bodyLength;

    /*
     * We need at least:
     *
     *   10=000<SOH>
     *
     * after the FIX body.
     */
    if (encoded.length < checksumStartBytes + 7) {
      return null;
    }

    const checksumPrefix = Buffer.from(
      `${CTRADER_FIX_TAGS.CHECK_SUM}=`,
      "ascii",
    );

    const checksumStartIndex = encoded.indexOf(
      checksumPrefix,
      checksumStartBytes,
    );

    if (checksumStartIndex < 0) {
      return null;
    }

    const checksumEnd = encoded.indexOf(
      SOH,
      checksumStartIndex + checksumPrefix.length,
    );

    if (checksumEnd < 0) {
      return null;
    }

    const endBytes = checksumEnd + 1;

    const message = encoded
      .subarray(0, endBytes)
      .toString("ascii");

    /*
     * Keep the string buffer synchronized with the byte boundary.
     */
    this.buffer = encoded
      .subarray(endBytes)
      .toString("ascii");

    return message;
  }

  private handleMessage(raw: string): void {
    const fields = this.parseFields(raw);

    const type = this.firstField(
      fields,
      CTRADER_FIX_TAGS.MSG_TYPE,
    );

    switch (type) {
      case CTRADER_FIX_MESSAGE_TYPES.LOGON:
        this.handleLogon(fields);
        return;

      case CTRADER_FIX_MESSAGE_TYPES.HEARTBEAT:
        return;

      case CTRADER_FIX_MESSAGE_TYPES.TEST_REQUEST:
        this.handleTestRequest(fields);
        return;

      case CTRADER_FIX_MESSAGE_TYPES.MARKET_DATA_SNAPSHOT:
        this.handleMarketDataSnapshot(fields);
        return;

      case CTRADER_FIX_MESSAGE_TYPES.SECURITY_LIST_RESPONSE:
        this.handleSecurityListResponse(fields);
        return;

      case CTRADER_FIX_MESSAGE_TYPES.LOGOUT:
        this.emit(
          "error",
          new Error(
            `cTrader FIX logout received: ${this.firstField(fields, 58) ?? "unknown"}`,
          ),
        );
        return;

      default:
        this.emit("message", fields);
    }
  }

  private handleLogon(fields: CTraderFixFields): void {
    if (this.firstField(fields, CTRADER_FIX_TAGS.ENCRYPT_METHOD) === "0") {
      this.loggedOn = true;
      this.startHeartbeat();
      this.emit("loggedOn");
    }
  }

  private handleTestRequest(fields: CTraderFixFields): void {
    const testRequestId = this.firstField(fields, 112);

    this.write(
      this.buildMessage([
        [CTRADER_FIX_TAGS.MSG_TYPE, CTRADER_FIX_MESSAGE_TYPES.HEARTBEAT],
        ...(testRequestId ? [[112, testRequestId] as [number, string]] : []),
      ]),
    );
  }

  private handleSecurityListResponse(fields: CTraderFixFields): void {
    const requestId = this.firstField(
      fields,
      CTRADER_FIX_TAGS.SECURITY_REQ_ID,
    );

    if (!requestId) {
      this.emit("message", fields);
      return;
    }

    console.log(
      "[CTraderFixClient] SECURITY LIST RESPONSE CORRELATION:",
      JSON.stringify({
        requestId,
        pendingCount: this.pendingInstrumentCatalogRequests.size,
        pendingRequestIds: Array.from(
          this.pendingInstrumentCatalogRequests.keys(),
        ),
        fieldCount: fields.length,
        fields: fields.map((field) => ({
          tag: field.tag,
          value:
            field.tag === 554
              ? "<redacted>"
              : field.value,
        })),
      }),
    );

    const pending = this.pendingInstrumentCatalogRequests.get(requestId);

    if (!pending) {
      console.log(
        "[CTraderFixClient] SECURITY LIST RESPONSE UNMATCHED:",
        requestId,
      );

      this.emit("message", fields);
      return;
    }

    console.log(
      "[CTraderFixClient] SECURITY LIST RESPONSE MATCHED:",
      requestId,
    );

    this.pendingInstrumentCatalogRequests.delete(requestId);
    clearTimeout(pending.timer);

    try {
      const catalog = parseCTraderSecurityList(fields);

      console.log(
        "[CTraderFixClient] SECURITY LIST CATALOG:",
        JSON.stringify(
          catalog.instruments.map((entry) => ({
            providerInstrumentId: entry.providerInstrumentId,
            providerSymbol: entry.providerSymbol,
          })),
        ),
      );

      pending.resolve(catalog);
    } catch (error) {
      pending.reject(
        error instanceof Error
          ? error
          : new Error(String(error)),
      );
    }
  }

  private handleMarketDataSnapshot(fields: CTraderFixFields): void {
    const providerInstrumentId = this.firstField(
      fields,
      CTRADER_FIX_TAGS.SYMBOL,
    );

    if (!providerInstrumentId) {
      return;
    }

    const providerSymbol =
      this.providerInstrumentIdToSymbol.get(providerInstrumentId) ??
      providerInstrumentId;

    if (providerSymbol === providerInstrumentId) {
      console.warn(
        "[CTraderFixClient] MARKET DATA SYMBOL MAPPING MISSING:",
        JSON.stringify({
          providerInstrumentId,
          knownMappings: Array.from(
            this.providerInstrumentIdToSymbol.entries(),
          ),
        }),
      );
    }

    const entries: Array<{
      type: string;
      price?: string;
      size?: string;
    }> = [];

    let currentEntry:
      | {
          type: string;
          price?: string;
          size?: string;
        }
      | undefined;

    for (const field of fields) {
      if (field.tag === CTRADER_FIX_TAGS.MD_ENTRY_TYPE) {
        if (currentEntry) {
          entries.push(currentEntry);
        }

        currentEntry = {
          type: field.value,
        };

        continue;
      }

      if (!currentEntry) {
        continue;
      }

      if (field.tag === CTRADER_FIX_TAGS.MD_ENTRY_PX) {
        currentEntry.price = field.value;
      }

      if (field.tag === CTRADER_FIX_TAGS.MD_ENTRY_SIZE) {
        currentEntry.size = field.value;
      }
    }

    if (currentEntry) {
      entries.push(currentEntry);
    }

    const snapshot: CTraderFixSnapshot = {
      providerSymbol,
      entries,
      eventTime: new Date(),
    };

    const quote = this.mapper.toNormalizedQuote(snapshot);

    this.quotes.set(providerSymbol, quote);
    this.lastQuoteAt = new Date();

    this.emit("quote", quote);
  }

  private sendLogon(): void {
    /*
     * cTrader FIX Logon.
     *
     * Keep this identical to the standalone TLS/FIX probe that
     * successfully received the cServer Logon response.
     *
     * Do NOT send 141=ResetSeqNumFlag here.
     */
    const fields: Array<[number, string]> = [
      [CTRADER_FIX_TAGS.MSG_TYPE, CTRADER_FIX_MESSAGE_TYPES.LOGON],
      [CTRADER_FIX_TAGS.ENCRYPT_METHOD, "0"],
      [
        CTRADER_FIX_TAGS.HEART_BT_INT,
        String(Math.floor(this.options.heartbeatIntervalMs / 1000)),
      ],
      ...(this.options.resetSequenceOnLogon
        ? [[141, "Y"] as [number, string]]
        : []),
      [CTRADER_FIX_TAGS.USERNAME, this.options.username],
      [CTRADER_FIX_TAGS.PASSWORD, this.options.password],
    ];

    const message = this.buildMessage(fields);
    const encoded = Buffer.from(message, "ascii");

    console.log(
      "[CTraderFixClient] TX LOGON:",
      message
        .replace(/\x01/g, "|")
        .replace(/554=[^|]*/g, "554=***"),
    );

    console.log(
      "[CTraderFixClient] TX LOGON BYTES:",
      encoded.length,
      `socketDestroyed=${this.socket?.destroyed}`,
      `socketWritable=${this.socket?.writable}`,
    );

    if (!this.socket || this.socket.destroyed || !this.socket.writable) {
      throw new Error("cTrader FIX socket is not writable during logon");
    }

    this.socket.write(encoded, () => {
      console.log("[CTraderFixClient] TX LOGON WRITE COMPLETE");

      console.log(
        "[CTraderFixClient] POST-WRITE SOCKET STATE:",
        JSON.stringify({
          readable: this.socket?.readable,
          writable: this.socket?.writable,
          readableFlowing: this.socket?.readableFlowing,
          readableLength: this.socket?.readableLength,
          destroyed: this.socket?.destroyed,
          dataListeners: this.socket?.listenerCount("data"),
          readableListeners: this.socket?.listenerCount("readable"),
          endListeners: this.socket?.listenerCount("end"),
          closeListeners: this.socket?.listenerCount("close"),
          errorListeners: this.socket?.listenerCount("error"),
        }),
      );
    });

    this.sequenceNumber += 1;
  }

  private sendLogout(socket: TLSSocket | Socket): void {
    socket.write(
      this.buildMessage([
        [CTRADER_FIX_TAGS.MSG_TYPE, CTRADER_FIX_MESSAGE_TYPES.LOGOUT],
      ]),
    );
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (!this.connected || !this.loggedOn) {
        return;
      }

      this.write(
        this.buildMessage([
          [CTRADER_FIX_TAGS.MSG_TYPE, CTRADER_FIX_MESSAGE_TYPES.HEARTBEAT],
        ]),
      );
    }, this.options.heartbeatIntervalMs);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectAttempts += 1;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;

      try {
        await this.connect();
      } catch (error) {
        this.emit("error", error);
        this.scheduleReconnect();
      }
    }, this.options.reconnectDelayMs);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private write(message: string, incrementSequence = true): void {
    if (!this.socket || this.socket.destroyed) {
      throw new Error("cTrader FIX socket is unavailable");
    }

    this.socket.write(message);

    if (incrementSequence) {
      this.sequenceNumber += 1;
    }
  }

  private buildMessage(fields: Array<[number, string]>): string {
    const normalized = fields.filter(
      ([tag, value]) => value !== undefined && value !== "",
    );

    const msgType = normalized.find(
      ([tag]) => tag === CTRADER_FIX_TAGS.MSG_TYPE,
    );

    if (!msgType) {
      throw new Error("cTrader FIX message type is required");
    }

    /*
     * cTrader FIX requires the standard header fields in protocol order.
     *
     * Required header order:
     *   35 MsgType
     *   49 SenderCompID
     *   56 TargetCompID
     *   34 MsgSeqNum
     *   52 SendingTime
     *   57 TargetSubID
     *   50 SenderSubID
     *
     * The Logon/application body fields follow afterward.
     */
    const standardHeaderTags = new Set<number>([
      CTRADER_FIX_TAGS.MSG_TYPE,
      CTRADER_FIX_TAGS.SENDER_COMP_ID,
      CTRADER_FIX_TAGS.TARGET_COMP_ID,
      CTRADER_FIX_TAGS.MSG_SEQ_NUM,
      CTRADER_FIX_TAGS.SENDING_TIME,
      CTRADER_FIX_TAGS.TARGET_SUB_ID,
      CTRADER_FIX_TAGS.SENDER_SUB_ID,
    ]);

    const bodyFields: Array<[number, string]> = [
      msgType,
      [CTRADER_FIX_TAGS.SENDER_COMP_ID, this.options.senderCompId],
      [CTRADER_FIX_TAGS.TARGET_COMP_ID, this.options.targetCompId],
      [CTRADER_FIX_TAGS.MSG_SEQ_NUM, String(this.sequenceNumber)],
      [CTRADER_FIX_TAGS.SENDING_TIME, this.fixTimestamp()],
      ...(this.options.targetSubId
        ? [[
            CTRADER_FIX_TAGS.TARGET_SUB_ID,
            this.options.targetSubId,
          ] as [number, string]]
        : []),
      [CTRADER_FIX_TAGS.SENDER_SUB_ID, this.options.senderSubId],
      ...normalized.filter(
        ([tag]) =>
          !standardHeaderTags.has(tag),
      ),
    ];

    const body = bodyFields
      .map(([tag, value]) => `${tag}=${value}`)
      .join(SOH) + SOH;

    const header =
      `8=${CTRADER_FIX_VERSION}${SOH}` +
      `${CTRADER_FIX_TAGS.BODY_LENGTH}=${Buffer.byteLength(body, "ascii")}${SOH}`;

    const withoutChecksum = header + body;

    let checksum = 0;

    for (const byte of Buffer.from(withoutChecksum, "ascii")) {
      checksum += byte;
    }

    checksum %= 256;

    return (
      `${withoutChecksum}` +
      `${CTRADER_FIX_TAGS.CHECK_SUM}=${String(checksum).padStart(3, "0")}${SOH}`
    );
  }

  private parseFields(raw: string): CTraderFixFields {
    const fields: Array<{ tag: number; value: string }> = [];

    for (const field of raw.split(SOH)) {
      if (!field) {
        continue;
      }

      const separator = field.indexOf("=");

      if (separator <= 0) {
        continue;
      }

      const tag = Number(field.slice(0, separator));

      if (!Number.isInteger(tag)) {
        continue;
      }

      fields.push({
        tag,
        value: field.slice(separator + 1),
      });
    }

    return fields;
  }

  private firstField(
    fields: CTraderFixFields,
    tag: number,
  ): string | undefined {
    return fields.find((field) => field.tag === tag)?.value;
  }

  private fixTimestamp(): string {
    const now = new Date();

    const pad = (value: number, length = 2) =>
      String(value).padStart(length, "0");

    return (
      `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-` +
      `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}.` +
      `${pad(now.getUTCMilliseconds(), 3)}`
    );
  }
}
