import { ApiProperty } from "@nestjs/swagger";

/** Item 8's own field list, exactly: registry status, planner status, computation engine status, dependency graph status, service readiness. */
export class HealthResponseDto {
  @ApiProperty({ enum: ["ok", "degraded"] }) status!: "ok" | "degraded";
  @ApiProperty({ enum: ["ok", "error"] }) registryStatus!: "ok" | "error";
  @ApiProperty({ enum: ["ok", "error"] }) plannerStatus!: "ok" | "error";
  @ApiProperty({ enum: ["ok", "error"] }) computationEngineStatus!: "ok" | "error";
  @ApiProperty({ enum: ["ok", "error"] }) dependencyGraphStatus!: "ok" | "error";
  @ApiProperty({ enum: ["INITIALIZING", "READY", "EXECUTING", "SHUTTING_DOWN", "SHUTDOWN"] }) serviceReadiness!: string;
}
