import { Injectable } from "@nestjs/common";
import { UnauthorizedError } from "@rmsm/shared";
import type { Session, Prisma } from "@rmsm/database";
import { SessionRepository } from "../repositories/session.repository";
import { RefreshTokenRepository } from "../repositories/refresh-token.repository";
import { TokenService } from "./token.service";

@Injectable()
export class SessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly tokenService: TokenService,
  ) {}

  async listActive(userId: string): Promise<Session[]> {
    return this.sessionRepository.findActiveByUser(userId);
  }

  async revoke(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new UnauthorizedError("Session not found.");
    }
    await this.sessionRepository.revoke(sessionId);
  }

  revokeAllExcept(userId: string, currentSessionId: string): Promise<Prisma.BatchPayload> {
    return this.sessionRepository.revokeAllForUser(userId, currentSessionId);
  }
}
