import { Test } from "@nestjs/testing";
import type { Env } from "@rmsm/config";

import { APP_CONFIG } from "../../../../../config/app-config.module";
import { InstrumentRepository } from "../../../repositories/instrument.repository";
import { InstrumentAliasRepository } from "../../../repositories/instrument-alias.repository";

import {
  CTraderFixClientFactory,
} from "../ctrader-fix.module";

import { CTraderFixClient } from "../ctrader-fix.client";

import {
  CTraderInstrumentCatalogService,
} from "../ctrader-fix.catalog.service";

import {
  CTraderInstrumentCatalogSynchronizer,
} from "../ctrader-fix.catalog-synchronizer";

import {
  CTraderInstrumentCatalogBootstrapService,
} from "../ctrader-fix.catalog.bootstrap";

import {
  CTraderFixInstrumentResolver,
} from "../ctrader-fix.instrument-resolver";

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

class FakeCTraderFixClient {
  async requestInstrumentCatalog(): Promise<never> {
    throw new Error(
      "FakeCTraderFixClient.requestInstrumentCatalog should not run in DI construction test",
    );
  }
}

describe("cTrader catalog Nest DI", () => {
  it("constructs the complete catalog dependency graph", async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: APP_CONFIG,
          useValue: buildEnv(),
        },

        CTraderFixClientFactory,
        {
          provide: CTraderFixClient,
          useClass: FakeCTraderFixClient,
        },
        CTraderInstrumentCatalogService,
        CTraderInstrumentCatalogSynchronizer,
        CTraderInstrumentCatalogBootstrapService,
        CTraderFixInstrumentResolver,

        InstrumentRepository,
        InstrumentAliasRepository,
      ],
    }).compile();

    expect(
      moduleRef.get(CTraderFixClientFactory),
    ).toBeDefined();

    expect(
      moduleRef.get(CTraderInstrumentCatalogService),
    ).toBeDefined();

    expect(
      moduleRef.get(CTraderInstrumentCatalogSynchronizer),
    ).toBeDefined();

    expect(
      moduleRef.get(CTraderInstrumentCatalogBootstrapService),
    ).toBeDefined();

    expect(
      moduleRef.get(CTraderFixInstrumentResolver),
    ).toBeDefined();

    expect(
      moduleRef.get(InstrumentRepository),
    ).toBeDefined();

    expect(
      moduleRef.get(InstrumentAliasRepository),
    ).toBeDefined();
  });
});
