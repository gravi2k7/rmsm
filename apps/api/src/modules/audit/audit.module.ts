import { Module } from "@nestjs/common";
import { AuditController } from "./audit.controller";
import { AuditQueryService } from "./services/audit-query.service";
import { AuthModule } from "../auth/auth.module";

/**
 * Module 004 Domain 4 — new feature module for the admin audit-search
 * surface. Imports `AuthModule` to reuse its exported `AuditLogRepository`
 * rather than re-registering it here (would create two separate DI
 * instances of what should be a single repository).
 */
@Module({
  imports: [AuthModule],
  controllers: [AuditController],
  providers: [AuditQueryService],
  exports: [AuditQueryService],
})
export class AuditModule {}
