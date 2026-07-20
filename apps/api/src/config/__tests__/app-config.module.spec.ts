import { Test } from "@nestjs/testing";
import { ConfigValidationError, resetConfigCache } from "@rmsm/config";
import { AppConfigModule, APP_CONFIG } from "../app-config.module";

const REQUIRED_ENV = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  JWT_ACCESS_SECRET: "a".repeat(16),
  JWT_REFRESH_SECRET: "b".repeat(16),
};

describe("AppConfigModule", () => {
  let previousEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    previousEnv = { ...process.env };
    resetConfigCache();
  });

  afterEach(() => {
    process.env = previousEnv;
    resetConfigCache();
  });

  it("provides the validated, typed config via the APP_CONFIG token when the environment is valid", async () => {
    process.env = { ...REQUIRED_ENV, NODE_ENV: "development" } as NodeJS.ProcessEnv;

    const moduleRef = await Test.createTestingModule({ imports: [AppConfigModule] }).compile();
    const config = moduleRef.get(APP_CONFIG);

    expect(config.DATABASE_URL).toBe(REQUIRED_ENV.DATABASE_URL);
    expect(config.API_PORT).toBe(3001); // schema default, proves real Zod parsing ran (not a pass-through of raw env strings)
    expect(config.NODE_ENV).toBe("development");
  });

  it("fails fast with a descriptive ConfigValidationError when required vars are missing", async () => {
    process.env = { NODE_ENV: "development" } as NodeJS.ProcessEnv;

    await expect(Test.createTestingModule({ imports: [AppConfigModule] }).compile()).rejects.toThrow(ConfigValidationError);
  });

  it("fails fast in production when a required secret still holds its insecure development default", async () => {
    process.env = {
      ...REQUIRED_ENV,
      NODE_ENV: "production",
      WEB_APP_URL: "https://app.example.com",
      // COOKIE_SECRET, TWO_FACTOR_ENCRYPTION_KEY, etc. deliberately left
      // at their dev defaults here.
    } as NodeJS.ProcessEnv;

    let caught: unknown;
    try {
      await Test.createTestingModule({ imports: [AppConfigModule] }).compile();
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(ConfigValidationError);
    expect((caught as ConfigValidationError).issues.some((i) => i.startsWith("COOKIE_SECRET"))).toBe(true);
  });
});
