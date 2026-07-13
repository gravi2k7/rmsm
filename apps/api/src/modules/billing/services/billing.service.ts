import { Injectable } from "@nestjs/common";
import { BillingAccount } from "@rmsm/database";
import { ConflictError, NotFoundError } from "@rmsm/shared";
import { AuditService, AuditContext } from "../../auth/services/audit.service";
import {
  BillingAccountRepository,
  CreateBillingAccountInput,
  UpdateBillingAccountInput,
} from "../repositories/billing-account.repository";

/**
 * Owns BillingAccount CRUD (billing email, company name, tax id, address,
 * country, currency, timezone — Section 3 of the Module 004 spec).
 * Deliberately named BillingService, not BillingAccountService, matching
 * the 9 service names given explicitly in the prompt.
 */
@Injectable()
export class BillingService {
  constructor(
    private readonly billingAccountRepository: BillingAccountRepository,
    private readonly auditService: AuditService,
  ) {}

  async createBillingAccount(
    input: CreateBillingAccountInput,
    actorId: string,
    ctx: AuditContext = {},
  ): Promise<BillingAccount> {
    const existing = await this.billingAccountRepository.findByOrganizationId(input.organizationId);
    if (existing) {
      throw new ConflictError("This organization already has a billing account.");
    }

    const account = await this.billingAccountRepository.create(input);
    await this.auditService.log("billing.account.created", {
      userId: actorId,
      entityType: "BillingAccount",
      entityId: account.id,
      metadata: { organizationId: input.organizationId },
      ...ctx,
    });
    return account;
  }

  async getBillingAccount(organizationId: string): Promise<BillingAccount> {
    const account = await this.billingAccountRepository.findByOrganizationId(organizationId);
    if (!account) throw new NotFoundError("BillingAccount", organizationId);
    return account;
  }

  async updateBillingAccount(
    organizationId: string,
    input: UpdateBillingAccountInput,
    actorId: string,
    ctx: AuditContext = {},
  ): Promise<BillingAccount> {
    await this.getBillingAccount(organizationId); // 404s if missing

    const updated = await this.billingAccountRepository.update(organizationId, input);
    await this.auditService.log("billing.account.updated", {
      userId: actorId,
      entityType: "BillingAccount",
      entityId: updated.id,
      metadata: { fields: Object.keys(input) },
      ...ctx,
    });
    return updated;
  }
}
