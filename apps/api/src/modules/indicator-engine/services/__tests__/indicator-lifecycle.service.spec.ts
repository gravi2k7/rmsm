import { IndicatorLifecycleServiceImpl } from "../indicator-lifecycle.service";

describe("IndicatorLifecycleServiceImpl", () => {
  it("starts at INITIALIZING before onModuleInit runs", () => {
    const service = new IndicatorLifecycleServiceImpl();
    expect(service.getState()).toBe("INITIALIZING");
  });

  it("onModuleInit() transitions to READY", () => {
    const service = new IndicatorLifecycleServiceImpl();
    service.onModuleInit();
    expect(service.getState()).toBe("READY");
  });

  it("markExecuting() then markReady() round-trips correctly", () => {
    const service = new IndicatorLifecycleServiceImpl();
    service.onModuleInit();
    service.markExecuting();
    expect(service.getState()).toBe("EXECUTING");
    service.markReady();
    expect(service.getState()).toBe("READY");
  });

  it("onModuleDestroy() transitions through SHUTTING_DOWN to SHUTDOWN", () => {
    const service = new IndicatorLifecycleServiceImpl();
    service.onModuleInit();
    service.onModuleDestroy();
    expect(service.getState()).toBe("SHUTDOWN");
  });

  it("ignores an invalid transition rather than throwing or silently forcing it", () => {
    const service = new IndicatorLifecycleServiceImpl();
    // Still INITIALIZING — markExecuting() is not a valid transition from there.
    service.markExecuting();
    expect(service.getState()).toBe("INITIALIZING");
  });

  it("SHUTDOWN is terminal — no further transition succeeds", () => {
    const service = new IndicatorLifecycleServiceImpl();
    service.onModuleInit();
    service.onModuleDestroy();
    service.initialize();
    expect(service.getState()).toBe("SHUTDOWN");
  });
});
