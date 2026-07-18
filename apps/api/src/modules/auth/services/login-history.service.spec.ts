import { LoginHistoryService } from "./login-history.service";
import type { LoginHistoryRepository } from "../repositories/login-history.repository";
import type { PaginatedResult, LoginHistory } from "@rmsm/database";

function fakeRepository(result: PaginatedResult<LoginHistory>): LoginHistoryRepository {
  return { findByUser: jest.fn().mockResolvedValue(result) } as unknown as LoginHistoryRepository;
}

const emptyResult: PaginatedResult<LoginHistory> = {
  data: [],
  pagination: { page: 1, pageSize: 50, totalCount: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
};

describe("LoginHistoryService.list", () => {
  it("delegates to the repository with the given userId and query", async () => {
    const repository = fakeRepository(emptyResult);
    const service = new LoginHistoryService(repository);

    await service.list("user-1", { page: 2, pageSize: 10 });

    expect(repository.findByUser).toHaveBeenCalledWith("user-1", { page: 2, pageSize: 10 });
  });

  it("returns the repository's paginated result unchanged", async () => {
    const populated: PaginatedResult<LoginHistory> = {
      data: [
        {
          id: "1",
          userId: "user-1",
          email: "a@b.com",
          success: true,
          reason: null,
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
        },
      ],
      pagination: { page: 1, pageSize: 50, totalCount: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    };
    const service = new LoginHistoryService(fakeRepository(populated));

    const result = await service.list("user-1", {});

    expect(result).toBe(populated);
  });
});
