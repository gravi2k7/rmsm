import { Injectable } from "@nestjs/common";
import { prisma } from "@rmsm/database";
import { ExecutionProfile } from "../../domain/entities/execution-profile.entity";
import type { ExecutionProfileRepository as ExecutionProfileRepositoryInterface } from "../../domain/repositories/execution-profile.repository.interface";
import { toExecutionProfileDomain, toExecutionProfilePersistence } from "../mappers/execution-profile.mapper";

@Injectable()
export class ExecutionProfileRepository implements ExecutionProfileRepositoryInterface {
  async findById(id: string, organizationId: string): Promise<ExecutionProfile | null> {
    const row = await prisma.executionProfile.findFirst({ where: { id, organizationId, deletedAt: null } });
    return row ? toExecutionProfileDomain(row) : null;
  }

  async listByStrategyVersion(strategyVersionId: string, organizationId: string): Promise<ExecutionProfile[]> {
    const rows = await prisma.executionProfile.findMany({ where: { strategyVersionId, organizationId, deletedAt: null }, orderBy: { name: "asc" } });
    return rows.map(toExecutionProfileDomain);
  }

  async save(profile: ExecutionProfile): Promise<void> {
    const data = toExecutionProfilePersistence(profile, await this.resolveOrganizationId(profile.strategyVersionId));
    await prisma.executionProfile.upsert({
      where: { id: profile.id },
      create: data,
      update: { name: data.name, parameters: data.parameters, version: { increment: 1 } },
    });
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await prisma.executionProfile.updateMany({ where: { id, organizationId }, data: { deletedAt: new Date() } });
  }

  private async resolveOrganizationId(strategyVersionId: string): Promise<string> {
    const version = await prisma.strategyVersion.findUniqueOrThrow({ where: { id: strategyVersionId } });
    return version.organizationId;
  }
}
