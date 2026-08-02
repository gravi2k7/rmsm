import { describe, expect, it, beforeEach } from "vitest";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { bootstrapMarketDataProviders, DEFAULT_MARKET_DATA_PROVIDERS } from "../bootstrap-market-data-providers";

/**
 * Minimal in-memory fake implementing only the PrismaClient surface
 * `bootstrapMarketDataProviders` actually calls — same "fake delegate,
 * not a mock framework" convention as `bootstrap-admin.test.ts` /
 * `prisma-repository.test.ts`. `$transaction` runs the callback against
 * `this` (ignoring the isolation-level options object, which is a
 * database-engine concern with nothing to fake in-memory) and can be
 * told to throw a serialization-failure error once, to exercise the
 * concurrent-replica-race branch.
 */
class FakePrisma {
  rows = new Map<string, { id: string; type: string; name: string; baseUrl: string | null; rateLimitPerMinute: number | null; supportedAssetClasses: string[]; priority: number; isActive: boolean }>();
  private throwSerializationFailureOnNextTransaction = false;

  simulateConcurrentSeedRace(): void {
    this.throwSerializationFailureOnNextTransaction = true;
  }

  marketDataProviderConfig = {
    count: async () => this.rows.size,
    create: async ({ data }: { data: { type: string; name: string; baseUrl?: string; rateLimitPerMinute?: number; supportedAssetClasses?: string[]; priority?: number; isActive?: boolean } }) => {
      const id = randomUUID();
      const row = {
        id,
        type: data.type,
        name: data.name,
        baseUrl: data.baseUrl ?? null,
        rateLimitPerMinute: data.rateLimitPerMinute ?? null,
        supportedAssetClasses: data.supportedAssetClasses ?? [],
        priority: data.priority ?? 100,
        isActive: data.isActive ?? true,
      };
      this.rows.set(id, row);
      return row;
    },
  };

  async $transaction<T>(fn: (tx: this) => Promise<T>): Promise<T> {
    if (this.throwSerializationFailureOnNextTransaction) {
      this.throwSerializationFailureOnNextTransaction = false;
      throw new Prisma.PrismaClientKnownRequestError("Transaction failed due to a write conflict or a deadlock. Please retry your transaction", {
        code: "P2034",
        clientVersion: "5.22.0",
      });
    }
    return fn(this);
  }
}

describe("bootstrapMarketDataProviders", () => {
  let prisma: FakePrisma;

  beforeEach(() => {
    prisma = new FakePrisma();
  });

  it("first run: creates exactly the 4 default providers when the table is empty", async () => {
    const result = await bootstrapMarketDataProviders(prisma as never);

    expect(result).toEqual({ status: "seeded", count: 4 });
    expect(prisma.rows.size).toBe(4);

    const types = [...prisma.rows.values()].map((r) => r.type).sort();
    expect(types).toEqual(["ALPHA_VANTAGE", "COINGECKO", "TWELVE_DATA", "YAHOO_FINANCE"]);
  });

  it("seeds every default provider's fields exactly as configured", async () => {
    await bootstrapMarketDataProviders(prisma as never);

    for (const expected of DEFAULT_MARKET_DATA_PROVIDERS) {
      const row = [...prisma.rows.values()].find((r) => r.type === expected.type);
      expect(row).toBeDefined();
      expect(row?.name).toBe(expected.name);
      expect(row?.baseUrl).toBe(expected.baseUrl);
      expect(row?.rateLimitPerMinute).toBe(expected.rateLimitPerMinute);
      expect(row?.supportedAssetClasses).toEqual(expected.supportedAssetClasses);
      expect(row?.priority).toBe(expected.priority);
      expect(row?.isActive).toBe(true);
    }
  });

  it("second run: running again is a no-op and does not create duplicates", async () => {
    await bootstrapMarketDataProviders(prisma as never);
    const secondResult = await bootstrapMarketDataProviders(prisma as never);

    expect(secondResult).toEqual({ status: "already_seeded", count: 4 });
    expect(prisma.rows.size).toBe(4);
  });

  it("does nothing if the table already has rows, even if it doesn't have all 4 providers (table-level gate, not per-type upsert)", async () => {
    await prisma.marketDataProviderConfig.create({ data: { type: "TWELVE_DATA", name: "Pre-existing manual row" } });

    const result = await bootstrapMarketDataProviders(prisma as never);

    expect(result).toEqual({ status: "already_seeded", count: 1 });
    expect(prisma.rows.size).toBe(1);
    expect([...prisma.rows.values()][0]?.name).toBe("Pre-existing manual row");
  });

  it("treats a concurrent-seed serialization failure (P2034) as a safe no-op, not an error", async () => {
    prisma.simulateConcurrentSeedRace();

    const result = await bootstrapMarketDataProviders(prisma as never);

    expect(result).toEqual({ status: "already_seeded", count: 4 });
    // The fake's create() never ran on this process's side (a different
    // "process" — simulated by the thrown error — is understood to have
    // done the actual insert instead), consistent with what would
    // happen against a real Postgres Serializable-isolation abort.
    expect(prisma.rows.size).toBe(0);
  });

  it("re-throws any other transaction error unchanged", async () => {
    const boom = new Error("connection reset");
    const throwingPrisma = {
      marketDataProviderConfig: { count: async () => 0 },
      $transaction: async () => {
        throw boom;
      },
    };

    await expect(bootstrapMarketDataProviders(throwingPrisma as never)).rejects.toThrow("connection reset");
  });
});
