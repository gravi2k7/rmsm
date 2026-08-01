import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { OrganizationsModule } from "../organizations.module";
import { BillingModule } from "../../billing/billing.module";
import { OrganizationDashboardService } from "./organization-dashboard.service";
import { OrganizationDashboardController } from "./organization-dashboard.controller";
import { OrganizationRoleGuard } from "../guards/organization-role.guard";
import { CurrentOrganizationGuard } from "../guards/current-organization.guard";

/**
 * Separate module, not folded into OrganizationsModule — see
 * organization-dashboard.service.ts's class comment for why (avoiding a
 * circular OrganizationsModule <-> BillingModule dependency, since
 * BillingModule already imports OrganizationsModule). Depending on both
 * already-existing modules from a new third module is the standard
 * NestJS resolution for this shape, and requires no change to either
 * OrganizationsModule or BillingModule's own imports/exports.
 *
 * OrganizationRoleGuard and CurrentOrganizationGuard are re-declared as
 * providers here (not imported as instances) because Nest resolves
 * `@UseGuards(SomeClass)` against the providers visible to the module
 * that owns the controller; both guards' own dependencies
 * (OrganizationMembershipRepository, Reflector) are satisfied via
 * OrganizationsModule's exports, so this creates a second lightweight
 * instance of each guard, not a second implementation.
 */
@Module({
  imports: [AuthModule, OrganizationsModule, BillingModule],
  controllers: [OrganizationDashboardController],
  providers: [OrganizationDashboardService, OrganizationRoleGuard, CurrentOrganizationGuard],
})
export class OrganizationDashboardModule {}
