import { resetConfigCache } from "@rmsm/config";

const REQUIRED_ENV = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  JWT_ACCESS_SECRET: "a".repeat(16),
  JWT_REFRESH_SECRET: "b".repeat(16),
};

// Milestone 5.1.1's production/staging guard (env.validator.ts) rejects
// dev-default secrets outside development/test.
const PRODUCTION_SAFE_SECRETS = {
  WEB_APP_URL: "https://app.example.com",
  COOKIE_SECRET: "a".repeat(32),
  TWO_FACTOR_ENCRYPTION_KEY: "b".repeat(64),
  NOTIFICATION_CREDENTIALS_ENCRYPTION_KEY: "c".repeat(64),
  MOCK_WEBHOOK_SECRET: "d".repeat(32),
};

/** Loads a fresh copy of winston.config.ts against a specific raw env,
 * bypassing both Jest's module cache and @rmsm/config's own memoization
 * — needed because both cache state at import/first-call time, and this
 * suite deliberately varies the env between cases. Returns whatever the
 * import produced, or throws whatever it threw (callers assert on both). */
function loadWinstonConfigWith(env: Record<string, string>) {
  const previousEnv = { ...process.env };

  process.env = {
    ...env,
    RMSM_SKIP_DOTENV: "true",
  } as NodeJS.ProcessEnv;

  resetConfigCache();

  try {
    let winstonLogger: unknown;

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      winstonLogger = require("../winston.config").winstonLogger;
    });

    return winstonLogger;
  } finally {
    process.env = previousEnv;
    resetConfigCache();
  }
}

describe("winston.config.ts — reads NODE_ENV via @rmsm/config, not raw process.env", () => {
  afterEach(() => {
    jest.resetModules();
    resetConfigCache();
  });

  it("throws a ConfigValidationError-shaped error for an invalid production env — proof it now flows through validateEnv(), which a raw process.env.NODE_ENV read never would have", () => {
    // Deliberately production with every secret still at its insecure
    // dev default — before this milestone's fix, importing this file
    // could never fail this way, since it never called loadConfig().
    //
    // Asserted by name/message, not `toThrow(ConfigValidationError)`:
    // jest.isolateModules() gives the thrown error a *different*
    // ConfigValidationError class instance than the one imported at the
    // top of this file (a separate module registry), so an
    // instanceof-based match fails despite being functionally the same
    // error — a realm-independent assertion is the correct fix here, not
    // abandoning module isolation (which is what makes re-importing
    // winston.config.ts with a different env possible at all).
    let caught: unknown;
    try {
      loadWinstonConfigWith({
        ...REQUIRED_ENV,
        WEB_APP_URL: "https://app.example.com",
        NODE_ENV: "production",
      });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).name).toBe("ConfigValidationError");
    expect((caught as Error).message).toContain("COOKIE_SECRET");
  });

  it("constructs a working logger for a valid production env", () => {
    const logger = loadWinstonConfigWith({ ...REQUIRED_ENV, ...PRODUCTION_SAFE_SECRETS, NODE_ENV: "production" });
    expect(logger).toBeDefined();
    expect(typeof (logger as { log: unknown }).log).toBe("function");
  });

  it("constructs a working logger for a valid development env, with no production-only secrets required", () => {
    const logger = loadWinstonConfigWith({ ...REQUIRED_ENV, NODE_ENV: "development" });
    expect(logger).toBeDefined();
    expect(typeof (logger as { log: unknown }).log).toBe("function");
  });
});
