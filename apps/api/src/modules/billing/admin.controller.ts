import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { SubscriptionPlan, FeatureFlag, PlanFeature, PlanFeatureWithFeatureFlag } from "@rmsm/database";
import { SubscriptionPlanRepository } from "./repositories/subscription-plan.repository";
import { FeatureFlagRepository } from "./repositories/feature-flag.repository";
import { PlanFeatureRepository } from "./repositories/plan-feature.repository";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";
import { CreateFeatureFlagDto } from "./dto/create-feature-flag.dto";
import { UpsertPlanFeatureDto } from "./dto/upsert-plan-feature.dto";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";

/**
 * Platform-wide administration — manage plans, features, and (via
 * PlanFeature) quotas. Not organization-scoped, so no OrganizationRoleGuard
 * here — gated entirely by the platform-tier `billing.admin.manage`
 * permission (seeded to ADMIN/SUPER_ADMIN only), consistent with how
 * Module 002's RbacController gates platform role/permission management.
 */
@ApiTags("Billing Admin")
@ApiBearerAuth()
@Controller("billing/admin")
export class AdminBillingController {
  constructor(
    private readonly planRepository: SubscriptionPlanRepository,
    private readonly featureFlagRepository: FeatureFlagRepository,
    private readonly planFeatureRepository: PlanFeatureRepository,
  ) {}

  @Get("plans")
  @RequirePermissions("billing.admin.manage")
  @ApiOperation({ operationId: "adminListPlans", summary: "List all plans, including inactive/hidden ones." })
  listPlans(): Promise<SubscriptionPlan[]> {
    return this.planRepository.findAll();
  }

  @Post("plans")
  @RequirePermissions("billing.admin.manage")
  @ApiOperation({ operationId: "adminCreatePlan", summary: "Create a subscription plan." })
  createPlan(@Body() dto: CreatePlanDto): Promise<SubscriptionPlan> {
    return this.planRepository.create(dto);
  }

  @Post("plans/:planId")
  @RequirePermissions("billing.admin.manage")
  @ApiOperation({ operationId: "adminUpdatePlan", summary: "Update a subscription plan." })
  updatePlan(@Param("planId", ParseUUIDPipe) planId: string, @Body() dto: UpdatePlanDto): Promise<SubscriptionPlan> {
    return this.planRepository.update(planId, dto);
  }

  @Get("features")
  @RequirePermissions("billing.admin.manage")
  @ApiOperation({ operationId: "adminListFeatures", summary: "List all feature flags." })
  listFeatures(): Promise<FeatureFlag[]> {
    return this.featureFlagRepository.findAll();
  }

  @Post("features")
  @RequirePermissions("billing.admin.manage")
  @ApiOperation({ operationId: "adminCreateFeature", summary: "Create a feature flag." })
  createFeature(@Body() dto: CreateFeatureFlagDto): Promise<FeatureFlag> {
    return this.featureFlagRepository.create(dto);
  }

  @Get("plans/:planId/features")
  @RequirePermissions("billing.admin.manage")
  @ApiOperation({ operationId: "adminListPlanFeatures", summary: "List a plan's feature grants (quotas/limits)." })
  listPlanFeatures(@Param("planId", ParseUUIDPipe) planId: string): Promise<PlanFeatureWithFeatureFlag[]> {
    return this.planFeatureRepository.findByPlan(planId);
  }

  @Post("plans/:planId/features")
  @RequirePermissions("billing.admin.manage")
  @ApiOperation({ operationId: "adminUpsertPlanFeature", summary: "Grant or update a feature/quota on a plan." })
  upsertPlanFeature(
    @Param("planId", ParseUUIDPipe) planId: string,
    @Body() dto: UpsertPlanFeatureDto,
  ): Promise<PlanFeature> {
    return this.planFeatureRepository.upsert({ planId, ...dto });
  }

  @Delete("plans/:planId/features/:featureFlagId")
  @RequirePermissions("billing.admin.manage")
  @ApiOperation({ operationId: "adminRemovePlanFeature", summary: "Revoke a feature grant from a plan." })
  removePlanFeature(
    @Param("planId", ParseUUIDPipe) planId: string,
    @Param("featureFlagId", ParseUUIDPipe) featureFlagId: string,
  ): Promise<PlanFeature> {
    return this.planFeatureRepository.delete(planId, featureFlagId);
  }
}
