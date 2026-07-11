import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("liveness() returns status ok", () => {
    const controller = new HealthController();
    const result = controller.liveness();
    expect(result.status).toBe("ok");
    expect(result.timestamp).toBeDefined();
  });
});
