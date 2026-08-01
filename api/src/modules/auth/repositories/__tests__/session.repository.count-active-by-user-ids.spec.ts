const mockCount = jest.fn();
jest.mock("@rmsm/database", () => ({
  prisma: { session: { count: (...args: unknown[]) => mockCount(...args) } },
}));

import { SessionRepository } from "../session.repository";

describe("SessionRepository.countActiveByUserIds (Module 003 addition)", () => {
  beforeEach(() => mockCount.mockReset());

  it("queries only non-revoked, non-expired sessions for the given user ids", async () => {
    mockCount.mockResolvedValue(2);
    const repository = new SessionRepository();

    const result = await repository.countActiveByUserIds(["user-1", "user-2"]);

    expect(result).toBe(2);
    expect(mockCount).toHaveBeenCalledWith({
      where: {
        userId: { in: ["user-1", "user-2"] },
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
    });
  });

  it("short-circuits to 0 without querying Prisma when given an empty list", async () => {
    const repository = new SessionRepository();

    const result = await repository.countActiveByUserIds([]);

    expect(result).toBe(0);
    expect(mockCount).not.toHaveBeenCalled();
  });
});
