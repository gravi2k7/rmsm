import "./tracing";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { loadConfig } from "@rmsm/config";
import { AppModule } from "./app.module";
import { winstonLogger } from "./common/logger/winston.config";
import { resolveCorsOrigins } from "./common/cors/resolve-cors-origins";

async function bootstrap() {
  const config = loadConfig();

  const app = await NestFactory.create(AppModule, { logger: winstonLogger, rawBody: true });

  // Security headers
  app.use(helmet());

  // Signed cookies — used for the optional secure-httpOnly-cookie refresh
  // token delivery mode on web (see Module 002 doc, Security Design).
  app.use(cookieParser(config.COOKIE_SECRET));

  // CORS — WM-020F: wires up the already-built, already-tested SEC-001
  // fix (see common/cors/resolve-cors-origins.ts) that this bootstrap
  // code was never actually updated to call. The previous inline
  // `config.APP_ENV === "local" ? true : []` meant every non-local
  // environment silently rejected all cross-origin requests outright —
  // resolveCorsOrigins() instead uses the explicit CORS_ALLOWED_ORIGINS
  // allowlist when set, or falls back to [WEB_APP_URL] so the API is
  // never unreachable from its own frontend by default. No behavior
  // change for local (still fully permissive).
  app.enableCors({
    origin: resolveCorsOrigins(config),
    credentials: true,
  });

  // Global validation — every DTO is validated & unknown properties stripped.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix("api/v1", { exclude: ["health", "health/ready"] });

  // Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle("RMSM AI — Core API")
    .setDescription("Enterprise AI trading platform — core REST API")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(config.API_PORT);
  // eslint-disable-next-line no-console
  console.log(`RMSM API listening on :${config.API_PORT} (docs at /api/docs)`);
}

bootstrap();
