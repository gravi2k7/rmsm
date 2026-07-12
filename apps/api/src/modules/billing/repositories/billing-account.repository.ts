import { Injectable } from "@nestjs/common";
import { prisma, BillingAccount, DbClient, Prisma } from "@rmsm/database";

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
}

export interface CreateBillingAccountInput {
  organizationId: string;
  billingEmail: string;
  companyName?: string;
  taxId?: string;
  address?: BillingAddress;
  country: string;
  currency?: string;
  timezone?: string;
}

export interface UpdateBillingAccountInput {
  billingEmail?: string;
  companyName?: string | null;
  taxId?: string | null;
  address?: BillingAddress;
  country?: string;
  currency?: string;
  timezone?: string;
}

/**
 * `Record`-shaped inputs (here, `BillingAddress`) are not structurally
 * assignable to `Prisma.InputJsonValue` — same class of issue fixed
 * repeatedly across this project (AuditService, OrganizationMembershipEventRepository,
 * OrganizationRepository). Applied proactively here rather than waiting to
 * hit it. Parameter typed as `object`, not `Record<string, unknown>` —
 * a named interface without an index signature (like `BillingAddress`) is
 * not assignable to `Record<string, unknown>` even though it's a
 * perfectly ordinary object; `object` has no such restriction and still
 * excludes primitives, which is all this helper actually needs to rule out.
 */
function toInputJsonValue(value: object): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class BillingAccountRepository {
  create(data: CreateBillingAccountInput, client: DbClient = prisma): Promise<BillingAccount> {
    return client.billingAccount.create({
      data: {
        organizationId: data.organizationId,
        billingEmail: data.billingEmail,
        companyName: data.companyName,
        taxId: data.taxId,
        address: data.address ? toInputJsonValue(data.address) : undefined,
        country: data.country,
        currency: data.currency,
        timezone: data.timezone,
      },
    });
  }

  findByOrganizationId(organizationId: string, client: DbClient = prisma): Promise<BillingAccount | null> {
    return client.billingAccount.findUnique({ where: { organizationId } });
  }

  /**
   * Field-by-field construction, not `{ ...data }` — same reasoning as
   * OrganizationRepository.updateDetails(): a spread would carry the
   * loosely-typed `address` through unconverted.
   */
  update(
    organizationId: string,
    data: UpdateBillingAccountInput,
    client: DbClient = prisma,
  ): Promise<BillingAccount> {
    return client.billingAccount.update({
      where: { organizationId },
      data: {
        billingEmail: data.billingEmail,
        companyName: data.companyName,
        taxId: data.taxId,
        address: data.address !== undefined ? toInputJsonValue(data.address) : undefined,
        country: data.country,
        currency: data.currency,
        timezone: data.timezone,
      },
    });
  }
}
