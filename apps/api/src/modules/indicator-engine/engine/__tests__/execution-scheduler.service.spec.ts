import { ExecutionSchedulerService } from "../execution-scheduler.service";
import type { ComputationEngineService } from "../computation-engine.service";
import type { ExecutionRequest } from "../../contracts/execution-request.interface";
import type { ExecutionResult } from "../../contracts/execution-result.interface";

function fakeRequest(id: string): ExecutionRequest {
  return {
    indicatorInstance: { instanceId: id, definitionIdentifier: "ema", definitionVersion: "1.0.0", parameters: {}, updateParameters: jest.fn() },
    timeframe: "ONE_DAY",
    marketDataReference: { instrumentId: "inst1" },
    calculationWindow: { mode: "FULL_RECALCULATION", from: new Date(), to: new Date() },
    executionOptions: {},
  };
}

function fakeResult(id: string): ExecutionResult {
  return {
    executionId: `exec-${id}`,
    indicatorInstanceId: id,
    durationMs: 1,
    lifecycleStatus: "COMPLETED",
    calculationMetadata: { mode: "FULL_RECALCULATION", candleCount: 10 },
    warnings: [],
    errors: [],
    metrics: { queueTimeMs: 0, validationTimeMs: 0, initializationTimeMs: 0, calculationTimeMs: 1, totalDurationMs: 1 },
  };
}

describe("ExecutionSchedulerService", () => {
  it("executes every request sequentially, in array order", async () => {
    const executeOrder: string[] = [];
    const engine = {
      execute: jest.fn(async (req: ExecutionRequest) => {
        executeOrder.push(req.indicatorInstance.instanceId);
        return fakeResult(req.indicatorInstance.instanceId);
      }),
    } as unknown as ComputationEngineService;

    const scheduler = new ExecutionSchedulerService(engine);
    const results = await scheduler.schedule([fakeRequest("a"), fakeRequest("b"), fakeRequest("c")]);

    expect(executeOrder).toEqual(["a", "b", "c"]);
    expect(results.map((r) => r.indicatorInstanceId)).toEqual(["a", "b", "c"]);
  });

  it("returns an empty array for an empty request list, without calling the engine", async () => {
    const engine = { execute: jest.fn() } as unknown as ComputationEngineService;
    const scheduler = new ExecutionSchedulerService(engine);
    const results = await scheduler.schedule([]);
    expect(results).toEqual([]);
    expect(engine.execute).not.toHaveBeenCalled();
  });

  it("cancelAll() stops scheduling further requests once called mid-batch", async () => {
    const engine = {
      execute: jest.fn(async (req: ExecutionRequest) => fakeResult(req.indicatorInstance.instanceId)),
    } as unknown as ComputationEngineService;
    const scheduler = new ExecutionSchedulerService(engine);

    // Cancel after the first request completes, simulated by having the
    // mocked engine call cancelAll() itself mid-execution.
    (engine.execute as jest.Mock).mockImplementationOnce(async (req: ExecutionRequest) => {
      scheduler.cancelAll();
      return fakeResult(req.indicatorInstance.instanceId);
    });

    const results = await scheduler.schedule([fakeRequest("a"), fakeRequest("b"), fakeRequest("c")]);

    expect(results).toHaveLength(1);
    expect(engine.execute).toHaveBeenCalledTimes(1);
  });

  it("a fresh schedule() call resets any prior cancellation state", async () => {
    const engine = {
      execute: jest.fn(async (req: ExecutionRequest) => fakeResult(req.indicatorInstance.instanceId)),
    } as unknown as ComputationEngineService;
    const scheduler = new ExecutionSchedulerService(engine);

    scheduler.cancelAll();
    const results = await scheduler.schedule([fakeRequest("a")]);

    expect(results).toHaveLength(1);
  });
});
