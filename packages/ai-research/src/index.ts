// @rmsm/ai-research public API (AI-303 Research Engine)

// Domain: enums
export { ResearchStepStatus, RESEARCH_STEP_STATUSES, ResearchPlanStatus, RESEARCH_PLAN_STATUSES } from "./domain/enums/research.enum";

// Domain: entities
export type { Source } from "./domain/entities/source.entity";
export type { Evidence } from "./domain/entities/evidence.entity";
export type { Citation } from "./domain/entities/citation.entity";
export type { ResearchStep } from "./domain/entities/research-step.entity";
export type { ResearchPlan } from "./domain/entities/research-plan.entity";
export type { ResearchReport } from "./domain/entities/research-report.entity";

// Domain: errors
export {
  ResearchPlanNotFoundError,
  NoEvidenceFoundError,
  InvalidResearchQueryError,
} from "./domain/errors/research-domain.errors";

// Ports
export type { SearchProvider, SearchResult } from "./repositories/search-provider.interface";
export type { ResearchPlanRepository } from "./repositories/research-plan-repository.interface";

// Events
export type {
  ResearchPlanCreatedEvent,
  EvidenceCollectedEvent,
  ResearchSummarizedEvent,
  ResearchCompletedEvent,
  ResearchDomainEvent,
} from "./events/research-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

// Application
export { ResearchPlanner } from "./application/services/research-planner.service";
export { EvidenceCollector } from "./application/services/evidence-collector.service";
export { EvidenceRankingService } from "./application/services/evidence-ranking.service";
export { ResearchReportBuilder } from "./application/services/research-report-builder.service";

// Infrastructure
export { InMemoryResearchPlanRepository } from "./infrastructure/in-memory-research-plan.repository";
export { StubSearchProvider } from "./infrastructure/stub-search.provider";
export { InMemoryEventPublisher, type ResearchEventListener } from "./infrastructure/in-memory-event-publisher";
