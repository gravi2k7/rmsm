import { Injectable } from "@nestjs/common";
import { prisma, CouponRedemption, DbClient } from "@rmsm/database";

export interface CreateCouponRedemptionInput {
  couponId: string;
  organizationId: string;
  invoiceId?: string;
}

@Injectable()
export class CouponRedemptionRepository {
  create(data: CreateCouponRedemptionInput, client: DbClient = prisma): Promise<CouponRedemption> {
    return client.couponRedemption.create({ data });
  }

  /** Enforces the "one redemption per (coupon, organization)" rule's read side — CouponService checks this before redeeming; the @@unique constraint is the database-level backstop. */
  findByCouponAndOrganization(
    couponId: string,
    organizationId: string,
    client: DbClient = prisma,
  ): Promise<CouponRedemption | null> {
    return client.couponRedemption.findUnique({
      where: { couponId_organizationId: { couponId, organizationId } },
    });
  }
}
