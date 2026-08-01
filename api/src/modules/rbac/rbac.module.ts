import { Module } from "@nestjs/common";
import { RbacController } from "./rbac.controller";
import { RbacService } from "./rbac.service";
import { PermissionRepository } from "./repositories/permission.repository";
import { AuthModule } from "../auth/auth.module";
import { PermissionResolverModule } from "./permission-resolver.module";

@Module({
  imports: [
    AuthModule,
    PermissionResolverModule,
  ],
  controllers: [RbacController],
  providers: [RbacService, PermissionRepository],
  exports: [RbacService, PermissionRepository],
})
export class RbacModule {}