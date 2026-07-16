import { IndicatorStartupValidatorService } from "../indicator-startup-validator.service";
import type { IndicatorHealthService } from "../indicator-health.service";
import type { IndicatorDefinitionRegistrarService } from "../../registry/indicator-definition-registrar.service";
import type { HealthResponseDto } from "../../rest/dto/health-response.dto";

function buildHealthResult(overrides: Partial<HealthResponseDto> = {}): HealthResponseDto {
  return {
    status: "ok",
    registryStatus: "ok",
    plannerStatus: "ok",
    computationEngineStatus: "ok",
    dependencyGraphStatus: "ok",
    serviceReadiness: "READY",
    apiReadiness: "ready",
    ...overrides,
  };
}

describe("IndicatorStartupValidatorService (fail-fast boot validation)", () => {
  function buildValidator(healthResult: HealthResponseDto) {
    const health = { check: jest.fn().mockReturnValue(healthResult) } as unknown as IndicatorHealthService;
    // The registrar is never actually called by this validator — it's
    // injected purely to force NestJS's own dependency-based
    // onModuleInit ordering (see this class's own header comment for
    // why). A minimal stub satisfies the constructor's type
    // requirement without needing any real behavior from it.
    const registrar = {} as IndicatorDefinitionRegistrarService;
    return new IndicatorStartupValidatorService(health, registrar);
  }

  it("does not throw when the health check reports ok", () => {
    const validator = buildValidator(buildHealthResult({ status: "ok" }));
    expect(() => validator.onModuleInit()).not.toThrow();
  });

  it("throws when the health check reports degraded — startup must fail fast, not silently serve a broken registry", () => {
    const validator = buildValidator(buildHealthResult({ status: "degraded", registryStatus: "error" }));
    expect(() => validator.onModuleInit()).toThrow(/startup validation failed/);
  });

  it("the thrown error names exactly which component(s) failed", () => {
    const validator = buildValidator(buildHealthResult({ status: "degraded", registryStatus: "error", plannerStatus: "error" }));
    expect(() => validator.onModuleInit()).toThrow(/registryStatus, plannerStatus/);
  });

  it("does not falsely report a healthy component as failed", () => {
    const validator = buildValidator(buildHealthResult({ status: "degraded", dependencyGraphStatus: "error" }));
    try {
      validator.onModuleInit();
    } catch (error) {
      expect((error as Error).message).toContain("dependencyGraphStatus");
      expect((error as Error).message).not.toContain("registryStatus");
    }
  });
});
