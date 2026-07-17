import { ExecutionProfile } from "../entities/execution-profile.entity";

describe("ExecutionProfile entity", () => {
  it("starts with the given parameters", () => {
    const profile = new ExecutionProfile("profile-1", "ver-1", "Conservative", { risk_percent: 1 });
    expect(profile.parameters).toEqual({ risk_percent: 1 });
  });

  it("updateParameters() merges overrides on top of existing parameters — a partial update, not a full replacement", () => {
    const profile = new ExecutionProfile("profile-1", "ver-1", "Conservative", { risk_percent: 1, stop_loss_atr: 2 });
    profile.updateParameters({ risk_percent: 2 });
    expect(profile.parameters).toEqual({ risk_percent: 2, stop_loss_atr: 2 });
  });

  it("updateParameters() strips explicit undefined values rather than letting them overwrite a real value", () => {
    const profile = new ExecutionProfile("profile-1", "ver-1", "Conservative", { risk_percent: 1 });
    profile.updateParameters({ risk_percent: undefined, stop_loss_atr: 3 });
    expect(profile.parameters).toEqual({ risk_percent: 1, stop_loss_atr: 3 });
  });

  it("the profile's own name remains a plain mutable field — profiles are runtime configuration, not immutable definitions", () => {
    const profile = new ExecutionProfile("profile-1", "ver-1", "Conservative", {});
    profile.name = "Conservative v2";
    expect(profile.name).toBe("Conservative v2");
  });
});
