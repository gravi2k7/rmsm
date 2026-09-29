import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

import { Mt5WorkerAuthService } from "./mt5-worker-auth.service";

@Injectable()
export class Mt5WorkerAuthGuard
  implements CanActivate
{
  constructor(
    private readonly authService: Mt5WorkerAuthService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<Request>();

    const workerKey =
      request.params?.workerKey;

    const authorization =
      request.header("authorization") ?? "";

    const match =
      authorization.match(
        /^Bearer\s+(.+)$/i,
      );

    if (!workerKey || !match?.[1]) {
      throw new UnauthorizedException(
        "MT5 worker authentication required.",
      );
    }

    await this.authService.authenticate(
      workerKey,
      match[1],
    );

    return true;
  }
}
