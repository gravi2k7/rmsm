import { CTraderFixClient } from "../ctrader-fix.client";
import { CTraderOpenApiClient } from "../openapi/ctrader-openapi.client";
import { CTraderOpenApiClientFactory } from "../ctrader-fix.module";
import { MarketDataProviderConfigRepository } from "../../../repositories/market-data-provider-config.repository";
import { Test } from "@nestjs/testing";
import type { Env } from "@rmsm/config";

import { APP_CONFIG } from "../../../../../config/app-config.module";
import { ProviderFactoryService } from "../../provider-factory.service";
import { ProviderRegistryService } from "../../provider-registry.service";
import {
  CTraderFixClientFactory,
  CTraderFixRegistrarService,
  cTraderFixClientProvider,
} from "../ctrader-fix.module";

function buildEnv(overrides: Partial<Env> = {}): Env {
  return {
    NODE_ENV: "test",

    CTRADER_FIX_HOST: "fix.test.example",
    CTRADER_FIX_PORT: 5211,
    CTRADER_FIX_TLS: true,
    CTRADER_FIX_SENDER_COMP_ID: "RMSM",
    CTRADER_FIX_TARGET_COMP_ID: "cTrader",
    CTRADER_FIX_SENDER_SUB_ID: "RMSM_SUB",
    CTRADER_FIX_TARGET_SUB_ID: "CTRADER_SUB",
    CTRADER_FIX_USERNAME: "test-user",
    CTRADER_FIX_PASSWORD: "test-password",
    CTRADER_FIX_HEARTBEAT_INTERVAL: 30000,
    CTRADER_FIX_CONNECT_TIMEOUT: 10000,
    CTRADER_FIX_RECONNECT_DELAY: 5000,
    CTRADER_FIX_MAX_RECONNECT_ATTEMPTS: 0,
    CTRADER_FIX_LOGON_RESET_SEQUENCE: true,

    ...overrides,
  } as Env;
}

describe("CTraderFixRegistrarService Nest DI", () => {
  it("instantiates through Nest and registers CTRADER during module initialization", async () => {
    const env = buildEnv();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProviderRegistryService,
        ProviderFactoryService,
        {
          provide: MarketDataProviderConfigRepository,
          useValue: {
            findByType: jest.fn().mockResolvedValue(undefined),
          },
        },
        CTraderOpenApiClientFactory,
        {
          provide: CTraderOpenApiClient,
          inject: [CTraderOpenApiClientFactory],
          useFactory: (factory: CTraderOpenApiClientFactory) =>
            factory.create(),
        },
        CTraderFixClientFactory,
        {
          provide: CTraderFixClient,
          useValue: {
            connect: jest.fn().mockResolvedValue(undefined),
            disconnect: jest.fn().mockResolvedValue(undefined),
          },
        },
        CTraderFixRegistrarService,
        {
          provide: APP_CONFIG,
          useValue: env,
        },
      ],
    }).compile();

    const registrar = moduleRef.get(CTraderFixRegistrarService);
    const registry = moduleRef.get(ProviderRegistryService);

    expect(registrar).toBeDefined();

    await registrar.onModuleInit();

    const provider = registry.get("CTRADER");

    expect(provider.type).toBe("CTRADER");
    expect(provider.enabled).toBe(true);
    expect(provider.metadata.name).toBe(
      "cTrader FIX Price Connection",
    );
    expect(provider.metadata.supportsQuotes).toBe(true);
    expect(provider.metadata.supportsStreaming).toBe(true);
  });

  it("instantiates through Nest with CTRADER disabled when credentials are absent", async () => {
    const env = buildEnv({
      CTRADER_FIX_SENDER_COMP_ID: undefined,
      CTRADER_FIX_USERNAME: undefined,
      CTRADER_FIX_PASSWORD: undefined,
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProviderRegistryService,
        ProviderFactoryService,
        {
          provide: MarketDataProviderConfigRepository,
          useValue: {
            findByType: jest.fn().mockResolvedValue(undefined),
          },
        },
        CTraderOpenApiClientFactory,
        {
          provide: CTraderOpenApiClient,
          inject: [CTraderOpenApiClientFactory],
          useFactory: (factory: CTraderOpenApiClientFactory) =>
            factory.create(),
        },
        CTraderFixClientFactory,
        {
          provide: CTraderFixClient,
          useValue: {
            connect: jest.fn().mockResolvedValue(undefined),
            disconnect: jest.fn().mockResolvedValue(undefined),
          },
        },
        CTraderFixRegistrarService,
        {
          provide: APP_CONFIG,
          useValue: env,
        },
      ],
    }).compile();

    const registrar = moduleRef.get(CTraderFixRegistrarService);
    const registry = moduleRef.get(ProviderRegistryService);

    await registrar.onModuleInit();

    const provider = registry.tryGet("CTRADER");

    expect(provider).not.toBeNull();
    expect(provider?.type).toBe("CTRADER");
    expect(provider?.enabled).toBe(false);
  });
});
