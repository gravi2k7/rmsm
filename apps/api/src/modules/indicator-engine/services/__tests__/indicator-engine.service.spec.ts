import { IndicatorEngineServiceImpl } from "../indicator-engine.service";
import type { IndicatorQueryServiceImpl } from "../indicator-query.service";
import type { IndicatorExecutionServiceImpl } from "../indicator-execution.service";
import type { IndicatorValidationServiceImpl } from "../indicator-validation.service";
import type { IndicatorLifecycleServiceImpl } from "../indicator-lifecycle.service";
import type { ExecuteIndicatorRequest } from "../../contracts/service-models.interface";

/**
 * `IndicatorEngineServiceImpl` is the single public entry point — these
 * tests confirm it genuinely delegates to the internal services (no
 * orchestration logic duplicated here) and correctly brackets an
 * execution with lifecycle state transitions, the one piece of real
 * behavior this facade adds beyond pure delegation.
 */
describe("IndicatorEngineServiceImpl (the single public entry point)", () => {
  function buildFacade() {
    const queryService = { list: jest.fn().mockReturnValue({ indicators: [], totalCount: 0 }), lookup: jest.fn() } as unknown as IndicatorQueryServiceImpl;
    const executionService = { execute: jest.fn().mockResolvedValue({ summary: { status: "COMPLETED" }, stepResults: {}, errors: [] }) } as unknown as IndicatorExecutionServiceImpl;
    const validationService = { validate: jest.fn().mockReturnValue({ valid: true, errors: [] }) } as unknown as IndicatorValidationServiceImpl;
    const lifecycleService = { markExecuting: jest.fn(), markReady: jest.fn(), getState: jest.fn() } as unknown as IndicatorLifecycleServiceImpl;
    const facade = new IndicatorEngineServiceImpl(queryService, executionService, validationService, lifecycleService);
    return { facade, queryService, executionService, validationService, lifecycleService };
  }

  it("execute() delegates to IndicatorExecutionServiceImpl", async () => {
    const { facade, executionService } = buildFacade();
    const request = { indicatorIdentifier: "ema" } as ExecuteIndicatorRequest;
    await facade.execute(request);
    expect(executionService.execute).toHaveBeenCalledWith(request);
  });

  it("execute() brackets the call with markExecuting() then markReady(), in that order", async () => {
    const { facade, lifecycleService } = buildFacade();
    const callOrder: string[] = [];
    (lifecycleService.markExecuting as jest.Mock).mockImplementation(() => callOrder.push("executing"));
    (lifecycleService.markReady as jest.Mock).mockImplementation(() => callOrder.push("ready"));

    await facade.execute({ indicatorIdentifier: "ema" } as ExecuteIndicatorRequest);

    expect(callOrder).toEqual(["executing", "ready"]);
  });

  it("execute() still calls markReady() even when the underlying execution throws — the facade never leaves the service stuck in EXECUTING", async () => {
    const { facade, executionService, lifecycleService } = buildFacade();
    (executionService.execute as jest.Mock).mockRejectedValue(new Error("boom"));

    await expect(facade.execute({ indicatorIdentifier: "ema" } as ExecuteIndicatorRequest)).rejects.toThrow("boom");
    expect(lifecycleService.markReady).toHaveBeenCalled();
  });

  it("query() delegates to IndicatorQueryServiceImpl.list()", () => {
    const { facade, queryService } = buildFacade();
    facade.query({ category: "TREND" });
    expect(queryService.list).toHaveBeenCalledWith({ category: "TREND" });
  });

  it("lookup() delegates to IndicatorQueryServiceImpl.lookup()", () => {
    const { facade, queryService } = buildFacade();
    facade.lookup("ema", "1.0.0");
    expect(queryService.lookup).toHaveBeenCalledWith("ema", "1.0.0");
  });

  it("validate() delegates to IndicatorValidationServiceImpl.validate()", () => {
    const { facade, validationService } = buildFacade();
    const request = { indicatorIdentifier: "ema", parameters: {}, timeframe: "ONE_DAY" };
    facade.validate(request);
    expect(validationService.validate).toHaveBeenCalledWith(request);
  });
});
