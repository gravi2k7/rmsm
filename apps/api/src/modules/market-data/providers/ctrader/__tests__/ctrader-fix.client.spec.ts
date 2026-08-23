import { CTraderFixClient } from "../ctrader-fix.client";
import { CTraderFixMapper } from "../ctrader-fix.mapper";
import type { CTraderFixClientOptions } from "../ctrader-fix.types";

const SOH = "\x01";

function buildOptions(
  overrides: Partial<CTraderFixClientOptions> = {},
): CTraderFixClientOptions {
  return {
    host: "live-uk-eqx-01.p.c-trader.com",
    port: 5211,
    tls: true,
    senderCompId: "live.pepperstone.1027670",
    targetCompId: "CSERVER",
    senderSubId: "QUOTE",
    targetSubId: "QUOTE",
    username: "1027670",
    password: "test-password",
    heartbeatIntervalMs: 30_000,
    connectTimeoutMs: 1_000,
    reconnectDelayMs: 100,
    maxReconnectAttempts: 0,
    resetSequenceOnLogon: true,
    ...overrides,
  };
}

type FakeSocket = {
  destroyed: boolean;
  readable: boolean;
  writable: boolean;
  readableLength: number;
  read: jest.Mock;
  once: jest.Mock;
  on: jest.Mock;
  off: jest.Mock;
  destroy: jest.Mock;
  end: jest.Mock;
  write: jest.Mock;
  emit: (event: string, ...args: unknown[]) => boolean;
};

function buildFakeSocket(): FakeSocket {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  let readableBuffer: Buffer | null = null;

  const socket: FakeSocket = {
    destroyed: false,
    readable: true,
    writable: true,
    readableLength: 0,
    read: jest.fn(() => {
      const chunk = readableBuffer;
      readableBuffer = null;
      socket.readableLength = 0;
      return chunk;
    }),
    once: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    destroy: jest.fn(() => {
      socket.destroyed = true;
    }),
    end: jest.fn(),
    write: jest.fn(),
    emit: (event, ...args) => {
      if (event === "data" && args[0] instanceof Buffer) {
        readableBuffer = args[0];
        socket.readableLength = readableBuffer.length;
      }

      const handlers = listeners.get(event);

      if (!handlers) {
        return false;
      }

      for (const handler of handlers) {
        handler(...args);
      }

      return handlers.size > 0;
    },
  };

  socket.once.mockImplementation(
    (event: string, handler: (...args: unknown[]) => void) => {
      const handlers =
        listeners.get(event) ?? new Set<(...args: unknown[]) => void>();

      const onceHandler = (...args: unknown[]) => {
        handlers.delete(onceHandler);
        handler(...args);
      };

      handlers.add(onceHandler);
      listeners.set(event, handlers);

      return socket;
    },
  );

  socket.on.mockImplementation(
    (event: string, handler: (...args: unknown[]) => void) => {
      const handlers =
        listeners.get(event) ?? new Set<(...args: unknown[]) => void>();

      handlers.add(handler);
      listeners.set(event, handlers);

      return socket;
    },
  );

  socket.off.mockImplementation(
    (event: string, handler: (...args: unknown[]) => void) => {
      listeners.get(event)?.delete(handler);
      return socket;
    },
  );

  return socket;
}

function emitReadableData(
  socket: FakeSocket,
  message: string,
): void {
  socket.emit("data", Buffer.from(message, "ascii"));
  socket.emit("readable");
}

function buildAcceptedLogon(): string {
  const body = [
    "35=A",
    "34=1",
    "49=CSERVER",
    "56=live.pepperstone.1027670",
    "98=0",
  ].join(SOH) + SOH;

  const header =
    `8=FIX.4.4${SOH}` +
    `9=${Buffer.byteLength(body, "ascii")}${SOH}`;

  const withoutChecksum = header + body;

  let checksum = 0;

  for (const byte of Buffer.from(withoutChecksum, "ascii")) {
    checksum += byte;
  }

  checksum %= 256;

  return (
    `${withoutChecksum}` +
    `10=${String(checksum).padStart(3, "0")}${SOH}`
  );
}


function buildSecurityListResponse(
  requestId: string,
): string {
  const fields = [
    "35=y",
    "34=3",
    "49=CSERVER",
    "56=live.pepperstone.1027670",
    "57=QUOTE",
    "52=20260821-06:05:12.161",
    `262=${requestId}`,

    "55=1",
    "1007=EURUSD",
    "1008=5",

    "55=2",
    "1007=XAUUSD",
    "1008=2",

    "55=3",
    "1007=NAS100",
    "1008=1",
  ];

  const body =
    fields.map((field) => `${field}${SOH}`).join("");

  const header =
    `8=FIX.4.4${SOH}` +
    `9=${Buffer.byteLength(body, "ascii")}${SOH}`;

  const withoutChecksum = header + body;

  let checksum = 0;

  for (const byte of Buffer.from(withoutChecksum, "ascii")) {
    checksum += byte;
  }

  checksum %= 256;

  return (
    withoutChecksum +
    `10=${String(checksum).padStart(3, "0")}${SOH}`
  );
}


