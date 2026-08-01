import { CouponService } from "../coupon.service";
import type { CouponRepository } from "../../repositories/coupon.repository";
import type { CouponRedemptionRepository } from "../../repositories/coupon-redemption.repository";
import type { InvoiceRepository } from "../../repositories/invoice.repository";
import type { AuditService } from "../../../auth/services/audit.service";
import type { DomainEventPublisher } from "../../../../common/events/domain-event-publisher.service";
import type { Coupon } from "@rmsm/database";

function fakeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: "coupon-1",
    code: "SAVE10",
    type: "PERCENTAGE",
    value: 10,
    currency: null,
    expiresAt: null,
    maxRedemptions: null,
    currentRedemptions: 0,
    organizationId: null,
    isPublic: true,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  } as Coupon;
}

describe("CouponService (Module 005 additions)", () => {
  let couponRepository: jest.Mocked<CouponRepository>;
  let redemptionRepository: jest.Mocked<CouponRedemptionRepository>;
  let invoiceRepository: jest.Mocked<InvoiceRepository>;
  let audit: jest.Mocked<AuditService>;
  let publisher: jest.Mocked<DomainEventPublisher>;
  let service: CouponService;

  beforeEach(() => {
    couponRepository = {
      create: jest.fn(),
      findByCode: jest.fn(),
      findById: jest.fn(),
      incrementRedemptions: jest.fn(),
      deactivate: jest.fn(),
      findAll: jest.fn(),
    } as unknown as jest.Mocked<CouponRepository>;
    redemptionRepository = {
      findByCouponAndOrganization: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<CouponRedemptionRepository>;
    invoiceRepository = {} as unknown as jest.Mocked<InvoiceRepository>;
    audit = { log: jest.fn() } as unknown as jest.Mocked<AuditService>;
    publisher = { publish: jest.fn(), on: jest.fn(), off: jest.fn() } as unknown as jest.Mocked<DomainEventPublisher>;
    service = new CouponService(couponRepository, redemptionRepository, invoiceRepository, audit, publisher);
  });

  it("createCoupon publishes CouponCreated", async () => {
    couponRepository.create.mockResolvedValue(fakeCoupon());
    await service.createCoupon({ code: "SAVE10", type: "PERCENTAGE", value: 10 }, "actor-1");
    expect(publisher.publish).toHaveBeenCalledWith("CouponCreated", expect.objectContaining({ code: "SAVE10" }));
  });

  it("listCoupons reads through to the repository", async () => {
    couponRepository.findAll.mockResolvedValue([fakeCoupon()]);
    const result = await service.listCoupons();
    expect(couponRepository.findAll).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("deactivateCoupon delegates to the repository and audit-logs", async () => {
    couponRepository.deactivate.mockResolvedValue(fakeCoupon({ isActive: false }));
    const result = await service.deactivateCoupon("coupon-1", "actor-1");
    expect(couponRepository.deactivate).toHaveBeenCalledWith("coupon-1");
    expect(audit.log).toHaveBeenCalledWith("billing.coupon.deactivated", expect.objectContaining({ userId: "actor-1" }));
    expect(result.isActive).toBe(false);
  });
});
