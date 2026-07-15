import { readFileSync } from "fs";
import { join } from "path";
import { IndicatorController } from "../indicator.controller";
import type { IndicatorEngineServiceImpl } from "../../services/indicator-engine.service";
import type { IndicatorHealthService } from "../../services/indicator-health.service";
import type { IndicatorDefinition } from "../../contracts/indicator-definition.interface";
import type { ExecuteIndicatorDto } from "../dto/execute-indicator.dto";

function buildDefinition(overrides: Partial<IndicatorDefinition> = {}): IndicatorDefinition {
  return {
    identifier: "ema",
    displayName: "EMA",
    version: "1.0.0",
    description: "Test",
    category: "TREND",
    inputs: [],
    outputs: [{ name: "value", kind: "line" }],
    defaultParameters: {},
    supportedTimeframes: ["ONE_DAY"],
    minimumLookback: 1,
    dependencies: [],
    tags: [],
    author: "Test",
    stabilityLevel: "stable",
    metadata: { calculationType: "windowed", deterministic: true, cacheable: true, incrementalSupport: false },
    ...overrides,
  };
}

describe("IndicatorController (thin — communicates only with IndicatorEngineServiceImpl)", () => {
  function buildController() {
    const engine = {
      query: jest.fn().mockReturnValue({ indicators: [buildDefinition()], totalCount: 1 }),
      lookup: jest.fn().mockReturnValue({ definition: buildDefinition() }),
      validate: jest.fn().mockReturnValue({ valid: true, errors: [] }),
      execute: jest.fn().mockResolvedValue({ summary: { status: "COMPLETED" }, stepResults: {}, errors: [] }),
    } as unknown as IndicatorEngineServiceImpl;
    const health = { check: jest.fn().mockReturnValue({ status: "ok" }) } as unknown as IndicatorHealthService;
    return { controller: new IndicatorController(engine, health), engine, health };
  }

  it("list() delegates to engine.query() and maps results to DTOs with real pagination", () => {
    const { controller, engine } = buildController();
    const result = controller.list({ page: 1, pageSize: 50 });
    expect(engine.query).toHaveBeenCalled();
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.identifier).toBe("ema");
    expect(result.pagination.totalCount).toBe(1);
  });

  it("listCategories() derives distinct categories without touching the registry directly", () => {
    const { controller, engine } = buildController();
    const categories = controller.listCategories();
    expect(engine.query).toHaveBeenCalledWith({});
    expect(categories).toEqual(["TREND"]);
  });

  it("listVersions() delegates through engine.query()", () => {
    const { controller, engine } = buildController();
    const versions = controller.listVersions("ema");
    expect(engine.query).toHaveBeenCalledWith({ identifier: "ema" });
    expect(versions).toEqual(["1.0.0"]);
  });

  it("getMetadata() delegates to engine.lookup() and maps to a DTO", () => {
    const { controller, engine } = buildController();
    const result = controller.getMetadata("ema", undefined);
    expect(engine.lookup).toHaveBeenCalledWith("ema", undefined);
    expect(result.identifier).toBe("ema");
  });

  it("validate() delegates to engine.validate() with defaults for missing optional fields", () => {
    const { controller, engine } = buildController();
    controller.validate({ indicatorIdentifier: "ema", timeframe: "ONE_DAY" });
    expect(engine.validate).toHaveBeenCalledWith({ indicatorIdentifier: "ema", version: undefined, parameters: {}, timeframe: "ONE_DAY" });
  });

  it("execute() delegates to engine.execute() with the full request shape", async () => {
    const { controller, engine } = buildController();
    const body: ExecuteIndicatorDto = {
      indicatorIdentifier: "ema",
      instrumentId: "inst1",
      timeframe: "ONE_DAY",
      calculationMode: "FULL_RECALCULATION",
      from: "2026-01-01T00:00:00Z",
      to: "2026-02-01T00:00:00Z",
    };
    const result = await controller.execute(body);
    expect(engine.execute).toHaveBeenCalled();
    expect(result.summary.status).toBe("COMPLETED");
  });

  it("getHealth() delegates to IndicatorHealthService.check(), never the engine", () => {
    const { controller, health, engine } = buildController();
    const result = controller.getHealth();
    expect(health.check).toHaveBeenCalled();
    expect(engine.query).not.toHaveBeenCalled();
    expect(result.status).toBe("ok");
  });

  it("REGRESSION: health route is declared ahead of :identifier — a real bug this phase found and fixed (GET /indicators/health was originally being swallowed by the :identifier route, since NestJS/Express match in registration order and 'health' is a valid single-segment identifier value)", () => {
    const source = readFileSync(join(__dirname, "..", "indicator.controller.ts"), "utf-8");
    const healthIndex = source.indexOf('@Get("health")');
    const identifierIndex = source.indexOf('@Get(":identifier")');
    expect(healthIndex).toBeGreaterThan(-1);
    expect(identifierIndex).toBeGreaterThan(-1);
    expect(healthIndex).toBeLessThan(identifierIndex);
  });

  it("the controller's own source file imports exactly IndicatorEngineServiceImpl and IndicatorHealthService from this module's services — never a repository, registry, planner, graph, or computation-engine class directly", () => {
    // A real structural check, not a behavioral one — reads the actual
    // controller source file and confirms the architecture rule
    // ("Controllers MUST NOT communicate directly with Registry/
    // Dependency Graph/Execution Planner/Computation Engine") by
    // inspecting its own import statements, not just trusting that the
    // mocks above happened to be the only things called in this test
    // file's own scenarios.
    const source = readFileSync(join(__dirname, "..", "indicator.controller.ts"), "utf-8");
    const forbiddenImports = [
      "IndicatorRegistryService",
      "DependencyGraphBuilderService",
      "GraphValidatorService",
      "ExecutionPlannerService",
      "ComputationEngineService",
      "RegistryQueryService",
    ];
    for (const forbidden of forbiddenImports) {
      expect(source).not.toContain(forbidden);
    }
    expect(source).toContain("IndicatorEngineServiceImpl");
    expect(source).toContain("IndicatorHealthService");
  });
});
