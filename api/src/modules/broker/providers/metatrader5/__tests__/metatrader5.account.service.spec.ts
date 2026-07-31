import { MetaTrader5AccountService } from "../metatrader5.account.service";
import type { MetaTrader5Client } from "../metatrader5.client";
import type { MetaTrader5CacheService } from "../metatrader5.cache";
import { MT5_ACCOUNT_INFO_TTL_MULTIPLIER } from "../metatrader5.constants";

function buildClient(): MetaTrader5Client {
  return {
    request: jest.fn().mockResolvedValue({
      login: "12345",
      name: "Demo Account",
      balance: 10_000,
      equity: 10_050,
      margin: 200,
      marginFree: 9_850,
      marginLevel: 5025,
      currency: "USD",
      leverage: 100,
    }),
  } as unknown as MetaTrader5Client;
}

function passthroughCache(): MetaTrader5CacheService {
  return { getOrSet: jest.fn((_k: string, _ttl: number, fetcher: () => Promise<unknown>) => fetcher()) } as unknown as MetaTrader5CacheService;
}

describe("MetaTrader5AccountService", () => {
  it("maps the raw gateway account response to BrokerAccountInfo (BR-001's own field list)", async () => {
    const service = new MetaTrader5AccountService(buildClient(), passthroughCache(), 5_000);

    const info = await service.getAccountInfo();

    expect(info).toEqual({
      accountNumber: "12345",
      accountName: "Demo Account",
      balance: 10_000,
      equity: 10_050,
      margin: 200,
      freeMargin: 9_850,
      marginLevel: 5025,
      currency: "USD",
      leverage: 100,
    });
  });

  it("caches under the account-info TTL multiplier applied to the base cache TTL", async () => {
    const cache = passthroughCache();
    const client = buildClient();
    const service = new MetaTrader5AccountService(client, cache, 5_000);

    await service.getAccountInfo();

    expect(cache.getOrSet).toHaveBeenCalledWith("account", 5_000 * MT5_ACCOUNT_INFO_TTL_MULTIPLIER, expect.any(Function));
  });

  it("does not call the gateway on a cache hit", async () => {
    const client = buildClient();
    const cache = { getOrSet: jest.fn().mockResolvedValue({ login: "12345", name: "x", balance: 1, equity: 1, margin: 0, marginFree: 1, marginLevel: 0, currency: "USD", leverage: 1 }) } as unknown as MetaTrader5CacheService;
    const service = new MetaTrader5AccountService(client, cache, 5_000);

    await service.getAccountInfo();

    expect(client.request).not.toHaveBeenCalled();
  });
});
