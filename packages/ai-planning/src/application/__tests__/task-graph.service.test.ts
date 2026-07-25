import { describe, expect, it } from "vitest";
import { TaskGraphService } from "../services/task-graph.service";
import { TaskStatus } from "../../domain/enums/planning.enum";
import { CyclicDependencyError, UnknownDependencyError } from "../../domain/errors/planning-domain.errors";
import type { PlanTask } from "../../domain/entities/plan-task.entity";

describe("TaskGraphService", () => {
  const graph = new TaskGraphService();

  it("builds sequential layers for a linear chain", () => {
    const layers = graph.buildLayers([
      { id: "a", dependsOn: [] },
      { id: "b", dependsOn: ["a"] },
      { id: "c", dependsOn: ["b"] },
    ]);
    expect(layers).toEqual([["a"], ["b"], ["c"]]);
  });

  it("groups independent tasks into the same parallel layer", () => {
    const layers = graph.buildLayers([
      { id: "a", dependsOn: [] },
      { id: "b", dependsOn: [] },
      { id: "c", dependsOn: ["a", "b"] },
    ]);
    expect(layers).toEqual([["a", "b"], ["c"]]);
  });

  it("throws CyclicDependencyError for a circular graph", () => {
    expect(() =>
      graph.buildLayers([
        { id: "a", dependsOn: ["b"] },
        { id: "b", dependsOn: ["a"] },
      ]),
    ).toThrow(CyclicDependencyError);
  });

  it("throws UnknownDependencyError for a dangling reference", () => {
    expect(() => graph.buildLayers([{ id: "a", dependsOn: ["ghost"] }])).toThrow(UnknownDependencyError);
  });

  it("computes ready ids for tasks whose dependencies are all completed", () => {
    const tasks: PlanTask[] = [
      { id: "a", description: "a", dependsOn: [], status: TaskStatus.COMPLETED },
      { id: "b", description: "b", dependsOn: ["a"], status: TaskStatus.PENDING },
      { id: "c", description: "c", dependsOn: ["b"], status: TaskStatus.PENDING },
    ];
    expect(graph.computeReadyIds(tasks)).toEqual(["b"]);
  });

  it("applyReadiness promotes eligible pending tasks to READY", () => {
    const tasks: PlanTask[] = [
      { id: "a", description: "a", dependsOn: [], status: TaskStatus.PENDING },
      { id: "b", description: "b", dependsOn: ["a"], status: TaskStatus.PENDING },
    ];
    const updated = graph.applyReadiness(tasks);
    expect(updated.find((t) => t.id === "a")?.status).toBe(TaskStatus.READY);
    expect(updated.find((t) => t.id === "b")?.status).toBe(TaskStatus.PENDING);
  });
});
