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

async function bootstrap() {
  const config = loadConfig();

  const app = await NestFactory.create(AppModule, { logger: winstonLogger, rawBody: true });

  // Security headers
  app.use(helmet());

  // Signed cookies — used for the optional secure-httpOnly-cookie refresh
  // token delivery mode on web (see Module 002 doc, Security Design).
  app.use(cookieParser(config.COOKIE_SECRET));

  // CORS — locked to known frontends; extended per-environment via env vars
  // in a later module once allowed origins are finalized.
  app.enableCors({
    origin: config.APP_ENV === "local" ? true : [], // local: permissive; else: explicit allowlist TBD
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

bootstrap().catch((error: unknown) => {
  // Deliberately console.error, not the winston logger: if bootstrap
  // failed before or during config validation, we can't assume winston
  // (which itself now reads config — see winston.config.ts) is in a
  // working state. This is the same "plain console before the real
  // logger exists" reasoning tracing.ts's own no-op branch already uses.
  // eslint-disable-next-line no-console
  console.error("RMSM API failed to start:\n");
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
