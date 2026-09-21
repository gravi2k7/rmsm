import { INestApplication, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import {
  OrganizationRole,
  MembershipStatus,
  prisma,
  TradingAccountStatus,
  TradingAccountType,
  TradingLedgerEntryType,
  AssetClass,
  InstrumentStatus,
} from "@rmsm/database";
import { TradingApplicationModule } from "../trading.module";
import { MarketDataService } from "../../../modules/market-data/services/market-data.service";
import { MarketDataModule } from "../../../modules/market-data/market-data.module";
import { InstrumentAliasRepository } from "../../../modules/market-data/repositories/instrument-alias.repository";
import { MarketDataProviderConfigRepository } from "../../../modules/market-data/repositories/market-data-provider-config.repository";
import { ProviderRegistryService } from "../../../modules/market-data/providers/provider-registry.service";
import { MarketDataStreamPublisher } from "../../../modules/market-data/services/market-data-stream.publisher";
import { PermissionsGuard } from "../../../modules/auth/guards/permissions.guard";
import { TestAuthGuard } from "../../common/testing/test-auth.guard";
import type { AccessTokenPayload } from "../../../modules/auth/services/token.service";

const testMarketDataService = {
  getLatestQuote: jest.fn(),
};

const testMarketDataStreamPublisher = {
  onQuote: jest.fn(),
  offQuote: jest.fn(),
};

const testInstrumentAliasRepository = {
  findByInstrument: jest.fn(),
};

const testProviderConfigRepository = {
  findById: jest.fn(),
};

const testQuoteClient = {
  fetchLatestQuote: jest.fn(),
};

const testProvider = {
  quoteClient: testQuoteClient,
};

const testProviderRegistry = {
  tryGet: jest.fn(),
};

@Module({
  providers: [
    {
      provide: MarketDataService,
      useValue: testMarketDataService,
    },
    {
      provide: MarketDataStreamPublisher,
      useValue: testMarketDataStreamPublisher,
    },
    {
      provide: InstrumentAliasRepository,
      useValue: testInstrumentAliasRepository,
    },
    {
      provide: MarketDataProviderConfigRepository,
      useValue: testProviderConfigRepository,
    },
    {
      provide: ProviderRegistryService,
      useValue: testProviderRegistry,
    },
  ],
  exports: [
    MarketDataService,
    MarketDataStreamPublisher,
    InstrumentAliasRepository,
    MarketDataProviderConfigRepository,
    ProviderRegistryService,
  ],
})
class TestMarketDataModule {}

describe("Trading accounts module (integration)", () => {
  let app: INestApplication;
  let organizationId: string;
  let userId: string;
  let otherUserId: string;
  let instrumentId: string;
  let providerId: string;

  const primaryUser: AccessTokenPayload = {
    sub: "",
    email: "trading-integration@example.com",
    roles: ["USER"],
    permissions: [
      "portfolio.read",
      "executions.read",
    ],
    sessionId: "trading-integration-session",
  };

  const otherUser: AccessTokenPayload = {
    ...primaryUser,
    sub: "",
    email: "trading-other@example.com",
    sessionId: "trading-other-session",
  };

  let activeTestUser: AccessTokenPayload = primaryUser;

  beforeAll(async () => {
    const organization = await prisma.organization.create({
      data: {
        name: "Trading Integration Organization",
        slug: `trading-integration-${Date.now()}`,
      },
    });

    organizationId = organization.id;

    const user = await prisma.user.create({
      data: {
        email: `trading-integration-${Date.now()}@example.com`,
        status: "ACTIVE",
      },
    });

    userId = user.id;

    const otherUserRow = await prisma.user.create({
      data: {
        email: `trading-other-${Date.now()}@example.com`,
        status: "ACTIVE",
      },
    });

    otherUserId = otherUserRow.id;

    await prisma.organizationMembership.create({
      data: {
        organizationId,
        userId,
        role: OrganizationRole.TRADER,
        status: MembershipStatus.ACTIVE,
      },
    });

    await prisma.organizationMembership.create({
      data: {
        organizationId,
        userId: otherUserId,
        role: OrganizationRole.TRADER,
        status: MembershipStatus.ACTIVE,
      },
    });

    const instrument = await prisma.instrument.create({
      data: {
        symbol: "RMSM.TEST",
        name: "RMSM Test Instrument",
        assetClass: AssetClass.EQUITY,
        status: InstrumentStatus.ACTIVE,
        currency: "USD",
      },
    });

    instrumentId = instrument.id;

    const provider = await prisma.marketDataProviderConfig.create({
      data: {
        type: "CTRADER",
        name: "Trading Integration cTrader",
        baseUrl: null,
        credentialReference: null,
        rateLimitPerMinute: null,
        supportedAssetClasses: [AssetClass.EQUITY],
        isActive: true,
        priority: 1,
      },
    });

    providerId = provider.id;

    await prisma.instrumentAlias.create({
      data: {
        instrumentId,
        providerId,
        providerSymbol: "RMSM.TEST.CTRADER",
        providerInstrumentId: "test-instrument-1",
      },
    });

    primaryUser.sub = userId;
    primaryUser.email = user.email;

    otherUser.sub = otherUserId;
    otherUser.email = otherUserRow.email;

    testInstrumentAliasRepository.findByInstrument.mockResolvedValue([
      {
        id: "test-alias",
        instrumentId,
        providerId,
        providerSymbol: "RMSM.TEST.CTRADER",
        providerInstrumentId: "test-instrument-1",
        createdAt: new Date("2026-08-27T00:00:00.000Z"),
        updatedAt: new Date("2026-08-27T00:00:00.000Z"),
      },
    ]);

    testProviderConfigRepository.findById.mockResolvedValue({
      id: providerId,
      type: "CTRADER",
      name: "Trading Integration cTrader",
      baseUrl: null,
      credentialReference: null,
      priority: 1,
      rateLimitPerMinute: null,
      lastConnectionTestAt: null,
      lastConnectionTestStatus: null,
      supportedAssetClasses: [AssetClass.EQUITY],
      isActive: true,
      createdById: null,
      updatedById: null,
      createdAt: new Date("2026-08-27T00:00:00.000Z"),
      updatedAt: new Date("2026-08-27T00:00:00.000Z"),
    });

    testProviderRegistry.tryGet.mockReturnValue(testProvider);

    const moduleRef = await Test.createTestingModule({
      imports: [TradingApplicationModule],
    })
      .overrideModule(MarketDataModule)
      .useModule(TestMarketDataModule)
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate: (context: import("@nestjs/common").ExecutionContext) => {
          const request = context
            .switchToHttp()
            .getRequest<{ user?: AccessTokenPayload }>();

          request.user = activeTestUser;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new (await import("@nestjs/common")).ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    app.useGlobalFilters(
      new (await import("../../../common/filters/http-exception.filter"))
        .GlobalExceptionFilter(),
    );

    await app.init();
  });

  afterEach(async () => {
    activeTestUser = primaryUser;

    await prisma.tradingLedgerEntry.deleteMany({
      where: {
        account: {
          organizationId,
        },
      },
    });

    await prisma.tradingAccount.deleteMany({
      where: {
        organizationId,
      },
    });
  });

  afterAll(async () => {
    if (organizationId) {
      await prisma.organizationMembership.deleteMany({
        where: {
          organizationId,
        },
      });

      await prisma.tradingLedgerEntry.deleteMany({
        where: {
          account: {
            organizationId,
          },
        },
      });

      await prisma.tradingAccount.deleteMany({
        where: {
          organizationId,
        },
      });

      await prisma.organization.delete({
        where: {
          id: organizationId,
        },
      });
    }

    if (instrumentId) {
      await prisma.instrument.delete({
        where: {
          id: instrumentId,
        },
      });
    }

    if (userId || otherUserId) {
      await prisma.user.deleteMany({
        where: {
          id: {
            in: [userId, otherUserId].filter(Boolean),
          },
        },
      });
    }

    if (app) {
      await app.close();
    }
  });

  it("creates a Demo account and persists INITIAL_DEPOSIT", async () => {
    const response = await request(app.getHttpServer())
      .post(
        `/organizations/${organizationId}/trading-accounts`,
      )
      .send({
        name: "Integration Demo",
        currency: "usd",
        startingBalance: 100000,
      })
      .expect(201);

    expect(response.body!.type).toBe("DEMO");
    expect(response.body!.name).toBe("Integration Demo");
    expect(response.body!.currency).toBe("USD");
    expect(response.body!.startingBalance).toBe("100000");
    expect(response.body!.balance).toBe("100000");
    expect(response.body!.status).toBe("ACTIVE");

    const account =
      await prisma.tradingAccount.findUnique({
        where: {
          id: response.body.id,
        },
      });

    expect(account).not.toBeNull();

    const ledger =
      await prisma.tradingLedgerEntry.findMany({
        where: {
          accountId: response.body.id,
        },
      });

    expect(ledger).toHaveLength(1);
    expect(ledger[0]!.type).toBe(
      TradingLedgerEntryType.INITIAL_DEPOSIT,
    );
    expect(ledger[0]!.amount.toString()).toBe("100000");
    expect(ledger[0]!.balanceAfter.toString()).toBe("100000");
  });

  it("lists and gets the Demo account", async () => {
    const createResponse =
      await request(app.getHttpServer())
        .post(
          `/organizations/${organizationId}/trading-accounts`,
        )
        .send({
          name: "List/Get Demo",
          currency: "USD",
          startingBalance: 50000,
        })
        .expect(201);

    const accountId = createResponse.body.id;

    const listResponse = await request(
      app.getHttpServer(),
    )
      .get(
        `/organizations/${organizationId}/trading-accounts`,
      )
      .expect(200);

    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0].id).toBe(accountId);

    const getResponse = await request(
      app.getHttpServer(),
    )
      .get(
        `/organizations/${organizationId}/trading-accounts/${accountId}`,
      )
      .expect(200);

    expect(getResponse.body.id).toBe(accountId);
    expect(getResponse.body.balance).toBe("50000");
  });

  it("adds virtual funds and persists VIRTUAL_DEPOSIT", async () => {
    const createResponse =
      await request(app.getHttpServer())
        .post(
          `/organizations/${organizationId}/trading-accounts`,
        )
        .send({
          name: "Funding Demo",
          currency: "USD",
          startingBalance: 100000,
        })
        .expect(201);

    const accountId = createResponse.body.id;

    const response = await request(
      app.getHttpServer(),
    )
      .post(
        `/organizations/${organizationId}/trading-accounts/${accountId}/funds`,
      )
      .send({
        amount: 25000,
      })
      .expect(201);

    expect(response.body!.balance).toBe("125000");

    const account =
      await prisma.tradingAccount.findUnique({
        where: {
          id: accountId,
        },
      });

    expect(account?.balance.toString()).toBe("125000");

    const ledger =
      await prisma.tradingLedgerEntry.findMany({
        where: {
          accountId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    expect(ledger).toHaveLength(2);
    expect(ledger[1]!.type).toBe(
      TradingLedgerEntryType.VIRTUAL_DEPOSIT,
    );
    expect(ledger[1]!.amount.toString()).toBe("25000");
    expect(ledger[1]!.balanceAfter.toString()).toBe(
      "125000",
    );
  });

  it("resets the Demo account and persists RESET", async () => {
    const createResponse =
      await request(app.getHttpServer())
        .post(
          `/organizations/${organizationId}/trading-accounts`,
        )
        .send({
          name: "Reset Demo",
          currency: "USD",
          startingBalance: 100000,
        })
        .expect(201);

    const accountId = createResponse.body.id;

    await request(app.getHttpServer())
      .post(
        `/organizations/${organizationId}/trading-accounts/${accountId}/funds`,
      )
      .send({
        amount: 50000,
      })
      .expect(201);

    const response = await request(
      app.getHttpServer(),
    )
      .post(
        `/organizations/${organizationId}/trading-accounts/${accountId}/reset`,
      )
      .expect(201);

    expect(response.body!.balance).toBe("100000");
    expect(response.body!.status).toBe("ACTIVE");

    const account =
      await prisma.tradingAccount.findUnique({
        where: {
          id: accountId,
        },
      });

    expect(account?.balance.toString()).toBe("100000");
    expect(account?.status).toBe(
      TradingAccountStatus.ACTIVE,
    );

    const ledger =
      await prisma.tradingLedgerEntry.findMany({
        where: {
          accountId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    expect(ledger).toHaveLength(3);
    expect(ledger[2]!.type).toBe(
      TradingLedgerEntryType.RESET,
    );
    expect(ledger[2]!.amount.toString()).toBe(
      "-50000",
    );
    expect(ledger[2]!.balanceAfter.toString()).toBe(
      "100000",
    );
  });

  it("returns ledger newest-first", async () => {
    const createResponse =
      await request(app.getHttpServer())
        .post(
          `/organizations/${organizationId}/trading-accounts`,
        )
        .send({
          name: "Ledger Demo",
          currency: "USD",
          startingBalance: 100000,
        })
        .expect(201);

    const accountId = createResponse.body.id;

    await request(app.getHttpServer())
      .post(
        `/organizations/${organizationId}/trading-accounts/${accountId}/funds`,
      )
      .send({
        amount: 10000,
      })
      .expect(201);

    const response = await request(
      app.getHttpServer(),
    )
      .get(
        `/organizations/${organizationId}/trading-accounts/${accountId}/ledger`,
      )
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body[0].type).toBe(
      TradingLedgerEntryType.VIRTUAL_DEPOSIT,
    );
    expect(response.body[1].type).toBe(
      TradingLedgerEntryType.INITIAL_DEPOSIT,
    );
  });

  it("prevents another user from accessing the account", async () => {
    const createResponse =
      await request(app.getHttpServer())
        .post(
          `/organizations/${organizationId}/trading-accounts`,
        )
        .send({
          name: "Private Demo",
          currency: "USD",
          startingBalance: 100000,
        })
        .expect(201);

    const accountId = createResponse.body.id;

    activeTestUser = otherUser;

    await request(app.getHttpServer())
      .get(
        `/organizations/${organizationId}/trading-accounts/${accountId}`,
      )
      .expect(404);

    await request(app.getHttpServer())
      .post(
        `/organizations/${organizationId}/trading-accounts/${accountId}/funds`,
      )
      .send({
        amount: 1000,
      })
      .expect(404);
  });

it("POST /orders executes a full BUY then SELL using ask/bid and persists the closed trade", async () => {
    testQuoteClient.fetchLatestQuote
      .mockResolvedValueOnce({
        bidPrice: "100.00",
        askPrice: "100.25",
      })
      .mockResolvedValueOnce({
        bidPrice: "110.00",
        askPrice: "110.25",
      });

    const accountResponse =
      await request(app.getHttpServer())
        .post(
          `/organizations/${organizationId}/trading-accounts`,
        )
        .send({
          name: "Round Trip Demo",
          currency: "USD",
          startingBalance: 100000,
        })
        .expect(201);

    const accountId = accountResponse.body.id;

    const buyResponse =
      await request(app.getHttpServer())
        .post(
          `/organizations/${organizationId}/trading-accounts/${accountId}/orders`,
        )
        .send({
          instrumentId,
          side: "BUY",
          quantity: "10",
        })
        .expect(201);

    expect(buyResponse.body.executedPrice).toBe("100.25");

    const sellResponse =
      await request(app.getHttpServer())
        .post(
          `/organizations/${organizationId}/trading-accounts/${accountId}/orders`,
        )
        .send({
          instrumentId,
          side: "SELL",
          quantity: "10",
        })
        .expect(201);

    expect(sellResponse.body.executedPrice).toBe("110");
    expect(sellResponse.body.realizedPnl).toBe("97.5");

    expect(testInstrumentAliasRepository.findByInstrument)
      .toHaveBeenCalledWith(instrumentId);
    expect(testProviderConfigRepository.findById)
      .toHaveBeenCalledWith(providerId);
    expect(testProviderRegistry.tryGet)
      .toHaveBeenCalledWith("CTRADER");
    expect(testQuoteClient.fetchLatestQuote)
      .toHaveBeenNthCalledWith(1, "RMSM.TEST.CTRADER");
    expect(testQuoteClient.fetchLatestQuote)
      .toHaveBeenNthCalledWith(2, "RMSM.TEST.CTRADER");
    expect(sellResponse.body.balance).toBe("100097.5");
    expect(sellResponse.body.order.status).toBe("FILLED");
    expect(sellResponse.body.position.status).toBe("CLOSED");
    expect(sellResponse.body.trade).not.toBeNull();

    const positions =
      await prisma.tradingPosition.findMany({
        where: {
          accountId,
          instrumentId,
        },
      });

    expect(positions).toHaveLength(1);
    expect(positions[0]!.status).toBe("CLOSED");
    expect(positions[0]!.quantity.toString()).toBe("0");
    expect(positions[0]!.averageEntryPrice.toString()).toBe(
      "100.25",
    );
    expect(positions[0]!.averageExitPrice?.toString()).toBe(
      "110",
    );
    expect(positions[0]!.realizedPnl?.toString()).toBe(
      "97.5",
    );

    const trades =
      await prisma.tradingTrade.findMany({
        where: {
          accountId,
          instrumentId,
        },
      });

    expect(trades).toHaveLength(1);
    expect(trades[0]!.side).toBe("LONG");
    expect(trades[0]!.quantity.toString()).toBe("10");
    expect(trades[0]!.entryPrice.toString()).toBe(
      "100.25",
    );
    expect(trades[0]!.exitPrice.toString()).toBe("110");
    expect(trades[0]!.realizedPnl.toString()).toBe(
      "97.5",
    );

    const orders =
      await prisma.tradingOrder.findMany({
        where: {
          accountId,
          instrumentId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    expect(orders).toHaveLength(2);
    expect(orders[0]!.side).toBe("BUY");
    expect(orders[1]!.side).toBe("SELL");

    const fills =
      await prisma.tradingFill.findMany({
        where: {
          order: {
            accountId,
            instrumentId,
          },
        },
        orderBy: {
          filledAt: "asc",
        },
      });

    expect(fills).toHaveLength(2);
    expect(fills[0]!.price.toString()).toBe("100.25");
    expect(fills[1]!.price.toString()).toBe("110");

    const account =
      await prisma.tradingAccount.findUnique({
        where: {
          id: accountId,
        },
      });

    expect(account!.balance.toString()).toBe("100097.5");

    const ledger =
      await prisma.tradingLedgerEntry.findMany({
        where: {
          accountId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    expect(ledger).toHaveLength(3);
    expect(ledger[1]!.type).toBe(
      TradingLedgerEntryType.TRADE_DEBIT,
    );
    expect(ledger[1]!.amount.toString()).toBe("-1002.5");
    expect(ledger[2]!.type).toBe(
      TradingLedgerEntryType.TRADE_CREDIT,
    );
    expect(ledger[2]!.amount.toString()).toBe("1100");
  });

  it("POST /positions/:positionId/reverse reverses LONG to SHORT", async () => {
    testQuoteClient.fetchLatestQuote
      .mockResolvedValueOnce({
        bidPrice: "100.00",
        askPrice: "100.25",
      })
      .mockResolvedValueOnce({
        bidPrice: "99.50",
        askPrice: "99.75",
      })
      .mockResolvedValueOnce({
        bidPrice: "99.50",
        askPrice: "99.75",
      });

    const accountResponse =
      await request(app.getHttpServer())
        .post(
          `/organizations/${organizationId}/trading-accounts`,
        )
        .send({
          name: "Reverse LONG Demo",
          currency: "USD",
          startingBalance: 100000,
        })
        .expect(201);

    const accountId = accountResponse.body.id;

    const openResponse =
      await request(app.getHttpServer())
        .post(
          `/organizations/${organizationId}/trading-accounts/${accountId}/orders`,
        )
        .send({
          instrumentId,
          side: "BUY",
          quantity: "2",
        })
        .expect(201);

    expect(openResponse.body.position.side).toBe("LONG");
    expect(openResponse.body.position.quantity).toBe("2");

    const positionId = openResponse.body.position.id;

    const reverseResponse =
      await request(app.getHttpServer())
        .post(
          `/organizations/${organizationId}/trading-accounts/${accountId}/positions/${positionId}/reverse`,
        )
        .expect(201);

    expect(reverseResponse.body.position.side).toBe("SHORT");
    expect(reverseResponse.body.position.status).toBe("OPEN");
    expect(reverseResponse.body.position.quantity).toBe("2");

    const positions =
      await prisma.tradingPosition.findMany({
        where: {
          accountId,
          instrumentId,
        },
        orderBy: {
          openedAt: "asc",
        },
      });

    expect(positions).toHaveLength(2);

    expect(positions[0]!.side).toBe("LONG");
    expect(positions[0]!.status).toBe("CLOSED");
    expect(positions[0]!.quantity.toString()).toBe("0");

    expect(positions[1]!.side).toBe("SHORT");
    expect(positions[1]!.status).toBe("OPEN");
    expect(positions[1]!.quantity.toString()).toBe("2");

    const trades =
      await prisma.tradingTrade.findMany({
        where: {
          accountId,
          instrumentId,
        },
        orderBy: {
          openedAt: "asc",
        },
      });

    expect(trades).toHaveLength(1);
    expect(trades[0]!.side).toBe("LONG");
    expect(trades[0]!.quantity.toString()).toBe("2");

    const orders =
      await prisma.tradingOrder.findMany({
        where: {
          accountId,
          instrumentId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    expect(orders).toHaveLength(3);
    expect(orders[0]!.side).toBe("BUY");
    expect(orders[1]!.side).toBe("SELL");
    expect(orders[2]!.side).toBe("SELL");
  });

  it("POST /positions/:positionId/reverse reverses SHORT to LONG", async () => {
    testQuoteClient.fetchLatestQuote
      .mockResolvedValueOnce({
        bidPrice: "100.00",
        askPrice: "100.25",
      })
      .mockResolvedValueOnce({
        bidPrice: "100.50",
        askPrice: "100.75",
      })
      .mockResolvedValueOnce({
        bidPrice: "100.50",
        askPrice: "100.75",
      });

    const accountResponse =
      await request(app.getHttpServer())
        .post(
          `/organizations/${organizationId}/trading-accounts`,
        )
        .send({
          name: "Reverse SHORT Demo",
          currency: "USD",
          startingBalance: 100000,
        })
        .expect(201);

    const accountId = accountResponse.body.id;

    const openResponse =
      await request(app.getHttpServer())
        .post(
          `/organizations/${organizationId}/trading-accounts/${accountId}/orders`,
        )
        .send({
          instrumentId,
          side: "SELL",
          quantity: "2",
        })
        .expect(201);

    expect(openResponse.body.position.side).toBe("SHORT");
    expect(openResponse.body.position.quantity).toBe("2");

    const positionId = openResponse.body.position.id;

    const reverseResponse =
      await request(app.getHttpServer())
        .post(
          `/organizations/${organizationId}/trading-accounts/${accountId}/positions/${positionId}/reverse`,
        )
        .expect(201);

    expect(reverseResponse.body.position.side).toBe("LONG");
    expect(reverseResponse.body.position.status).toBe("OPEN");
    expect(reverseResponse.body.position.quantity).toBe("2");

    const positions =
      await prisma.tradingPosition.findMany({
        where: {
          accountId,
          instrumentId,
        },
        orderBy: {
          openedAt: "asc",
        },
      });

    expect(positions).toHaveLength(2);

    expect(positions[0]!.side).toBe("SHORT");
    expect(positions[0]!.status).toBe("CLOSED");
    expect(positions[0]!.quantity.toString()).toBe("0");

    expect(positions[1]!.side).toBe("LONG");
    expect(positions[1]!.status).toBe("OPEN");
    expect(positions[1]!.quantity.toString()).toBe("2");

    const trades =
      await prisma.tradingTrade.findMany({
        where: {
          accountId,
          instrumentId,
        },
        orderBy: {
          openedAt: "asc",
        },
      });

    expect(trades).toHaveLength(1);
    expect(trades[0]!.side).toBe("SHORT");
    expect(trades[0]!.quantity.toString()).toBe("2");

    const orders =
      await prisma.tradingOrder.findMany({
        where: {
          accountId,
          instrumentId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    expect(orders).toHaveLength(3);
    expect(orders[0]!.side).toBe("SELL");
    expect(orders[1]!.side).toBe("BUY");
    expect(orders[2]!.side).toBe("BUY");
  });

  it("POST /orders persists SL and TP for a Demo BUY position", async () => {
    testQuoteClient.fetchLatestQuote.mockResolvedValue({
      bidPrice: "100.00",
      askPrice: "100.25",
    });

    const accountResponse =
      await request(app.getHttpServer())
        .post(
          `/organizations/${organizationId}/trading-accounts`,
        )
        .send({
          name: "SL TP BUY Demo",
          currency: "USD",
          startingBalance: 100000,
        })
        .expect(201);

    const accountId = accountResponse.body.id;

    const response =
      await request(app.getHttpServer())
        .post(
          `/organizations/${organizationId}/trading-accounts/${accountId}/orders`,
        )
        .send({
          instrumentId,
          side: "BUY",
          quantity: "10",
          stopLossPrice: "98",
          takeProfitPrice: "105",
        })
        .expect(201);

    expect(response.body.executedPrice).toBe("100.25");
    expect(response.body.position.status).toBe("OPEN");

    const position =
      await prisma.tradingPosition.findFirst({
        where: {
          accountId,
          instrumentId,
        },
      });

    expect(position).not.toBeNull();
    expect(position!.side).toBe("LONG");
    expect(position!.quantity.toString()).toBe("10");
    expect(position!.averageEntryPrice.toString()).toBe("100.25");
    expect(position!.stopLossPrice?.toString()).toBe("98");
    expect(position!.takeProfitPrice?.toString()).toBe("105");
  });

  it("POST /orders persists SL and TP for a Demo SELL position", async () => {
    testQuoteClient.fetchLatestQuote.mockResolvedValue({
      bidPrice: "100.00",
      askPrice: "100.25",
    });

    const accountResponse =
      await request(app.getHttpServer())
        .post(
          `/organizations/${organizationId}/trading-accounts`,
        )
        .send({
          name: "SL TP SELL Demo",
          currency: "USD",
          startingBalance: 100000,
        })
        .expect(201);

    const accountId = accountResponse.body.id;

    const response =
      await request(app.getHttpServer())
        .post(
          `/organizations/${organizationId}/trading-accounts/${accountId}/orders`,
        )
        .send({
          instrumentId,
          side: "SELL",
          quantity: "10",
          stopLossPrice: "103",
          takeProfitPrice: "95",
        })
        .expect(201);

    expect(response.body.executedPrice).toBe("100");
    expect(response.body.position.status).toBe("OPEN");

    const position =
      await prisma.tradingPosition.findFirst({
        where: {
          accountId,
          instrumentId,
        },
      });

    expect(position).not.toBeNull();
    expect(position!.side).toBe("SHORT");
    expect(position!.quantity.toString()).toBe("10");
    expect(position!.averageEntryPrice.toString()).toBe("100");
    expect(position!.stopLossPrice?.toString()).toBe("103");
    expect(position!.takeProfitPrice?.toString()).toBe("95");
  });

  it("POST /orders executes a Demo BUY at the ask and persists order/fill/position/ledger", async () => {
    testQuoteClient.fetchLatestQuote.mockResolvedValue({
      bidPrice: "100.00",
      askPrice: "100.25",
    });

    const accountResponse =
      await request(app.getHttpServer())
        .post(
          `/organizations/${organizationId}/trading-accounts`,
        )
        .send({
          name: "Order BUY Demo",
          currency: "USD",
          startingBalance: 100000,
        })
        .expect(201);

    const accountId = accountResponse.body.id;

    const response =
      await request(app.getHttpServer())
        .post(
          `/organizations/${organizationId}/trading-accounts/${accountId}/orders`,
        )
        .send({
          instrumentId,
          side: "BUY",
          quantity: "10",
        })
        .expect(201);

    expect(response.body.executedPrice).toBe("100.25");
    expect(response.body.realizedPnl).toBe("0");
    expect(response.body.balance).toBe("98997.5");
    expect(response.body.order.status).toBe("FILLED");

    const order =
      await prisma.tradingOrder.findUnique({
        where: {
          id: response.body.order.id,
        },
      });

    expect(order).not.toBeNull();
    expect(order!.side).toBe("BUY");
    expect(order!.type).toBe("MARKET");
    expect(order!.status).toBe("FILLED");
    expect(order!.instrumentId).toBe(instrumentId);
    expect(order!.quantity.toString()).toBe("10");
    expect(order!.executedPrice?.toString()).toBe("100.25");

    const fills =
      await prisma.tradingFill.findMany({
        where: {
          orderId: order!.id,
        },
      });

    expect(fills).toHaveLength(1);
    expect(fills[0]!.price.toString()).toBe("100.25");
    expect(fills[0]!.quantity.toString()).toBe("10");
    expect(fills[0]!.commission.toString()).toBe("0");

    const position =
      await prisma.tradingPosition.findFirst({
        where: {
          accountId,
          instrumentId,
        },
      });

    expect(position).not.toBeNull();
    expect(position!.side).toBe("LONG");
    expect(position!.status).toBe("OPEN");
    expect(position!.quantity.toString()).toBe("10");
    expect(position!.averageEntryPrice.toString()).toBe("100.25");

    const account =
      await prisma.tradingAccount.findUnique({
        where: {
          id: accountId,
        },
      });

    expect(account!.balance.toString()).toBe("98997.5");

    const ledger =
      await prisma.tradingLedgerEntry.findMany({
        where: {
          accountId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    expect(ledger).toHaveLength(2);
    expect(ledger[1]!.type).toBe(
      TradingLedgerEntryType.TRADE_DEBIT,
    );
    expect(ledger[1]!.amount.toString()).toBe("-1002.5");
    expect(ledger[1]!.balanceAfter.toString()).toBe(
      "98997.5",
    );
  });

});
