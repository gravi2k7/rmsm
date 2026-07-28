import { Module } from "@nestjs/common";
import { RbacController } from "./rbac.controller";
import { RbacService } from "./rbac.service";
import { AuthModule } from "../auth/auth.module";
import { PermissionResolverModule } from "./permission-resolver.module";

@Module({
  imports: [
    AuthModule,
    PermissionResolverModule,
  ],
  controllers: [RbacController],
  providers: [RbacService],
})
export class RbacModule {}