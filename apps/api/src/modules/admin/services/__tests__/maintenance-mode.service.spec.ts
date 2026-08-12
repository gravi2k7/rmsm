import { MaintenanceModeService } from "../maintenance-mode.service";
import type { MaintenanceWindowRepository } from "../../repositories/maintenance-window.repository";
import type { AuditService } from "../../../auth/services/audit.service";
import type { MaintenanceWindow } from "@rmsm/database";

function fakeState(overrides: Partial<MaintenanceWindow> = {}): MaintenanceWindow {
  return {
    id: "singleton",
    isEnabled: false,
    message: null,
    enabledById: null,
    enabledAt: null,
    disabledAt: null,
    updatedAt: new Date(),
    ...overrides,
  } as MaintenanceWindow;
}

describe("MaintenanceModeService", () => {
  let repo: jest.Mocked<MaintenanceWindowRepository>;
  let audit: jest.Mocked<AuditService>;
  let service: MaintenanceModeService;

  beforeEach(() => {
    repo = {
      getState: jest.fn(),
      enable: jest.fn(),
      disable: jest.fn(),
    } as unknown as jest.Mocked<MaintenanceWindowRepository>;
    audit = { log: jest.fn() } as unknown as jest.Mocked<AuditService>;
    service = new MaintenanceModeService(repo, audit);
  });

  it("enable() delegates to the repository with the message and audit-logs", async () => {
    repo.enable.mockResolvedValue(fakeState({ isEnabled: true, message: "Upgrading DB" }));
    const result = await service.enable("Upgrading DB", "actor-1");
    expect(repo.enable).toHaveBeenCalledWith("Upgrading DB", "actor-1");
    expect(audit.log).toHaveBeenCalledWith("maintenance-mode.enabled", expect.objectContaining({ userId: "actor-1" }));
    expect(result.isEnabled).toBe(true);
  });

  it("disable() delegates to the repository and audit-logs", async () => {
    repo.disable.mockResolvedValue(fakeState({ isEnabled: false }));
    const result = await service.disable("actor-1");
    expect(repo.disable).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith("maintenance-mode.disabled", expect.anything());
    expect(result.isEnabled).toBe(false);
  });

  it("getState() reads through to the repository", async () => {
    repo.getState.mockResolvedValue(fakeState());
    await service.getState();
    expect(repo.getState).toHaveBeenCalled();
  });
});
