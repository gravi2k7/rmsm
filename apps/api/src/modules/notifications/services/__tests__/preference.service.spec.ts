import { PreferenceService } from "../preference.service";
import type { NotificationPreferenceRepository } from "../../repositories/notification-preference.repository";
import type { NotificationPreference } from "@rmsm/database";

describe("PreferenceService", () => {
  type RepoMock = jest.Mocked<Pick<NotificationPreferenceRepository, "findApplicable" | "upsert">>;

  function buildService(candidates: Partial<NotificationPreference>[]) {
    const repository: RepoMock = {
      findApplicable: jest.fn().mockResolvedValue(candidates),
      upsert: jest.fn(),
    };
    const service = new PreferenceService(repository as unknown as NotificationPreferenceRepository);
    return { service, repository };
  }

  it("allows the send when no preference row exists at all (opt-out default)", async () => {
    const { service } = buildService([]);
    const decision = await service.isAllowed("user1", "org1", "cat1", "EMAIL");
    expect(decision).toEqual({ allowed: true, redirectToDigest: false });
  });

  it("prefers the exact (category, channel) match over any wildcard", async () => {
    const { service } = buildService([
      { categoryId: null, channel: null, enabled: true },
      { categoryId: "cat1", channel: "EMAIL", enabled: false },
    ]);
    const decision = await service.isAllowed("user1", "org1", "cat1", "EMAIL");
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("opted_out");
  });

  it("falls back to the category-wildcard when no exact match exists", async () => {
    const { service } = buildService([{ categoryId: "cat1", channel: null, enabled: false }]);
    const decision = await service.isAllowed("user1", "org1", "cat1", "EMAIL");
    expect(decision.allowed).toBe(false);
  });

  it("falls back to the full wildcard when nothing more specific exists", async () => {
    const { service } = buildService([{ categoryId: null, channel: null, enabled: false }]);
    const decision = await service.isAllowed("user1", "org1", "cat1", "EMAIL");
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("opted_out");
  });

  it("redirects to digest when the matched preference has a digestFrequency set", async () => {
    const { service } = buildService([{ categoryId: "cat1", channel: "EMAIL", enabled: true, digestFrequency: "DAILY" }]);
    const decision = await service.isAllowed("user1", "org1", "cat1", "EMAIL");
    expect(decision).toEqual({ allowed: false, redirectToDigest: true, reason: "digest_redirect" });
  });

  describe("quiet hours", () => {
    it("blocks sends within a same-day quiet window", async () => {
      const { service } = buildService([
        {
          categoryId: null,
          channel: null,
          enabled: true,
          quietHoursStart: "00:00",
          quietHoursEnd: "23:59",
          timezone: "UTC",
        },
      ]);
      const decision = await service.isAllowed("user1", "org1", undefined, "EMAIL");
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe("quiet_hours");
    });

    it("allows sends outside a narrow quiet window", async () => {
      const { service } = buildService([
        {
          categoryId: null,
          channel: null,
          enabled: true,
          quietHoursStart: "03:00",
          quietHoursEnd: "03:01",
          timezone: "UTC",
        },
      ]);
      const decision = await service.isAllowed("user1", "org1", undefined, "EMAIL");
      // A 1-minute window is exceedingly unlikely to contain "now" —
      // deterministic enough for this test without mocking Date.
      expect(decision.allowed).toBe(true);
    });

    it("ignores quiet hours when neither start nor end is set", async () => {
      const { service } = buildService([{ categoryId: null, channel: null, enabled: true }]);
      const decision = await service.isAllowed("user1", "org1", undefined, "EMAIL");
      expect(decision.allowed).toBe(true);
    });
  });

  describe("setPreference", () => {
    it("delegates to the repository's upsert", async () => {
      const { service, repository } = buildService([]);
      await service.setPreference("user1", "org1", "cat1", "EMAIL", false);
      expect(repository.upsert).toHaveBeenCalledWith({
        userId: "user1",
        organizationId: "org1",
        categoryId: "cat1",
        channel: "EMAIL",
        enabled: false,
      });
    });
  });
});
