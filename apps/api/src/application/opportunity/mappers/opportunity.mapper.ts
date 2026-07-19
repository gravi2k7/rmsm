import { Injectable } from "@nestjs/common";
import type { Opportunity } from "@rmsm/opportunity";
import { OpportunityResponseDto } from "../dto/opportunity-response.dto";

@Injectable()
export class OpportunityMapper {
  toResponseDto(opportunity: Opportunity): OpportunityResponseDto {
    const dto = new OpportunityResponseDto();
    dto.id = opportunity.id;
    dto.symbolCode = opportunity.symbolCode.value;
    dto.strategyId = opportunity.strategyId;
    dto.status = opportunity.status;
    dto.signalDirection = opportunity.signal.direction;
    dto.signalStrength = opportunity.signal.strength.level;
    dto.confidenceScore = opportunity.confidence.score;
    dto.trend = opportunity.marketContext.trend;
    dto.volatility = opportunity.marketContext.volatility;
    dto.liquidity = opportunity.marketContext.liquidity;
    dto.createdAt = opportunity.createdAt.toISOString();
    dto.expiresAt = opportunity.expiresAt.toISOString();
    return dto;
  }

  toResponseDtoList(opportunities: readonly Opportunity[]): OpportunityResponseDto[] {
    return opportunities.map((o) => this.toResponseDto(o));
  }
}
