/**
 * Types mirroring `apps/api/src/modules/strategy-engine/rest/dto/*`.
 * Frontend-owned, hand-mirrored rather than a generated client — the
 * backend has no OpenAPI-client codegen step in this repo yet (a real,
 * named gap; see Milestone 5's own architectural-decisions doc). Kept
 * in one file, deliberately close to the DTO shapes so a backend DTO
 * change is easy to diff against this file.
 */

export type StrategyStatus = "ACTIVE" | "ARCHIVED";

export type StrategyCategory =
  | "TREND_FOLLOWING"
  | "MEAN_REVERSION"
  | "MOMENTUM"
  | "BREAKOUT"
  | "SCALPING"
  | "SWING"
  | "ARBITRAGE"
  | "MARKET_MAKING"
  | "CUSTOM";

export const STRATEGY_CATEGORIES: StrategyCategory[] = [
  "TREND_FOLLOWING",
  "MEAN_REVERSION",
  "MOMENTUM",
  "BREAKOUT",
  "SCALPING",
  "SWING",
  "ARBITRAGE",
  "MARKET_MAKING",
  "CUSTOM",
];

export type StrategyVersionStatus =
  | "DRAFT"
  | "PENDING_VALIDATION"
  | "VALIDATED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED"
  | "SUPERSEDED";

export interface Strategy {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  category: StrategyCategory;
  status: StrategyStatus;
  tags: string[];
  currentPublishedVersionId: string | null;
  createdByUserId: string;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedStrategies {
  data: Strategy[];
  pagination: PaginationMeta;
}

export interface ListStrategiesParams {
  status?: StrategyStatus;
  category?: StrategyCategory;
  tag?: string;
  searchText?: string;
  page?: number;
  pageSize?: number;
}

// ── Rule tree ────────────────────────────────────────────────────────

export type OperandKind = "indicator" | "market_field" | "constant";
export type MarketField = "open" | "high" | "low" | "close" | "volume";
export type ComparisonOperator =
  | "GREATER_THAN"
  | "GREATER_THAN_OR_EQUAL"
  | "LESS_THAN"
  | "LESS_THAN_OR_EQUAL"
  | "EQUAL"
  | "NOT_EQUAL"
  | "CROSSES_ABOVE"
  | "CROSSES_BELOW"
  | "BETWEEN";
export type LogicalOperator = "AND" | "OR" | "NOT";

export const COMPARISON_OPERATORS: ComparisonOperator[] = [
  "GREATER_THAN",
  "GREATER_THAN_OR_EQUAL",
  "LESS_THAN",
  "LESS_THAN_OR_EQUAL",
  "EQUAL",
  "NOT_EQUAL",
  "CROSSES_ABOVE",
  "CROSSES_BELOW",
  "BETWEEN",
];

export const MARKET_FIELDS: MarketField[] = ["open", "high", "low", "close", "volume"];

export interface Operand {
  kind: OperandKind;
  indicatorIdentifier?: string;
  indicatorVersion?: string;
  parameters?: Record<string, number | string | boolean>;
  outputSeries?: string;
  field?: MarketField;
  value?: string;
}

export interface Condition {
  leftOperand: Operand;
  operator: ComparisonOperator;
  rightOperand: Operand;
  rightOperandUpper?: Operand;
}

export interface RuleNode {
  kind: "rule";
  /** Client-only stable id for React keys / DnD — never sent as-is (see rule-tree.mapper). */
  _id: string;
  label: string;
  enabled: boolean;
  condition: Condition;
}

export interface RuleGroupNode {
  kind: "group";
  _id: string;
  operator: LogicalOperator;
  children: RuleTreeNode[];
}

export type RuleTreeNode = RuleNode | RuleGroupNode;

export interface StrategyParameterDefinition {
  type: "integer" | "decimal" | "boolean" | "enum" | "string";
  name: string;
  required: boolean;
  defaultValue?: number | string | boolean;
  min?: number | string;
  max?: number | string;
  allowedValues?: string[];
  maxLength?: number;
}

export interface StrategyVersion {
  id: string;
  strategyId: string;
  versionNumber: number;
  status: StrategyVersionStatus;
  entryRules: RuleTreeNode;
  exitRules: RuleTreeNode;
  parameters: StrategyParameterDefinition[];
  createdByUserId: string;
  createdAt: string;
}

export interface ValidationFinding {
  severity: "ERROR" | "WARNING";
  code: string;
  message: string;
  nodeId?: string;
}

export interface ValidationResult {
  id: string;
  strategyVersionId: string;
  ranAt: string;
  passed: boolean;
  findings: ValidationFinding[];
}

export type ApprovalDecision = "PENDING" | "APPROVED" | "REJECTED";

export interface Approval {
  id: string;
  strategyVersionId: string;
  requestedByUserId: string;
  requestedAt: string;
  decision: ApprovalDecision;
  decidedByUserId?: string;
  decidedAt?: string;
  comments?: string;
}

export interface Publication {
  id: string;
  strategyVersionId: string;
  publishedByUserId: string;
  publishedAt: string;
  supersedesVersionId: string | null;
}

export interface StrategyCategoryMeta {
  code: StrategyCategory;
  label: string;
}

export interface ApiErrorBody {
  statusCode: number;
  code?: string;
  message: string;
  details?: unknown;
}
