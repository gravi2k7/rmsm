import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PermissionsGuard } from "../../../modules/auth/guards/permissions.guard";
import { TestAuthGuard } from "./test-auth.guard";
import { GlobalExceptionFilter } from "../../../common/filters/http-exception.filter";

/**
 * Builds a real, running `INestApplication` from a single application
 * module (`MarketApplicationModule`, `StrategyApplicationModule`, etc.),
 * with the same `ValidationPipe`/`GlobalExceptionFilter` configuration
 * `main.ts` applies in production — so these integration tests exercise
 * real request validation and real error-response shaping, not a
 * simplified test-only substitute. `PermissionsGuard` is overridden with
 * `TestAuthGuard` (see that file's own doc comment for why); nothing
 * else about the module under test is mocked.
 */
export async function createIntegrationTestApp(module: new (...args: unknown[]) => unknown): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [module as never],
  })
    .overrideGuard(PermissionsGuard)
    .useClass(TestAuthGuard)
    .compile();

  const app = moduleRef.createNestApplication();
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
  return app;
}
