import { Test } from "@nestjs/testing";
import type { Env } from "@rmsm/config";

import { APP_CONFIG } from "../../../../../config/app-config.module";

import {
  CTraderFixClientFactory,
} from "../ctrader-fix.module";

import { CTraderFixClient } from "../ctrader-fix.client";

function buildEnv(): Env {
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
  } as Env;
}

describe("CTraderFixClient DI", () => {
  it("creates a CTrader FIX client from centralized configuration", async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CTraderFixClientFactory,
        {
          provide: APP_CONFIG,
          useValue: buildEnv(),
        },
      ],
    }).compile();

    const factory = moduleRef.get(CTraderFixClientFactory);

    const client = factory.create();

    expect(client).toBeInstanceOf(CTraderFixClient);
    expect(client.state.connected).toBe(false);
    expect(client.state.loggedOn).toBe(false);
  });
});
