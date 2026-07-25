import { TaskStatus } from "../../domain/enums/planning.enum";
import type { PlanTask, PlanTaskDraft } from "../../domain/entities/plan-task.entity";
import type { TaskGraphLayers } from "../../domain/entities/task-graph.entity";
import { CyclicDependencyError, UnknownDependencyError } from "../../domain/errors/planning-domain.errors";

type GraphNode = Pick<PlanTaskDraft, "id" | "dependsOn">;

/**
 * Dependency resolution and parallel-planning support for a task graph.
 * Pure, stateless graph algorithms — no persistence, no events. Shared
 * by `PlanValidatorService` (cycle/reference checks), `PlanningService`
 * (initial readiness), and `RePlannerService` (readiness after a
 * partial re-plan).
 */
export class TaskGraphService {
  /** Kahn's algorithm: repeatedly peels off every node with no
   * remaining unresolved dependency into the next layer. Every id
   * within a layer is independent of every other id in that same
   * layer and so may run in parallel — this is "parallel planning."
   * Throws `CyclicDependencyError` if nodes remain after no further
   * layer can be peeled off. */
  buildLayers(tasks: readonly GraphNode[]): TaskGraphLayers {
    this.assertKnownDependencies(tasks);

    const remaining = new Map(tasks.map((task) => [task.id, new Set(task.dependsOn)]));
    const layers: string[][] = [];

    while (remaining.size > 0) {
      const ready = [...remaining.entries()].filter(([, deps]) => deps.size === 0).map(([id]) => id);
      if (ready.length === 0) {
        throw new CyclicDependencyError([...remaining.keys()]);
      }

      layers.push(ready.sort());
      for (const id of ready) {
        remaining.delete(id);
      }
      for (const deps of remaining.values()) {
        for (const id of ready) {
          deps.delete(id);
        }
      }
    }

    return layers;
  }

  /** Returns every task id currently `PENDING` whose dependencies have
   * all reached `COMPLETED` — the set eligible to transition to
   * `READY` right now ("dependency resolution" applied at runtime,
   * as opposed to `buildLayers`' static, whole-plan view). */
  computeReadyIds(tasks: readonly PlanTask[]): readonly string[] {
    const statusById = new Map(tasks.map((task) => [task.id, task.status]));
    return tasks
      .filter((task) => task.status === TaskStatus.PENDING)
      .filter((task) => task.dependsOn.every((depId) => statusById.get(depId) === TaskStatus.COMPLETED))
      .map((task) => task.id);
  }

  /** Returns a copy of `tasks` with every currently-`PENDING` task whose
   * dependencies are all `COMPLETED` promoted to `READY`. */
  applyReadiness(tasks: readonly PlanTask[]): readonly PlanTask[] {
    const readyIds = new Set(this.computeReadyIds(tasks));
    return tasks.map((task) => (readyIds.has(task.id) ? { ...task, status: TaskStatus.READY } : task));
  }

  private assertKnownDependencies(tasks: readonly GraphNode[]): void {
    const knownIds = new Set(tasks.map((task) => task.id));
    for (const task of tasks) {
      for (const depId of task.dependsOn) {
        if (!knownIds.has(depId)) {
          throw new UnknownDependencyError(task.id, depId);
        }
      }
    }
  }
}
