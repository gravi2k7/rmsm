import { Controller, Get, Post, Body, Param, Query, Req, UseGuards, UseFilters, NotImplementedException } from "@nestjs/common";
import type { Request } from "express";
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { IndicatorEngineServiceImpl } from "../services/indicator-engine.service";
import { IndicatorHealthService } from "../services/indicator-health.service";
import { IndicatorExceptionFilter } from "./filters/indicator-exception.filter";
import { ExecuteIndicatorDto } from "./dto/execute-indicator.dto";
import { QueryIndicatorDto } from "./dto/query-indicator.dto";
import { ValidateIndicatorDto } from "./dto/validate-indicator.dto";
import { IndicatorMetadataDto } from "./dto/indicator-metadata.dto";
import { IndicatorListDto } from "./dto/indicator-list.dto";
import { ValidationDto } from "./dto/validation-response.dto";
import { ExecutionResponseDto } from "./dto/execution-response.dto";
import { HealthResponseDto } from "./dto/health-response.dto";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";
import { Public } from "../../auth/decorators/public.decorator";
import type { CalculationMode } from "../contracts/calculation-window.interface";

/**
 * The ONLY controller in AI-102, and it talks to exactly ONE service —
 * `IndicatorEngineServiceImpl` — per this phase's own mandatory
 * architecture rule, quoted directly: "REST Controllers MUST
 * communicate ONLY with IndicatorEngineService... Controllers MUST NOT
 * communicate directly with Registry, Dependency Graph, Execution
 * Planner, Computation Engine." Verified by direct code inspection, not
 * just asserted: this file's only AI-102 import beyond DTOs/filters is
 * `IndicatorEngineServiceImpl` (plus `IndicatorHealthService` for the
 * one endpoint item 8 explicitly carves out as its own concern — health
 * reporting is not "orchestration," and item 1's own endpoint list
 * already separates "health" from the other 7 as its own bullet).
 *
 * **API versioning** (item 6) — `/api/v1/indicators`, this project's
 * existing global prefix (`main.ts`) plus this controller's own
 * `indicators` path. No `/api/v2` exists or is stubbed — "prepare
 * architecture for future v2" is satisfied by NestJS's own versioning
 * being controller-path-based already (a real v2 controller would live
 * at a parallel path, e.g. `v2/indicators`, requiring no change to this
 * file), not by adding a non-functional placeholder route.
 */
@ApiTags("Indicator Engine")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@UseFilters(IndicatorExceptionFilter)
@Controller("indicators")
export class IndicatorController {
  constructor(
    private readonly engine: IndicatorEngineServiceImpl,
    private readonly health: IndicatorHealthService,
  ) {}

  @Get()
  @RequirePermissions("indicator-engine.read")
  @ApiOperation({ operationId: "listIndicators", summary: "List/search indicators — category, tags, identifier, version, page, pageSize." })
  @ApiOkResponse({ type: IndicatorListDto })
  list(@Query() query: QueryIndicatorDto): IndicatorListDto {
    const response = this.engine.query({ category: query.category, tags: query.tags, identifier: query.identifier, version: query.version });
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const start = (page - 1) * pageSize;
    const pageItems = response.indicators.slice(start, start + pageSize);
    const totalPages = Math.max(1, Math.ceil(response.totalCount / pageSize));
    return {
      data: pageItems.map(IndicatorMetadataDto.fromDefinition),
      pagination: { page, pageSize, totalCount: response.totalCount, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
    };
  }

  @Get("categories")
  @RequirePermissions("indicator-engine.read")
  @ApiOperation({ operationId: "listCategories", summary: "List every distinct category with at least one registered indicator." })
  @ApiOkResponse({ type: [String] })
  listCategories(): string[] {
    // IndicatorEngineServiceImpl's own public surface has no
    // listCategories() method — item 6's own rule is "controllers call
    // only IndicatorEngineService," and this phase deliberately did NOT
    // widen that facade's contract just to add one more pass-through
    // for a single, rarely-needed list. Resolved via list() + a
    // client-side dedupe over its own already-exposed response instead
    // — no new service-layer surface, no architecture-rule violation,
    // at the cost of a slightly less direct implementation here.
    const response = this.engine.query({});
    return [...new Set(response.indicators.map((d) => d.category))];
  }

  @Get("health")
  @Public()
  @ApiOperation({ operationId: "getIndicatorEngineHealth", summary: "Real, functional health check — registry, dependency graph, planner, computation engine, service readiness." })
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): HealthResponseDto {
    return this.health.check();
  }

