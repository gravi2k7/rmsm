import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { SessionsController } from "./sessions.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { LocalStrategy } from "./strategies/local.strategy";
import { PasswordService } from "./services/password.service";
import { TokenService } from "./services/token.service";
import { TwoFactorService } from "./services/two-factor.service";
import { SessionService } from "./services/session.service";
import { AuditService } from "./services/audit.service";
import { LoginHistoryService } from "./services/login-history.service";
import { UserRepository } from "./repositories/user.repository";
import { SessionRepository } from "./repositories/session.repository";
import { RefreshTokenRepository } from "./repositories/refresh-token.repository";
import { AuditLogRepository } from "./repositories/audit-log.repository";
import { LoginHistoryRepository } from "./repositories/login-history.repository";
import { PermissionResolverModule } from "../rbac/permission-resolver.module";

@Module({
  imports: [PassportModule, JwtModule.register({}), PermissionResolverModule],
  controllers: [AuthController, SessionsController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    PasswordService,
    TokenService,
    TwoFactorService,
    SessionService,
    AuditService,
    LoginHistoryService,
    UserRepository,
    SessionRepository,
    RefreshTokenRepository,
    AuditLogRepository,
    LoginHistoryRepository,
  ],
  // Exported so RbacModule/UsersModule/OAuthModule can reuse repositories,
  // AuditService, and TokenService without re-instantiating them.
  exports: [
    AuthService,
    TokenService,
    AuditService,
    UserRepository,
    SessionRepository,
    RefreshTokenRepository,
    AuditLogRepository,
  ],
})
export class AuthModule {}
