import { Module } from "@nestjs/common";
import { PermissionResolverService } from "./services/permission-resolver.service";

/**
 * `PermissionResolverService` needs to be usable from both `AuthModule`
 * (to compute hierarchy-aware permissions when minting a JWT) and
 * `RbacModule` (to expose hierarchy-inspection endpoints). Since
 * `RbacModule` already imports `AuthModule` (to reuse `AuditService`),
 * having `AuthModule` import `RbacModule` back would create a genuine
 * circular module dependency. This module has no dependency on either,
 * so both import it independently instead.
 */
@Module({
  providers: [PermissionResolverService],
  exports: [PermissionResolverService],
})
export class PermissionResolverModule {}
