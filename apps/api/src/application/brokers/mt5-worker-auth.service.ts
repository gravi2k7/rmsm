import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import type { Mt5WorkerRepository } from "./mt5-worker.repository";
import { Mt5WorkerService } from "./mt5-worker.service";
import { verifyMt5WorkerSecret } from "./mt5-worker-secret";
import {
  MT5_WORKER_REPOSITORY,
} from "./mt5-worker.tokens";
import { Inject } from "@nestjs/common";

@Injectable()
export class Mt5WorkerAuthService {
  constructor(
    @Inject(MT5_WORKER_REPOSITORY)
    private readonly repository: Mt5WorkerRepository,
  ) {}

  async authenticate(
    workerKey: string,
    secret: string,
  ) {
    const worker =
      await this.repository.findByWorkerKey(workerKey);

    if (!worker) {
      throw new UnauthorizedException(
        "Invalid MT5 worker credentials.",
      );
    }

    if (worker.status === "DISABLED") {
      throw new UnauthorizedException(
        "Invalid MT5 worker credentials.",
      );
    }

    if (
      !verifyMt5WorkerSecret(
        secret,
        worker.authSecretHash,
      )
    ) {
      throw new UnauthorizedException(
        "Invalid MT5 worker credentials.",
      );
    }

    return worker;
  }
}
