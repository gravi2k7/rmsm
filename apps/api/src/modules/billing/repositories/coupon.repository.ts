import { Injectable } from "@nestjs/common";
import { prisma, Coupon, CouponType, DbClient } from "@rmsm/database";

export interface CreateCouponInput {
  code: string;
  type: CouponType;
  value: number;
  currency?: string;
  expiresAt?: Date;
  maxRedemptions?: number;
  organizationId?: string;
  isPublic?: boolean;
}

@Injectable()
export class CouponRepository {
  create(data: CreateCouponInput, client: DbClient = prisma): Promise<Coupon> {
    return client.coupon.create({ data });
  }

  findByCode(code: string, client: DbClient = prisma): Promise<Coupon | null> {
    return client.coupon.findUnique({ where: { code } });
  }

  findById(id: string, client: DbClient = prisma): Promise<Coupon | null> {
    return client.coupon.findUnique({ where: { id } });
  }

  incrementRedemptions(id: string, client: DbClient = prisma): Promise<Coupon> {
    return client.coupon.update({ where: { id }, data: { currentRedemptions: { increment: 1 } } });
  }

  deactivate(id: string, client: DbClient = prisma): Promise<Coupon> {
    return client.coupon.update({ where: { id }, data: { isActive: false } });
  }
}
