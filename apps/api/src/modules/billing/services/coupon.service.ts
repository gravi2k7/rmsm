import { Injectable } from "@nestjs/common";
import { prisma, Coupon, CouponRedemption, Invoice, Prisma } from "@rmsm/database";
import { ConflictError, NotFoundError, ValidationError } from "@rmsm/shared";
import { AuditService, AuditContext } from "../../auth/services/audit.service";
import { CouponRepository, CreateCouponInput } from "../repositories/coupon.repository";
import { CouponRedemptionRepository } from "../repositories/coupon-redemption.repository";
import { InvoiceRepository } from "../repositories/invoice.repository";

export interface ApplyCouponResult {
  coupon: Coupon;
  redemption: CouponRedemption;
  invoice: Invoice;
}

@Injectable()
export class CouponService {
  constructor(
    private readonly couponRepository: CouponRepository,
    private readonly couponRedemptionRepository: CouponRedemptionRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly auditService: AuditService,
  ) {}

  async createCoupon(data: CreateCouponInput, actorId: string, ctx: AuditContext = {}): Promise<Coupon> {
    const coupon = await this.couponRepository.create(data);
    await this.auditService.log("billing.coupon.created", {
      userId: actorId,
      entityType: "Coupon",
      entityId: coupon.id,
      metadata: { code: data.code },
      ...ctx,
    });
    return coupon;
  }

  /**
   * Read-only eligibility check — no state changed. Used by the "Validate
   * Invitation"-equivalent endpoint (validate before applying) so a
   * caller can show "this coupon is valid" feedback without committing to
   * redeeming it yet.
   */
  async validateCoupon(code: string, organizationId: string): Promise<Coupon> {
    const coupon = await this.couponRepository.findByCode(code);
    if (!coupon || !coupon.isActive) {
      throw new ValidationError("Invalid or inactive coupon code.");
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new ValidationError("This coupon has expired.");
    }
    if (coupon.maxRedemptions !== null && coupon.currentRedemptions >= coupon.maxRedemptions) {
      throw new ConflictError("This coupon has reached its maximum number of redemptions.");
    }
    if (coupon.organizationId && coupon.organizationId !== organizationId) {
      throw new ValidationError("This coupon is not valid for this organization.");
    }

    const existingRedemption = await this.couponRedemptionRepository.findByCouponAndOrganization(
      coupon.id,
      organizationId,
    );
    if (existingRedemption) {
      throw new ConflictError("This organization has already redeemed this coupon.");
    }

    return coupon;
  }

  /**
   * Atomically: re-validates (defense against a race between validate and
   * apply — same "never expose an intermediate invalid state" philosophy
   * as Decision 1 in Module 003), applies the discount to the invoice,
   * records the redemption, and increments the coupon's counter.
   */
  async applyCoupon(
    code: string,
    organizationId: string,
    invoiceId: string,
    actorId: string,
    ctx: AuditContext = {},
  ): Promise<ApplyCouponResult> {
    const coupon = await this.validateCoupon(code, organizationId);

    const invoice = await this.invoiceRepository.findById(invoiceId);
    if (!invoice || invoice.organizationId !== organizationId) {
      throw new NotFoundError("Invoice", invoiceId);
    }
    if (invoice.status !== "DRAFT") {
      throw new ConflictError("Coupons can only be applied to a DRAFT invoice.");
    }

    const discountCents =
      coupon.type === "PERCENTAGE"
        ? Math.round((invoice.subtotalCents * coupon.value) / 100)
        : Math.min(coupon.value, invoice.subtotalCents);
    const totalCents = Math.max(invoice.subtotalCents + invoice.taxCents - discountCents, 0);

    const [updatedCoupon, redemption, updatedInvoice] = await prisma.$transaction(
      async (tx: Prisma.TransactionClient): Promise<[Coupon, CouponRedemption, Invoice]> => {
        // Re-verify inside the transaction — closes the race window
        // between validateCoupon() above and this write.
        const stillValid = await this.couponRedemptionRepository.findByCouponAndOrganization(
          coupon.id,
          organizationId,
          tx,
        );
        if (stillValid) {
          throw new ConflictError("This organization has already redeemed this coupon.");
        }

        const redemptionRow = await this.couponRedemptionRepository.create(
          { couponId: coupon.id, organizationId, invoiceId },
          tx,
        );
        const couponRow = await this.couponRepository.incrementRedemptions(coupon.id, tx);
        const invoiceRow = await this.invoiceRepository.applyDiscount(invoiceId, discountCents, totalCents, tx);

        return [couponRow, redemptionRow, invoiceRow];
      },
    );

    await this.auditService.log("billing.coupon.applied", {
      userId: actorId,
      entityType: "Invoice",
      entityId: invoiceId,
      metadata: { code, discountCents },
      ...ctx,
    });

    return { coupon: updatedCoupon, redemption, invoice: updatedInvoice };
  }

  /** Reverts a coupon's discount from a still-DRAFT invoice. Does not decrement the coupon's redemption counter — the redemption event itself already happened and stays in the historical record. */
  async removeCouponFromInvoice(
    organizationId: string,
    invoiceId: string,
    actorId: string,
    ctx: AuditContext = {},
  ): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findById(invoiceId);
    if (!invoice || invoice.organizationId !== organizationId) {
      throw new NotFoundError("Invoice", invoiceId);
    }
    if (invoice.status !== "DRAFT") {
      throw new ConflictError("Coupons can only be removed from a DRAFT invoice.");
    }

    const restoredTotal = invoice.subtotalCents + invoice.taxCents;
    const updated = await this.invoiceRepository.applyDiscount(invoiceId, 0, restoredTotal);
    await this.auditService.log("billing.coupon.removed", {
      userId: actorId,
      entityType: "Invoice",
      entityId: invoiceId,
      ...ctx,
    });
    return updated;
  }
}
