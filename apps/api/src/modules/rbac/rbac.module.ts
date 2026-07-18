import { Module } from "@nestjs/common";
import { RbacController } from "./rbac.controller";
import { RbacService } from "./rbac.service";
import { PermissionResolverModule } from "./permission-resolver.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule, PermissionResolverModule], // AuthModule: reuses AuditService
  controllers: [RbacController],
  providers: [RbacService],
})
export class RbacModule {}