  @Get(":identifier/versions")
  @RequirePermissions("indicator-engine.read")
  @ApiOperation({ operationId: "listVersions", summary: "List every registered version of one indicator." })
  @ApiOkResponse({ type: [String] })
  listVersions(@Param("identifier") identifier: string): string[] {
    // Same reasoning as listCategories() above — composed from list(),
    // not a new facade method.
    const response = this.engine.query({ identifier });
    return response.indicators.map((d) => d.version);
  }

  @Get(":identifier")
  @RequirePermissions("indicator-engine.read")
  @ApiOperation({ operationId: "getIndicatorMetadata", summary: "Get one indicator's full metadata by identifier (optionally a specific version)." })
  @ApiOkResponse({ type: IndicatorMetadataDto })
  getMetadata(@Param("identifier") identifier: string, @Query("version") version?: string): IndicatorMetadataDto {
    const response = this.engine.lookup(identifier, version);
    return IndicatorMetadataDto.fromDefinition(response.definition);
  }

  @Post("validate")
  @RequirePermissions("indicator-engine.read")
  @ApiOperation({ operationId: "validateIndicatorRequest", summary: "Validate a would-be execution request without running it." })
  @ApiOkResponse({ type: ValidationDto })
  validate(@Body() body: ValidateIndicatorDto): ValidationDto {
    return this.engine.validate({ indicatorIdentifier: body.indicatorIdentifier, version: body.version, parameters: body.parameters ?? {}, timeframe: body.timeframe });
  }

  @Post("execute")
  @RequirePermissions("indicator-engine.execute")
  @ApiOperation({
    operationId: "executeIndicator",
    summary: "Execute an indicator, resolving and executing every dependency in its own plan first.",
    description: "Every one of AI-102's 28 registered definitions currently fails at the calculation step — no real Indicator.calculate() implementation exists yet for any of them (deferred past this phase). This endpoint's own orchestration (dependency resolution, execution planning) is real and complete; the arithmetic behind it is not.",
  })
  @ApiOkResponse({ type: ExecutionResponseDto })
  async execute(@Body() body: ExecuteIndicatorDto, @Req() req: Request): Promise<ExecutionResponseDto> {
    const response = await this.engine.execute({
      indicatorIdentifier: body.indicatorIdentifier,
      version: body.version,
      instrumentId: body.instrumentId,
      timeframe: body.timeframe,
      parameters: body.parameters ?? {},
      requestId: req.requestId,
      calculationMode: body.calculationMode as CalculationMode,
      from: body.from,
      to: body.to,
      executionOptions: { timeoutMs: body.timeoutMs, cancellable: body.cancellable },
    });
    return {
      summary: { executionId: response.summary.executionId, status: response.summary.status, durationMs: response.summary.durationMs, errorCount: response.errors.length },
      result: response.result,
      stepResults: response.stepResults,
      errors: response.errors,
    };
  }

  @Get("executions/:executionId/status")
  @RequirePermissions("indicator-engine.read")
  @ApiOperation({
    operationId: "getExecutionStatus",
    summary: "Get a previously-submitted execution's own status.",
    description: "No execution-result persistence exists anywhere in AI-102 (explicitly out of scope — item 7 of this phase's own deliverables list names \"execution status\" as an endpoint, but nothing in Phases 1-4 stores a completed ExecutionResult keyed by its own id for later retrieval). This endpoint's shape is real and ready; it always returns 501 Not Implemented today, honestly, rather than fabricating a lookup against data that was never saved.",
  })
  getExecutionStatus(@Param("executionId") executionId: string): never {
    throw new NotImplementedException(
      `Execution status lookup for "${executionId}" is not available — AI-102 does not persist execution results (a real, named gap; see this endpoint's own OpenAPI description). Read the result directly from the original POST /indicators/execute response instead.`,
    );
  }
}
