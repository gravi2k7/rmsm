import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModuleBuilder } from "@nestjs/testing";
import { PermissionsGuard } from "../../../modules/auth/guards/permissions.guard";
import { TestAuthGuard } from "./test-auth.guard";
import { GlobalExceptionFilter } from "../../../common/filters/http-exception.filter";
import { AppConfigModule } from "../../../config/app-config.module";

type ProviderOverride = {
  token: unknown;
  value: unknown;
};

/**
 * Builds a real, running `INestApplication` from a single application
 * module with the same ValidationPipe/GlobalExceptionFilter configuration
 * used by main.ts.
 *
 * PermissionsGuard is overridden with TestAuthGuard.
 *
 * Optional provider overrides allow integration tests to replace external
 * infrastructure dependencies with deterministic test doubles without
 * changing production module wiring.
 */
export async function createIntegrationTestApp(
  module: new (...args: unknown[]) => unknown,
  providerOverrides: ProviderOverride[] = [],
): Promise<INestApplication> {
  let builder: TestingModuleBuilder = Test.createTestingModule({
    imports: [AppConfigModule, module as never],
  }).overrideGuard(PermissionsGuard).useClass(TestAuthGuard);

  for (const override of providerOverrides) {
    builder = builder
      .overrideProvider(override.token)
      .useValue(override.value);
  }

  const moduleRef = await builder.compile();

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
