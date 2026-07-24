import { Module } from "@nestjs/common";
import { RbacController } from "./rbac.controller";
import { RbacService } from "./rbac.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule], // reuses AuditService
  controllers: [RbacController],
  providers: [RbacService],
})
export class RbacModule {}
