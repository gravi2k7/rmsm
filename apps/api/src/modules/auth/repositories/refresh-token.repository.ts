import { Injectable } from "@nestjs/common";
import { prisma, RefreshToken, Prisma } from "@rmsm/database";

@Injectable()
export class RefreshTokenRepository {
  create(data: {
    userId: string;
    sessionId: string;
    tokenHash: string;
    family: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  }

  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  markRotated(id: string, replacedByTokenId: string): Promise<RefreshToken> {
    return prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), replacedByTokenId },
    });
  }

  revoke(id: string): Promise<RefreshToken> {
    return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  /** Revokes every token sharing a rotation family — used on reuse detection. */
  revokeFamily(family: string): Promise<Prisma.BatchPayload> {
    return prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
