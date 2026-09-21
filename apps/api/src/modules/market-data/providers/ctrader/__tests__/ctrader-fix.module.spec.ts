import {
  CTraderFixClient,
  CTraderFixRegistrarService,
} from "../ctrader-fix.module";
import { ProviderRegistryService } from "../../provider-registry.service";
import { ProviderFactoryService } from "../../provider-factory.service";
import { MarketDataProviderConfigRepository } from "../../../repositories/market-data-provider-config.repository";
import { InstrumentAliasRepository } from "../../../repositories/instrument-alias.repository";
import type { Env } from "@rmsm/config";

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

function buildProviderConfigRepository(
  config: Record<string, unknown> | null = {
    id: "ctrader-config",
    type: "CTRADER",
    name: "cTrader FIX",
    baseUrl: null,
    credentialReference: null,
    priority: 1,
    rateLimitPerMinute: null,
    lastConnectionTestAt: null,
    lastConnectionTestStatus: null,
    supportedAssetClasses: ["FOREX"],
    isActive: true,
    createdById: null,
    updatedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
): MarketDataProviderConfigRepository {
  return {
    findByType: jest.fn().mockResolvedValue(config),
  } as unknown as MarketDataProviderConfigRepository;
}

function buildAliasRepository(): InstrumentAliasRepository {
  return {
    findByProviderSymbol: jest.fn(),
  } as unknown as InstrumentAliasRepository;
}

describe("CTraderFixRegistrarService", () => {
  it("registers CTRADER with the provider registry including historical capability", async () => {
    const registry = new ProviderRegistryService();
    const factory = new ProviderFactoryService();
    const client = {
      connect: jest.fn().mockResolvedValue(undefined),
    } as unknown as CTraderFixClient;

    const providerConfigRepository = {
      findByType: jest.fn().mockResolvedValue({
        id: "ctrader-config",
        type: "CTRADER",
        name: "cTrader FIX",
        baseUrl: null,
        credentialReference: null,
        priority: 1,
        rateLimitPerMinute: null,
        lastConnectionTestAt: null,
        lastConnectionTestStatus: null,
        supportedAssetClasses: ["FOREX"],
        isActive: true,
        createdById: null,
        updatedById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    } as unknown as MarketDataProviderConfigRepository;

    const registrar = new CTraderFixRegistrarService(
      registry,
      factory,
      client,
      buildEnv({
        CTRADER_OPENAPI_ENABLED: true,
        CTRADER_OPENAPI_CLIENT_ID: "test-client",
        CTRADER_OPENAPI_CLIENT_SECRET: "test-secret",
        CTRADER_OPENAPI_ACCESS_TOKEN: "test-token",
        CTRADER_OPENAPI_ACCOUNT_ID: 12345,
      }),
      providerConfigRepository,
      buildAliasRepository(),
    );

    await registrar.onModuleInit();

    const provider = registry.get("CTRADER");

    expect(provider).toBeDefined();
    expect(provider?.type).toBe("CTRADER");
    expect(provider?.metadata.name).toBe("cTrader FIX Price Connection");
    expect(provider?.metadata.supportsQuotes).toBe(true);
    expect(provider?.metadata.supportsStreaming).toBe(true);
    expect(provider?.metadata.supportsHistorical).toBe(true);
    expect(provider?.enabled).toBe(true);
  });

  it("registers a CTRADER factory builder", async () => {
    const registry = new ProviderRegistryService();
    const factory = new ProviderFactoryService();
    const client = {
      connect: jest.fn().mockResolvedValue(undefined),
    } as unknown as CTraderFixClient;

    const registrar = new CTraderFixRegistrarService(
      registry,
      factory,
      client,
      buildEnv(),
      buildProviderConfigRepository(),
      buildAliasRepository(),
    );

    await registrar.onModuleInit();

    const provider = factory.create({
      id: "ctrader-test",
      type: "CTRADER",
      name: "cTrader FIX",
      baseUrl: null,
      credentialReference: null,
      priority: 10,
      rateLimitPerMinute: null,
      lastConnectionTestAt: null,
      lastConnectionTestStatus: null,
      supportedAssetClasses: ["FOREX"],
      isActive: true,
      createdById: null,
      updatedById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(provider.type).toBe("CTRADER");
    expect(provider.metadata.supportsQuotes).toBe(true);
    expect(provider.metadata.supportsStreaming).toBe(true);
  });

  it("reports CTRADER disabled when credentials are only partially configured", async () => {
    const registry = new ProviderRegistryService();
    const factory = new ProviderFactoryService();
    const client = {} as CTraderFixClient;

    const registrar = new CTraderFixRegistrarService(
      registry,
      factory,
      client,
      buildEnv({
        CTRADER_FIX_SENDER_COMP_ID: "RMSM",
        CTRADER_FIX_USERNAME: undefined,
        CTRADER_FIX_PASSWORD: undefined,
      }),
      buildProviderConfigRepository(),
      buildAliasRepository(),
    );

    await registrar.onModuleInit();

    const provider = registry.tryGet("CTRADER");

    expect(provider).not.toBeNull();
    expect(provider?.type).toBe("CTRADER");
    expect(provider?.enabled).toBe(false);
  });

  it("does not enable CTRADER from a database credentialReference alone", async () => {
    const registry = new ProviderRegistryService();
    const factory = new ProviderFactoryService();
    const client = {} as CTraderFixClient;

    const registrar = new CTraderFixRegistrarService(
      registry,
      factory,
      client,
      buildEnv({
        CTRADER_FIX_SENDER_COMP_ID: undefined,
        CTRADER_FIX_USERNAME: undefined,
        CTRADER_FIX_PASSWORD: undefined,
      }),
      buildProviderConfigRepository(),
      buildAliasRepository(),
    );

    await registrar.onModuleInit();

    const provider = factory.create({
      id: "ctrader-credential-reference-only",
      type: "CTRADER",
      name: "cTrader FIX",
      baseUrl: null,
      credentialReference: "secret://ctrader/production",
      priority: 10,
      rateLimitPerMinute: null,
      lastConnectionTestAt: null,
      lastConnectionTestStatus: null,
      supportedAssetClasses: ["FOREX"],
      isActive: true,
      createdById: null,
      updatedById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(provider.type).toBe("CTRADER");
    expect(provider.enabled).toBe(false);
  });

  it("reports CTRADER disabled when required credentials are absent", async () => {
    const registry = new ProviderRegistryService();
    const factory = new ProviderFactoryService();
    const client = {} as CTraderFixClient;

    const registrar = new CTraderFixRegistrarService(
      registry,
      factory,
      client,
      buildEnv({
        CTRADER_FIX_SENDER_COMP_ID: undefined,
        CTRADER_FIX_USERNAME: undefined,
        CTRADER_FIX_PASSWORD: undefined,
      }),
      buildProviderConfigRepository(),
      buildAliasRepository(),
    );

    await registrar.onModuleInit();

    const provider = registry.tryGet("CTRADER");

    expect(provider).not.toBeNull();
    expect(provider?.type).toBe("CTRADER");
    expect(provider?.enabled).toBe(false);
  });
});
