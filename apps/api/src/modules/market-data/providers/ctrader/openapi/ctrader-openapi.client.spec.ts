jest.mock("protobufjs", () => ({
  load: jest.fn().mockResolvedValue({}),
}));

jest.mock("ws");

import WebSocket from "ws";

import { CTraderOpenApiClient } from "./ctrader-openapi.client";

describe("CTraderOpenApiClient", () => {
  const MockWebSocket = WebSocket as jest.MockedClass<typeof WebSocket>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createClient(): CTraderOpenApiClient {
    return new CTraderOpenApiClient({
      host: "live.ctraderapi.com",
      port: 5035,
      clientId: "test-client",
      clientSecret: "test-secret",
      accessToken: "test-token",
      accountId: 123,
      connectTimeoutMs: 5_000,
      requestTimeoutMs: 5_000,
    });
  }

  it("shares one in-flight connection across concurrent connect calls", async () => {
    let openHandler: (() => void) | undefined;

    const socket: {
      readyState: number;
      once: jest.Mock;
      on: jest.Mock;
      terminate: jest.Mock;
      close: jest.Mock;
      send: jest.Mock;
    } = {
      readyState: WebSocket.CONNECTING,
      once: jest.fn(
        (event: string, handler: (...args: any[]) => void) => {
          if (event === "open") {
            openHandler = handler;
          }

          return socket;
        },
      ),
      on: jest.fn(() => socket),
      terminate: jest.fn(),
      close: jest.fn(),
      send: jest.fn(),
    };

    MockWebSocket.mockImplementation(
      () => socket as unknown as WebSocket,
    );

    const client = createClient();

    jest
      .spyOn(client as any, "authenticate")
      .mockResolvedValue(undefined);

    const connects = Array.from(
      { length: 10 },
      () => client.connect(),
    );

    await Promise.resolve();

    expect(MockWebSocket).toHaveBeenCalledTimes(1);
    expect(openHandler).toBeDefined();

    openHandler!();

    await Promise.all(connects);

    expect(MockWebSocket).toHaveBeenCalledTimes(1);

    await client.disconnect();
  });

  it("allows a new connection attempt after a previous connection fails", async () => {
    const firstSocket: {
      readyState: number;
      once: jest.Mock;
      on: jest.Mock;
      terminate: jest.Mock;
      close: jest.Mock;
      send: jest.Mock;
    } = {
      readyState: WebSocket.CONNECTING,
      once: jest.fn(
        (event: string, handler: (...args: any[]) => void) => {
          if (event === "error") {
            handler(new Error("simulated connection failure"));
          }

          return firstSocket;
        },
      ),
      on: jest.fn(() => firstSocket),
      terminate: jest.fn(),
      close: jest.fn(),
      send: jest.fn(),
    };

    const secondSocket: {
      readyState: number;
      once: jest.Mock;
      on: jest.Mock;
      terminate: jest.Mock;
      close: jest.Mock;
      send: jest.Mock;
    } = {
      readyState: WebSocket.CONNECTING,
      once: jest.fn(
        (event: string, handler: (...args: any[]) => void) => {
          if (event === "open") {
            handler();
          }

          return secondSocket;
        },
      ),
      on: jest.fn(() => secondSocket),
      terminate: jest.fn(),
      close: jest.fn(),
      send: jest.fn(),
    };

    MockWebSocket
      .mockImplementationOnce(
        () => firstSocket as unknown as WebSocket,
      )
      .mockImplementationOnce(
        () => secondSocket as unknown as WebSocket,
      );

    const client = createClient();

    jest
      .spyOn(client as any, "authenticate")
      .mockResolvedValue(undefined);

    await expect(client.connect()).rejects.toThrow(
      "simulated connection failure",
    );

    expect(MockWebSocket).toHaveBeenCalledTimes(1);

    await expect(client.connect()).resolves.toBeUndefined();

    expect(MockWebSocket).toHaveBeenCalledTimes(2);

    await client.disconnect();
  });
});
