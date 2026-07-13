import { NotificationRepository } from "../notification.repository";

jest.mock("@rmsm/database", () => ({
  prisma: {
    notification: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("@rmsm/database") as {
  prisma: {
    notification: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
  };
};

describe("NotificationRepository", () => {
  let repository: NotificationRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new NotificationRepository();
  });

  describe("findByRecipient", () => {
    it("excludes soft-deleted rows unconditionally", async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      await repository.findByRecipient("user1", "org1", {}, { take: 20, skip: 0 });
      const callArg = prisma.notification.findMany.mock.calls[0][0];
      expect(callArg.where.deletedAt).toBeNull();
    });

    it("applies status/channel/category filters only when provided", async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      await repository.findByRecipient(
        "user1",
        "org1",
        { status: "READ", channel: "EMAIL" },
        { take: 20, skip: 0 },
      );
      const callArg = prisma.notification.findMany.mock.calls[0][0];
      expect(callArg.where.status).toBe("READ");
      expect(callArg.where.channel).toBe("EMAIL");
      expect(callArg.where.categoryId).toBeUndefined();
    });

    it("builds a case-insensitive OR search across subject and body when search is provided", async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      await repository.findByRecipient("user1", "org1", { search: "invoice" }, { take: 20, skip: 0 });
      const callArg = prisma.notification.findMany.mock.calls[0][0];
      expect(callArg.where.OR).toEqual([
        { subject: { contains: "invoice", mode: "insensitive" } },
        { body: { contains: "invoice", mode: "insensitive" } },
      ]);
    });

    it("respects pagination parameters", async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      await repository.findByRecipient("user1", "org1", {}, { take: 10, skip: 30 });
      const callArg = prisma.notification.findMany.mock.calls[0][0];
      expect(callArg.take).toBe(10);
      expect(callArg.skip).toBe(30);
    });
  });

  describe("markRead / markArchived", () => {
    it("markRead sets status=READ and a readAt timestamp", async () => {
      prisma.notification.update.mockResolvedValue({ id: "n1" });
      await repository.markRead("n1");
      const callArg = prisma.notification.update.mock.calls[0][0];
      expect(callArg.data.status).toBe("READ");
      expect(callArg.data.readAt).toBeInstanceOf(Date);
    });

    it("markArchived sets status=ARCHIVED and an archivedAt timestamp", async () => {
      prisma.notification.update.mockResolvedValue({ id: "n1" });
      await repository.markArchived("n1");
      const callArg = prisma.notification.update.mock.calls[0][0];
      expect(callArg.data.status).toBe("ARCHIVED");
      expect(callArg.data.archivedAt).toBeInstanceOf(Date);
    });
  });

  describe("softDelete", () => {
    it("sets deletedAt without changing status", async () => {
      prisma.notification.update.mockResolvedValue({ id: "n1" });
      await repository.softDelete("n1");
      const callArg = prisma.notification.update.mock.calls[0][0];
      expect(callArg.data.deletedAt).toBeInstanceOf(Date);
      expect(callArg.data.status).toBeUndefined();
    });
  });
});
