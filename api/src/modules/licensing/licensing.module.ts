import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { LicenseRepository } from "./repositories/license.repository";
import { LicenseService } from "./services/license.service";

/**
 * Standalone module (no dependency on AdminModule or BillingModule) so
 * both can import LicenseService without creating an Admin↔Billing
 * circular dependency — AdminModule needs BillingModule (for the existing
 * FeatureFlagRepository, Domain 1's Feature Flag Management), and
 * BillingModule needs License (Domain 2's License Assignment); if License
 * lived inside either module, the other would have to import it,
 * completing a cycle. See license.repository.ts's doc comment.
 */
@Module({
  imports: [AuthModule],
  providers: [LicenseRepository, LicenseService],
  exports: [LicenseRepository, LicenseService],
})
export class LicensingModule {}
