import {
  INestApplication,
  ValidationPipe,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { SynchronizationController } from "../synchronization.controller";
import { PermissionsGuard } from "../../../auth/guards/permissions.guard";
import { TestAuthGuard } from "../../../../application/common/testing/test-auth.guard";
import { GlobalExceptionFilter } from "../../../../common/filters/http-exception.filter";

import { MarketDataAdminService } from "../../services/market-data-admin.service";
import { HistoricalImportService } from "../../services/historical-import.service";
import { ReferenceDataSynchronizationService } from "../../services/reference-data-synchronization.service";
import { QuoteSynchronizationService } from "../../services/quote-synchronization.service";
import { CTraderInstrumentCatalogBootstrapService } from "../../providers/ctrader/ctrader-fix.catalog.bootstrap";
import { CTraderFixInstrumentResolver } from "../../providers/ctrader/ctrader-fix.instrument-resolver";

describe("cTrader catalog synchronization endpoint (integration)", () => {
  let app: INestApplication;

  const adminService = {
    getSynchronizationHealth: jest.fn(),
    getMetrics: jest.fn(),
    listImportJobsByStatus: jest.fn(),
    getImportJob: jest.fn(),
  } as unknown as MarketDataAdminService;

  const historicalImportService = {
    importHistoricalCandles: jest.fn(),
  } as unknown as HistoricalImportService;

  const referenceDataSynchronizationService = {
    synchronizeTwelveData: jest.fn(),
  } as unknown as ReferenceDataSynchronizationService;

  const quoteSynchronizationService = {
    synchronizeInstrument: jest.fn(),
  } as unknown as QuoteSynchronizationService;

  const cTraderCatalogBootstrapService = {
    bootstrap: jest.fn(),
  } as unknown as CTraderInstrumentCatalogBootstrapService;

  const cTraderInstrumentResolver = {
    resolve: jest.fn(),
  } as unknown as CTraderFixInstrumentResolver;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SynchronizationController],
      providers: [
        {
          provide: MarketDataAdminService,
          useValue: adminService,
        },
        {
          provide: HistoricalImportService,
          useValue: historicalImportService,
        },
        {
          provide: ReferenceDataSynchronizationService,
          useValue: referenceDataSynchronizationService,
        },
        {
          provide: QuoteSynchronizationService,
          useValue: quoteSynchronizationService,
        },
        {
          provide: CTraderInstrumentCatalogBootstrapService,
          useValue: cTraderCatalogBootstrapService,
        },
        {
          provide: CTraderFixInstrumentResolver,
          useValue: cTraderInstrumentResolver,
        }
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
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("POST /market-data/synchronizations/ctrader/catalog returns synchronization result", async () => {
    const result = {
      providerId: "ctrader-provider-id",
      processed: 3,
      synchronized: 3,
      skipped: 0,
      aliases: 3,
    };

    (
      cTraderCatalogBootstrapService.bootstrap as jest.Mock
    ).mockResolvedValue(result);

    const response = await request(app.getHttpServer())
      .post("/market-data/synchronizations/ctrader/catalog")
      .send({
        providerId: "ctrader-provider-id",
        timeoutMs: 30000,
      })
      .expect(201);

    expect(response.body).toEqual(result);

    expect(
      cTraderCatalogBootstrapService.bootstrap,
    ).toHaveBeenCalledTimes(1);

    expect(
      cTraderCatalogBootstrapService.bootstrap,
    ).toHaveBeenCalledWith({
      providerId: "ctrader-provider-id",
      timeoutMs: 30000,
      resolve: expect.any(Function),
    });
  });

  it("passes the optional timeout through unchanged", async () => {
    const result = {
      providerId: "ctrader-provider-id",
      processed: 0,
      synchronized: 0,
      skipped: 0,
      aliases: 0,
    };

    (
      cTraderCatalogBootstrapService.bootstrap as jest.Mock
    ).mockResolvedValue(result);

    await request(app.getHttpServer())
      .post("/market-data/synchronizations/ctrader/catalog")
      .send({
        providerId: "ctrader-provider-id",
        timeoutMs: 60000,
      })
      .expect(201);

    expect(
      cTraderCatalogBootstrapService.bootstrap,
    ).toHaveBeenCalledWith({
      providerId: "ctrader-provider-id",
      timeoutMs: 60000,
      resolve: expect.any(Function),
    });
  });

  it("rejects a missing providerId", async () => {
    const response = await request(app.getHttpServer())
      .post("/market-data/synchronizations/ctrader/catalog")
      .send({
        timeoutMs: 30000,
      })
      .expect(400);

    expect(response.body.success).toBe(false);

    expect(
      cTraderCatalogBootstrapService.bootstrap,
    ).not.toHaveBeenCalled();
  });

  it("rejects an empty providerId", async () => {
    const response = await request(app.getHttpServer())
      .post("/market-data/synchronizations/ctrader/catalog")
      .send({
        providerId: "",
      })
      .expect(400);

    expect(response.body.success).toBe(false);

    expect(
      cTraderCatalogBootstrapService.bootstrap,
    ).not.toHaveBeenCalled();
  });

  it("rejects a timeout below the DTO minimum", async () => {
    const response = await request(app.getHttpServer())
      .post("/market-data/synchronizations/ctrader/catalog")
      .send({
        providerId: "ctrader-provider-id",
        timeoutMs: 999,
      })
      .expect(400);

    expect(response.body.success).toBe(false);

    expect(
      cTraderCatalogBootstrapService.bootstrap,
    ).not.toHaveBeenCalled();
  });

  it("rejects a timeout above the DTO maximum", async () => {
    const response = await request(app.getHttpServer())
      .post("/market-data/synchronizations/ctrader/catalog")
      .send({
        providerId: "ctrader-provider-id",
        timeoutMs: 120001,
      })
      .expect(400);

    expect(response.body.success).toBe(false);

    expect(
      cTraderCatalogBootstrapService.bootstrap,
    ).not.toHaveBeenCalled();
  });

  it("rejects non-whitelisted request fields", async () => {
    const response = await request(app.getHttpServer())
      .post("/market-data/synchronizations/ctrader/catalog")
      .send({
        providerId: "ctrader-provider-id",
        unexpected: true,
      })
      .expect(400);

    expect(response.body.success).toBe(false);

    expect(
      cTraderCatalogBootstrapService.bootstrap,
    ).not.toHaveBeenCalled();
  });

  it("propagates bootstrap failures through the HTTP exception filter", async () => {
    (
      cTraderCatalogBootstrapService.bootstrap as jest.Mock
    ).mockRejectedValue(
      new Error("cTrader catalog synchronization failed"),
    );

    const response = await request(app.getHttpServer())
      .post("/market-data/synchronizations/ctrader/catalog")
      .send({
        providerId: "ctrader-provider-id",
      })
      .expect(500);

    expect(response.body.success).toBe(false);
  });
});
