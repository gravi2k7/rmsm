import type { StrategyVersion } from "../../domain/aggregates/strategy-version.aggregate";
import type { StrategyValidation } from "../../domain/entities/strategy-validation.entity";
import type { StrategyApproval } from "../../domain/entities/strategy-approval.entity";
import type { StrategyPublication } from "../../domain/entities/strategy-publication.entity";
import { VersionResponseDto } from "../dto/version-response.dto";
import { ValidationResponseDto } from "../dto/validation-response.dto";
import { ApprovalResponseDto } from "../dto/approval-response.dto";
import { PublicationResponseDto } from "../dto/publication-response.dto";

export function toVersionResponseDto(version: StrategyVersion): VersionResponseDto {
  const dto = new VersionResponseDto();
  dto.id = version.id;
  dto.strategyId = version.strategyId;
  dto.versionNumber = version.versionNumber;
  dto.status = version.status;
  dto.entryRules = version.entryRules;
  dto.exitRules = version.exitRules;
  dto.parameters = [...version.parameters];
  dto.createdByUserId = version.createdByUserId;
  dto.createdAt = version.createdAt;
  return dto;
}

export function toValidationResponseDto(validation: StrategyValidation): ValidationResponseDto {
  const dto = new ValidationResponseDto();
  dto.id = validation.id;
  dto.strategyVersionId = validation.strategyVersionId;
  dto.ranAt = validation.ranAt;
  dto.passed = validation.passed;
  dto.findings = validation.findings;
  return dto;
}

export function toApprovalResponseDto(approval: StrategyApproval): ApprovalResponseDto {
  const dto = new ApprovalResponseDto();
  dto.id = approval.id;
  dto.strategyVersionId = approval.strategyVersionId;
  dto.requestedByUserId = approval.requestedByUserId;
  dto.requestedAt = approval.requestedAt;
  dto.decision = approval.decision;
  dto.decidedByUserId = approval.decidedByUserId;
  dto.decidedAt = approval.decidedAt;
  dto.comments = approval.comments;
  return dto;
}

export function toPublicationResponseDto(publication: StrategyPublication): PublicationResponseDto {
  const dto = new PublicationResponseDto();
  dto.id = publication.id;
  dto.strategyVersionId = publication.strategyVersionId;
  dto.publishedByUserId = publication.publishedByUserId;
  dto.publishedAt = publication.publishedAt;
  dto.supersedesVersionId = publication.supersedesVersionId;
  return dto;
}
