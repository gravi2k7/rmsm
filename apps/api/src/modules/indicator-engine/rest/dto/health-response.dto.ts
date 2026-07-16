import { ApiProperty } from "@nestjs/swagger";

/** Item 8's own field list, exactly: registry status, planner status, computation engine status, dependency graph status, service readiness. Phase 5 addition: `apiReadiness` — a direct Kubernetes-readiness-probe-shaped field (item 3's own explicit "prepare for Kubernetes/readiness checks"), a simple derived rollup of everything else rather than a duplicate check of its own. */
export class HealthResponseDto {
  @ApiProperty({ enum: ["ok", "degraded"] }) status!: "ok" | "degraded";
  @ApiProperty({ enum: ["ok", "error"] }) registryStatus!: "ok" | "error";
  @ApiProperty({ enum: ["ok", "error"] }) plannerStatus!: "ok" | "error";
  @ApiProperty({ enum: ["ok", "error"] }) computationEngineStatus!: "ok" | "error";
  @ApiProperty({ enum: ["ok", "error"] }) dependencyGraphStatus!: "ok" | "error";
  @ApiProperty({ enum: ["INITIALIZING", "READY", "EXECUTING", "SHUTTING_DOWN", "SHUTDOWN"] }) serviceReadiness!: string;
  @ApiProperty({ enum: ["ready", "not_ready"], description: "Direct Kubernetes readiness-probe semantics — 'ready' only when status is 'ok' AND serviceReadiness is READY." }) apiReadiness!: "ready" | "not_ready";
}
