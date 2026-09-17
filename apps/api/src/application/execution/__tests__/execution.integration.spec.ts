import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { PermissionsGuard } from "../../../modules/auth/guards/permissions.guard";
import { TestAuthGuard } from "../../common/testing/test-auth.guard";
import { GlobalExceptionFilter } from "../../../common/filters/http-exception.filter";
import { Test } from "@nestjs/testing";
import { CqrsModule } from "@nestjs/cqrs";
import { ExecutionController } from "../execution.controller";
import { ExecutionMapper } from "../mappers/execution.mapper";
import {
  CreateOrderHandler,
} from "../handlers/create-order.handler";
import {
  ListOrdersHandler,
  ListExecutionsHandler,
} from "../handlers/list-orders-and-executions.handler";
import { EXECUTION_REPOSITORY } from "../execution.tokens";
import { InMemoryExecutionRepository } from "../../../infrastructure/persistence/memory/execution/execution.memory-repository";
import { ExecutionService } from "@rmsm/execution";
import {
  DEMO_BROKER,
  DemoOrderExecutionService,
} from "../services/demo-order-execution.service";
import { DemoBroker } from "../../../infrastructure/execution/demo/demo.broker";
import type {
  Broker,
  ExecutionRepository,
} from "@rmsm/execution";
import { MarketDataService } from "../../../modules/market-data/services/market-data.service";

describe("Execution module (integration)", () => {
  let app: INestApplication;

  const instrumentId = "demo-eurusd-instrument";
  const bidPrice = "1.08420";
  const askPrice = "1.08425";

  const now = new Date();

  const demoInstrument = {
    id: instrumentId,
    exchangeId: null,
    symbol: "EURUSD",
    name: "Euro / US Dollar",
    assetClass: "FOREX" as const,
    status: "ACTIVE" as const,
    currency: "USD",
    isin: null,
    cusip: null,
    tickSize: "0.00001",
    lotSize: "1000",
    listedAt: null,
    delistedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const demoQuote = {
    id: "demo-eurusd-quote",
    instrumentId,
    bidPrice,
    askPrice,
    lastPrice: "1.08422",
    bidSize: "1000000",
    askSize: "1000000",
    eventTime: now,
    providerId: "demo-provider",
    source: "DEMO" as const,
    receivedAt: now,
    sourceTimestamp: now,
    createdAt: now,
  };

  const marketDataServiceMock = {
    searchInstruments: async () => [demoInstrument],
    getLatestQuote: async () => demoQuote,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [ExecutionController],
      providers: [
        {
          provide: EXECUTION_REPOSITORY,
          useClass: InMemoryExecutionRepository,
        },
        {
          provide: MarketDataService,
          useValue: marketDataServiceMock,
        },
        {
          provide: DEMO_BROKER,
          useClass: DemoBroker,
        },
        {
          provide: ExecutionService,
          useFactory: (
            repository: ExecutionRepository,
            broker: Broker,
          ) => new ExecutionService(repository, broker),
          inject: [
            EXECUTION_REPOSITORY,
            DEMO_BROKER,
          ],
        },
        ExecutionMapper,
        DemoOrderExecutionService,
        CreateOrderHandler,
        ListOrdersHandler,
        ListExecutionsHandler,
      ],
    })
      .overrideGuard(PermissionsGuard)
      .useClass(TestAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const validMarketOrder = {
    decisionId: "123e4567-e89b-12d3-a456-426614174000",
    symbolCode: "EURUSD",
    side: "BUY",
    type: "MARKET",
    quantityUnits: 10000,
    pricePrecision: 5,
  };

  it("POST /orders executes a DEMO MARKET BUY using the live ASK", async () => {
    const res = await request(app.getHttpServer())
      .post("/orders")
      .send(validMarketOrder)
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.decisionId).toBe(validMarketOrder.decisionId);
    expect(res.body.symbolCode).toBe("EURUSD");
    expect(res.body.side).toBe("BUY");
    expect(res.body.type).toBe("MARKET");
    expect(res.body.status).toBe("FILLED");
    expect(res.body.quantityUnits).toBe(10000);
    expect(res.body.filledQuantityUnits).toBe(10000);
    expect(res.body.averageFillPrice).toBe(Number(askPrice));
  });

  it("POST /orders executes a DEMO MARKET SELL using the live BID", async () => {
    const res = await request(app.getHttpServer())
      .post("/orders")
      .send({
        ...validMarketOrder,
        side: "SELL",
      })
      .expect(201);

    expect(res.body.status).toBe("FILLED");
    expect(res.body.side).toBe("SELL");
    expect(res.body.quantityUnits).toBe(10000);
    expect(res.body.filledQuantityUnits).toBe(10000);
    expect(res.body.averageFillPrice).toBe(Number(bidPrice));
  });

  it("POST /orders rejects a LIMIT order with no limitPrice", async () => {
    const res = await request(app.getHttpServer())
      .post("/orders")
      .send({
        ...validMarketOrder,
        type: "LIMIT",
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it("POST /orders rejects a LIMIT order in the DEMO broker", async () => {
    const res = await request(app.getHttpServer())
      .post("/orders")
      .send({
        ...validMarketOrder,
        type: "LIMIT",
        limitPrice: 1.1,
      })
      .expect(201);

    expect(res.body.status).toBe("REJECTED");
    expect(res.body.limitPrice).toBe(1.1);
  });

  it("GET /orders lists created orders", async () => {
    const res = await request(app.getHttpServer())
      .get("/orders")
      .expect(200);

    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it("GET /executions lists tracking executions", async () => {
    const res = await request(app.getHttpServer())
      .get("/executions")
      .expect(200);

    expect(res.body.items.length).toBeGreaterThan(0);

    const statuses = res.body.items.map(
      (execution: { status: string }) => execution.status,
    );

    expect(statuses).toContain("COMPLETED");
  });
});
