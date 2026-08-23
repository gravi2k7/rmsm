import { Test } from "@nestjs/testing";
import type { Env } from "@rmsm/config";

import { AppConfigModule } from "../../../config/app-config.module";
import { QueueModule } from "../../../queue/queue.module";
import { EmailModule } from "../../email/email.module";
import { MarketDataModule } from "../market-data.module";
import { MarketDataProviderBootstrapService } from "../bootstrap/market-data-provider-bootstrap.service";
import { CTraderFixRegistrarService } from "../providers/ctrader/ctrader-fix.module";
import { ProviderRegistryService } from "../providers/provider-registry.service";

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

describe("MarketDataModule cTrader integration", () => {
  it("boots the real MarketDataModule and registers CTRADER", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AppConfigModule,
        QueueModule,
        EmailModule,
        MarketDataModule,
      ],
    })
      .overrideProvider(MarketDataProviderBootstrapService)
      .useValue({})
      .compile();

    const registrar = moduleRef.get(CTraderFixRegistrarService);
    const registry = moduleRef.get(ProviderRegistryService);

    registrar.onModuleInit();

    const provider = registry.tryGet("CTRADER");

    expect(provider).not.toBeNull();
    expect(provider?.type).toBe("CTRADER");
    expect(provider?.enabled).toBe(true);
    expect(provider?.metadata.name).toBe(
      "cTrader FIX Price Connection",
    );
    expect(provider?.metadata.supportsQuotes).toBe(true);
    expect(provider?.metadata.supportsStreaming).toBe(true);

    await moduleRef.close();
  });
});
