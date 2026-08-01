import { Injectable } from "@nestjs/common";
import { UnauthorizedError } from "@rmsm/shared";
import type { Session, Prisma } from "@rmsm/database";
import { SessionRepository } from "../repositories/session.repository";
import { RefreshTokenRepository } from "../repositories/refresh-token.repository";
import { TokenService } from "./token.service";
import { DomainEventPublisher } from "../../../common/events/domain-event-publisher.service";
import { AUTH_EVENTS } from "../events";

@Injectable()
export class SessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly tokenService: TokenService,
    private readonly eventPublisher: DomainEventPublisher,
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
    this.eventPublisher.publish(AUTH_EVENTS.SESSION_REVOKED, { sessionId, userId });
  }

  async revokeAllExcept(userId: string, currentSessionId: string): Promise<Prisma.BatchPayload> {
    const result = await this.sessionRepository.revokeAllForUser(userId, currentSessionId);
    this.eventPublisher.publish(AUTH_EVENTS.SESSION_REVOKED, { userId, bulk: true, count: result.count });
    return result;
  }
}
