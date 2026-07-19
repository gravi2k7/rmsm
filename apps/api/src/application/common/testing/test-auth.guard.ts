import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { AccessTokenPayload } from "../../../modules/auth/services/token.service";

/**
 * Test double for `PermissionsGuard` — always allows, and injects a
 * fake, fully-permissioned `AccessTokenPayload` onto the request so
 * `@CurrentUser()` (used by the Decision controller's approve/reject
 * endpoints) has something real to read. These integration tests build
 * each application module in isolation (not the full `AppModule`), so
 * there's no global `JwtAuthGuard`/passport strategy populating
 * `request.user` the way a real request would — this is the isolated-
 * module-test equivalent of "the caller is already authenticated,"
 * matching Phase 4A's own stated goal of testing the application layer
 * against its own dependencies, not re-testing Module 002's already-
 * covered JWT/RBAC stack.
 */
@Injectable()
export class TestAuthGuard implements CanActivate {
  static readonly TEST_USER: AccessTokenPayload = {
    sub: "test-user-id",
    email: "test@example.com",
    roles: ["SUPER_ADMIN"],
    permissions: [
      "markets.read",
      "strategies.read",
      "strategies.write",
      "opportunities.read",
      "decisions.read",
      "decisions.approve",
      "executions.read",
      "executions.write",
      "portfolio.read",
    ],
    sessionId: "test-session-id",
  };

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = TestAuthGuard.TEST_USER;
    return true;
  }
}
