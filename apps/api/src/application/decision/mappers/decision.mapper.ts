import { Injectable } from "@nestjs/common";
import type { Decision } from "@rmsm/decision";
import { DecisionResponseDto } from "../dto/decision.dto";

@Injectable()
export class DecisionMapper {
  toResponseDto(decision: Decision): DecisionResponseDto {
    const dto = new DecisionResponseDto();
    dto.id = decision.id;
    dto.opportunityId = decision.opportunityId;
    dto.status = decision.status;
    dto.riskScore = decision.riskAssessment.overallScore.value;
    dto.riskPassed = decision.riskAssessment.passed();
    dto.failedRiskChecks = decision.riskAssessment.failedCheckNames();
    dto.positionSizeUnits = decision.positionSize.units;
    dto.positionSizeBasis = decision.positionSize.calculationBasis;
    dto.decidedBy = decision.approval.decidedBy;
    dto.decidedAt = decision.approval.decidedAt?.toISOString();
    dto.createdAt = decision.createdAt.toISOString();
    return dto;
  }

  toResponseDtoList(decisions: readonly Decision[]): DecisionResponseDto[] {
    return decisions.map((d) => this.toResponseDto(d));
  }
}