function buildMarketDataSnapshot(): string {
  return [
    "8=FIX.4.4",
    "35=W",
    "34=2",
    "49=CSERVER",
    "56=live.pepperstone.1027670",
    "57=QUOTE",
    "52=20260821-06:05:11.161",
    "55=1",
    "262=RMSM-EURUSD-1787292311",
    "268=2",
    "269=0",
    "270=1.16936",
    "269=1",
    "270=1.16946",
  ].join(SOH) + SOH;
}

describe("CTraderFixClient", () => {
  const clients: CTraderFixClient[] = [];

  const trackClient = (client: CTraderFixClient): CTraderFixClient => {
    clients.push(client);
    return client;
  };

  afterEach(async () => {
    await Promise.all(
      clients.map(async (client) => {
        try {
          await client.disconnect();
        } catch {
          // Test cleanup must not mask the original assertion failure.
        }
      }),
    );

    clients.length = 0;
  });

  it("resolves connect only after FIX Logon is accepted", async () => {
    const socket = buildFakeSocket();

    const client = trackClient(
      new CTraderFixClient(
        buildOptions({
          connectTimeoutMs: 1_000,
        }),
        new CTraderFixMapper(),
        () => socket as never,
      ),
    );

    const connectPromise = client.connect();

    socket.emit("secureConnect");

    await Promise.resolve();

    expect(socket.write).toHaveBeenCalled();

    let resolved = false;

    void connectPromise.then(() => {
      resolved = true;
    });

    await Promise.resolve();

    expect(resolved).toBe(false);
    expect(client.state.loggedOn).toBe(false);

    const logon = Buffer.from(
      buildAcceptedLogon(),
      "ascii",
    );

    socket.emit("data", logon);
    socket.emit("readable");

    await expect(connectPromise).resolves.toBeUndefined();

    expect(client.state.loggedOn).toBe(true);
  });

  it("rejects connect when the socket closes before FIX Logon", async () => {
    const socket = buildFakeSocket();

    const client = trackClient(
      new CTraderFixClient(
        buildOptions({
          connectTimeoutMs: 1_000,
        }),
        new CTraderFixMapper(),
        () => socket as never,
      ),
    );

    const connectPromise = client.connect();

    await Promise.resolve();

    socket.emit("secureConnect");

    await Promise.resolve();

    socket.emit("close");

    await expect(connectPromise).rejects.toThrow(
      "cTrader FIX connection closed before logon",
    );

    expect(client.state.connected).toBe(false);
    expect(client.state.loggedOn).toBe(false);
  });

  it("rejects connect when FIX Logon is not accepted before timeout", async () => {
    jest.useFakeTimers();

    try {
      const socket = buildFakeSocket();

      const client = trackClient(
        new CTraderFixClient(
          buildOptions({
            connectTimeoutMs: 1_000,
          }),
          new CTraderFixMapper(),
          () => socket as never,
        ),
      );

      const connectPromise = client.connect();

      await Promise.resolve();

      socket.emit("secureConnect");

      await Promise.resolve();

      jest.advanceTimersByTime(1_001);

      await expect(connectPromise).rejects.toThrow(
        "cTrader FIX logon timeout",
      );

      expect(socket.destroy).toHaveBeenCalled();
      expect(client.state.connected).toBe(false);
      expect(client.state.loggedOn).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it("does not create another socket when already logged on", async () => {
    const socket = buildFakeSocket();

    /*
     * FakeSocket intentionally implements only the behavior exercised by
     * CTraderFixClient. The production factory returns a real Node Socket
     * or TLSSocket, so keep the structural cast at the test boundary rather
     * than weakening the production CTraderFixSocketFactory contract.
     */
    const socketFactory = jest.fn(
      () => socket as unknown as import("node:tls").TLSSocket,
    );

    const client = trackClient(
      new CTraderFixClient(
        buildOptions({
          connectTimeoutMs: 1_000,
        }),
        new CTraderFixMapper(),
        socketFactory,
      ),
    );

    const firstConnect = client.connect();

    socket.emit("secureConnect");

    await Promise.resolve();

    expect(socket.write).toHaveBeenCalled();

    emitReadableData(
      socket,
      buildAcceptedLogon(),
    );

    await expect(firstConnect).resolves.toBeUndefined();

    await expect(client.connect()).resolves.toBeUndefined();

    expect(socketFactory).toHaveBeenCalledTimes(1);
    expect(client.state.connected).toBe(true);
    expect(client.state.loggedOn).toBe(true);
  });

  it("requests the full instrument catalog and resolves it from SecurityListResponse", async () => {
    const socket = buildFakeSocket();

    const client = trackClient(
      new CTraderFixClient(
        buildOptions({
          connectTimeoutMs: 1_000,
        }),
        new CTraderFixMapper(),
        () => socket as never,
      ),
    );

    const connectPromise = client.connect();

    socket.emit("secureConnect");

    await Promise.resolve();

    emitReadableData(
      socket,
      buildAcceptedLogon(),
    );

    await expect(connectPromise).resolves.toBeUndefined();

    const catalogPromise = client.requestInstrumentCatalog();

    expect(socket.write).toHaveBeenCalled();

    const requestMessage = socket.write.mock.calls
      .map((call) => call[0])
      .find(
        (message): message is string =>
          typeof message === "string" &&
          message.includes(`35=x${SOH}`),
      );

    expect(requestMessage).toBeDefined();

    const requestFields = requestMessage!
      .split(SOH)
      .filter(Boolean);

    const requestIdField = requestFields.find(
      (field) => field.startsWith("262="),
    );

    expect(requestIdField).toBeDefined();

    const requestId = requestIdField!.slice(4);

    expect(requestId).toMatch(/^SECURITY-LIST-/);

    // Full catalog discovery must not constrain the SecurityListRequest
    // to one provider instrument. Tag 55 is intentionally omitted.
    expect(
      requestFields.some((field) => field.startsWith("55=")),
    ).toBe(false);

    expect(requestFields).toContain("559=0");

    emitReadableData(
      socket,
      buildSecurityListResponse(requestId),
    );

    const catalog = await catalogPromise;

    expect(catalog.requestId).toBe(requestId);
    expect(catalog.instruments).toHaveLength(3);

    expect(catalog.instruments).toEqual([
      {
        providerInstrumentId: "1",
        providerSymbol: "EURUSD",
        name: "EURUSD",
        digits: 5,
      },
      {
        providerInstrumentId: "2",
        providerSymbol: "XAUUSD",
        name: "XAUUSD",
        digits: 2,
      },
      {
        providerInstrumentId: "3",
        providerSymbol: "NAS100",
        name: "NAS100",
        digits: 1,
      },
    ]);
  });

  it("rejects an instrument catalog request when SecurityListResponse times out", async () => {
    jest.useFakeTimers();

    try {
      const socket = buildFakeSocket();

      const client = trackClient(
        new CTraderFixClient(
          buildOptions({
            connectTimeoutMs: 1_000,
          }),
          new CTraderFixMapper(),
          () => socket as never,
        ),
      );

      const connectPromise = client.connect();

      socket.emit("secureConnect");

      await Promise.resolve();

      emitReadableData(
        socket,
        buildAcceptedLogon(),
      );

      await expect(connectPromise).resolves.toBeUndefined();

      const catalogPromise = client.requestInstrumentCatalog(5_000);

      jest.advanceTimersByTime(5_001);

      await expect(catalogPromise).rejects.toThrow(
        "cTrader FIX Security List request timed out",
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it("does not resolve a catalog request for an unrelated SecurityListResponse", async () => {
    jest.useFakeTimers();

    try {
      const socket = buildFakeSocket();

      const client = trackClient(
        new CTraderFixClient(
          buildOptions({
            connectTimeoutMs: 1_000,
          }),
          new CTraderFixMapper(),
          () => socket as never,
        ),
      );

      const connectPromise = client.connect();

      socket.emit("secureConnect");

      await Promise.resolve();

      emitReadableData(
        socket,
        buildAcceptedLogon(),
      );

      await expect(connectPromise).resolves.toBeUndefined();

      const catalogPromise = client.requestInstrumentCatalog(5_000);

      emitReadableData(
        socket,
        buildSecurityListResponse("SECURITY-LIST-UNRELATED"),
      );

      let settled = false;

      void catalogPromise.then(
        () => {
          settled = true;
        },
        () => {
          settled = true;
        },
      );

      await Promise.resolve();

      expect(settled).toBe(false);

      jest.advanceTimersByTime(5_001);

      await expect(catalogPromise).rejects.toThrow(
        "cTrader FIX Security List request timed out",
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it("parses repeated FIX market-data fields into BID and ASK entries", () => {
    const mapper = new CTraderFixMapper();
    const client = new CTraderFixClient(buildOptions(), mapper);

    const quoteListener = jest.fn();

    client.on("quote", quoteListener);

    const handleMessage = (
      client as unknown as {
        handleMessage: (raw: string) => void;
      }
    ).handleMessage;

    handleMessage.call(client, buildMarketDataSnapshot());

    expect(quoteListener).toHaveBeenCalledTimes(1);

    const quote = quoteListener.mock.calls[0]?.[0];

    expect(quote).toBeDefined();
    expect(quote.providerSymbol).toBe("1");
    expect(quote.bidPrice).toBe("1.16936");
    expect(quote.askPrice).toBe("1.16946");
  });

  it("preserves both repeated 269/270 market-data entries", () => {
    const client = new CTraderFixClient(
      buildOptions(),
      new CTraderFixMapper(),
    );

    const parseFields = (
      client as unknown as {
        parseFields: (raw: string) => Array<{
          tag: number;
          value: string;
        }>;
      }
    ).parseFields;

    const fields = parseFields.call(
      client,
      buildMarketDataSnapshot(),
    );

    const entryTypes = fields
      .filter((field) => field.tag === 269)
      .map((field) => field.value);

    const prices = fields
      .filter((field) => field.tag === 270)
      .map((field) => field.value);

    expect(entryTypes).toEqual(["0", "1"]);
    expect(prices).toEqual(["1.16936", "1.16946"]);
  });
});
