import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { IndicatorHealthService } from "./indicator-health.service";
import { IndicatorDefinitionRegistrarService } from "../registry/indicator-definition-registrar.service";

/**
 * Item 2's own list, exactly: registry integrity, dependency graph
 * integrity, execution engine readiness, service readiness, API
 * readiness. "Startup should fail if core services are invalid" — a
 * real `OnModuleInit` hook, distinct from `IndicatorHealthService`
 * (which reports status on-demand via `GET /indicators/health` without
 * ever crashing the process). This class reuses that same service's
 * own real functional checks (not a second, duplicated implementation
 * — "Do NOT redesign," this phase's own explicit rule, applies to
 * validation logic just as much as anything else) and throws if
 * anything comes back unhealthy, so a genuinely broken deployment
 * (e.g. a registry that somehow ended up with zero definitions, or a
 * dependency graph with an undetected cycle) fails at boot — loudly,
 * immediately, before ever accepting a real request — rather than
 * silently serving `degraded` responses indefinitely.
 *
 * **A critical ordering constraint, made explicit rather than left to
 * declaration-order luck**: this validator's own `onModuleInit` MUST
 * run strictly after `IndicatorDefinitionRegistrarService`'s own
 * `onModuleInit` (which is what actually populates the registry with
 * all 28 definitions) — checking an empty, not-yet-populated registry
 * would make every single app boot fail with a false "registry empty"
 * error, a far worse outcome than the bug this validator exists to
 * catch. NestJS resolves and initializes constructor dependencies
 * before a class's own lifecycle hooks fire, so injecting
 * `IndicatorDefinitionRegistrarService` here (even though its own
 * methods are never called directly) forces the correct order
 * structurally, not by coincidentally declaring providers in the right
 * sequence in the module file — a real, deliberate safeguard against
 * exactly the class of subtle ordering bug this project's own Phase 2A
 * registration-order bug (`AI102_PHASE2A.md`) already proved can happen
 * silently.
 */
@Injectable()
export class IndicatorStartupValidatorService implements OnModuleInit {
  private readonly logger = new Logger(IndicatorStartupValidatorService.name);

  constructor(
    private readonly health: IndicatorHealthService,
    // Intentionally unused beyond forcing initialization order — see
    // this class's own header comment.
    private readonly _registrar: IndicatorDefinitionRegistrarService,
  ) {}

  onModuleInit(): void {
    const result = this.health.check();

    if (result.status === "degraded") {
      const failures = (
        [
          ["registryStatus", result.registryStatus],
          ["plannerStatus", result.plannerStatus],
          ["computationEngineStatus", result.computationEngineStatus],
          ["dependencyGraphStatus", result.dependencyGraphStatus],
        ] as const
      )
        .filter(([, status]) => status === "error")
        .map(([name]) => name);

      const message = `AI-102 startup validation failed — core service(s) unhealthy at boot: ${failures.join(", ")}. Refusing to start; a broken registry or dependency graph must never silently serve degraded responses indefinitely.`;
      this.logger.error(message);
      throw new Error(message);
    }

    this.logger.log(`AI-102 startup validation passed — registry, dependency graph, planner, and computation engine all healthy. Service readiness: ${result.serviceReadiness}.`);
  }
}
