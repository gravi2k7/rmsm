import { Injectable } from "@nestjs/common";
import type { LoginHistory } from "@rmsm/database";
import type { OffsetPaginationQuery, PaginatedResult } from "@rmsm/database";
import { LoginHistoryRepository } from "../repositories/login-history.repository";

@Injectable()
export class LoginHistoryService {
  constructor(private readonly loginHistoryRepository: LoginHistoryRepository) {}

  list(userId: string, query: OffsetPaginationQuery): Promise<PaginatedResult<LoginHistory>> {
    return this.loginHistoryRepository.findByUser(userId, query);
  }
}
