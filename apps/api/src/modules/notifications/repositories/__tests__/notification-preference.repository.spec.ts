import { NotificationPreferenceRepository } from "../notification-preference.repository";

/**
 * Mocks `@rmsm/database`'s `prisma` singleton directly — the standard way
 * to unit test a repository in this shape (repositories call the
 * singleton, not an injected client, when no transaction is in progress;
 * see DbClient's default parameter). This is the most bug-prone
 * repository in this phase: it deliberately avoids `upsert` on a
 * compound key with two nullable components (see the file's own class
 * comment), so these tests specifically verify that avoidance actually
 * behaves correctly — find-then-branch, not a blind create.
 */
jest.mock("@rmsm/database", () => ({
  prisma: {
    notificationPreference: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("@rmsm/database") as {
  prisma: {
    notificationPreference: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      delete: jest.Mock;
    };
  };
};

describe("NotificationPreferenceRepository", () => {
  let repository: NotificationPreferenceRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new NotificationPreferenceRepository();
  });

  describe("upsert", () => {
    it("creates a new row when no matching preference exists", async () => {
      prisma.notificationPreference.findFirst.mockResolvedValue(null);
      prisma.notificationPreference.create.mockResolvedValue({ id: "pref1" });

      await repository.upsert({
        userId: "user1",
        organizationId: "org1",
        categoryId: null,
        channel: "EMAIL",
        enabled: true,
      });

      expect(prisma.notificationPreference.findFirst).toHaveBeenCalledWith({
        where: { userId: "user1", organizationId: "org1", categoryId: null, channel: "EMAIL" },
      });
      expect(prisma.notificationPreference.create).toHaveBeenCalled();
      expect(prisma.notificationPreference.update).not.toHaveBeenCalled();
    });

    it("updates the existing row instead of creating a duplicate when one already exists", async () => {
      prisma.notificationPreference.findFirst.mockResolvedValue({ id: "existing-pref" });
      prisma.notificationPreference.update.mockResolvedValue({ id: "existing-pref" });

      await repository.upsert({
        userId: "user1",
        organizationId: "org1",
        categoryId: null,
        channel: null,
        enabled: false,
      });

      expect(prisma.notificationPreference.update).toHaveBeenCalledWith({
        where: { id: "existing-pref" },
        data: expect.objectContaining({ enabled: false }),
      });
      expect(prisma.notificationPreference.create).not.toHaveBeenCalled();
    });

    it("treats undefined categoryId/channel the same as explicit null (both are the wildcard)", async () => {
      prisma.notificationPreference.findFirst.mockResolvedValue(null);
      prisma.notificationPreference.create.mockResolvedValue({ id: "pref2" });

      await repository.upsert({
        userId: "user1",
        organizationId: "org1",
        enabled: true,
      });

      expect(prisma.notificationPreference.findFirst).toHaveBeenCalledWith({
        where: { userId: "user1", organizationId: "org1", categoryId: null, channel: null },
      });
    });
  });

  describe("findApplicable", () => {
    it("queries for the exact match plus both wildcard combinations", async () => {
      prisma.notificationPreference.findMany.mockResolvedValue([]);

      await repository.findApplicable("user1", "org1", "cat1", "EMAIL");

      expect(prisma.notificationPreference.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user1",
          organizationId: "org1",
          OR: [
            { categoryId: "cat1", channel: "EMAIL" },
            { categoryId: null, channel: "EMAIL" },
            { categoryId: "cat1", channel: null },
            { categoryId: null, channel: null },
          ],
        },
      });
    });
  });
});
