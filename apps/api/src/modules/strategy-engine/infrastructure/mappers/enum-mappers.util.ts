import { StrategyStatus, StrategyVersionStatus, StrategyCategoryCode, RuleTreeRole, LogicalOperatorType, ComparisonOperatorType, StrategyParameterType, ApprovalDecision, StrategyHistoryActionType } from "@rmsm/database";
import type { StrategyStatus as DomainStrategyStatus, StrategyVersionStatus as DomainVersionStatus } from "../../domain/value-objects/strategy-status.enum";
import type { StrategyCategory as DomainStrategyCategory } from "../../domain/value-objects/strategy-category.value-object";
import type { LogicalOperator, ComparisonOperator } from "../../domain/value-objects/comparison-operator.enum";
import type { StrategyHistoryAction } from "../../domain/entities/strategy-history.entity";

/**
 * Milestone 2 fix — category 2 ("replace raw strings with generated
 * Prisma enums"). Every function below is a real, exhaustive switch
 * referencing the Prisma-generated enum's own runtime members
 * (`StrategyStatus.ACTIVE`, not the bare string literal `"ACTIVE"`
 * type-asserted into place) — a typo or an unhandled new domain value
 * is now a compile error (TypeScript's own exhaustiveness check via
 * the `never` branch), not a cast that silently trusts the two string
 * unions happen to still line up. Domain layer untouched, per this
 * fix's own explicit rule — these are pure translation functions at
 * the persistence boundary, referenced only from `infrastructure/`.
 */

export function toPrismaStrategyStatus(status: DomainStrategyStatus): StrategyStatus {
  switch (status) {
    case "ACTIVE":
      return StrategyStatus.ACTIVE;
    case "ARCHIVED":
      return StrategyStatus.ARCHIVED;
    default: {
      const exhaustive: never = status;
      throw new Error(`Unhandled StrategyStatus: ${String(exhaustive)}`);
    }
  }
}

export function toDomainStrategyStatus(status: StrategyStatus): DomainStrategyStatus {
  switch (status) {
    case StrategyStatus.ACTIVE:
      return "ACTIVE";
    case StrategyStatus.ARCHIVED:
      return "ARCHIVED";
    default: {
      const exhaustive: never = status;
      throw new Error(`Unhandled Prisma StrategyStatus: ${String(exhaustive)}`);
    }
  }
}

export function toPrismaVersionStatus(status: DomainVersionStatus): StrategyVersionStatus {
  switch (status) {
    case "DRAFT":
      return StrategyVersionStatus.DRAFT;
    case "PENDING_VALIDATION":
      return StrategyVersionStatus.PENDING_VALIDATION;
    case "VALIDATED":
      return StrategyVersionStatus.VALIDATED;
    case "PENDING_APPROVAL":
      return StrategyVersionStatus.PENDING_APPROVAL;
    case "APPROVED":
      return StrategyVersionStatus.APPROVED;
    case "REJECTED":
      return StrategyVersionStatus.REJECTED;
    case "PUBLISHED":
      return StrategyVersionStatus.PUBLISHED;
    case "SUPERSEDED":
      return StrategyVersionStatus.SUPERSEDED;
    default: {
      const exhaustive: never = status;
      throw new Error(`Unhandled StrategyVersionStatus: ${String(exhaustive)}`);
    }
  }
}

export function toDomainVersionStatus(status: StrategyVersionStatus): DomainVersionStatus {
  switch (status) {
    case StrategyVersionStatus.DRAFT:
      return "DRAFT";
    case StrategyVersionStatus.PENDING_VALIDATION:
      return "PENDING_VALIDATION";
    case StrategyVersionStatus.VALIDATED:
      return "VALIDATED";
    case StrategyVersionStatus.PENDING_APPROVAL:
      return "PENDING_APPROVAL";
    case StrategyVersionStatus.APPROVED:
      return "APPROVED";
    case StrategyVersionStatus.REJECTED:
      return "REJECTED";
    case StrategyVersionStatus.PUBLISHED:
      return "PUBLISHED";
    case StrategyVersionStatus.SUPERSEDED:
      return "SUPERSEDED";
    default: {
      const exhaustive: never = status;
      throw new Error(`Unhandled Prisma StrategyVersionStatus: ${String(exhaustive)}`);
    }
  }
}

export function toPrismaCategoryCode(category: DomainStrategyCategory): StrategyCategoryCode {
  switch (category) {
    case "TREND_FOLLOWING":
      return StrategyCategoryCode.TREND_FOLLOWING;
    case "MEAN_REVERSION":
      return StrategyCategoryCode.MEAN_REVERSION;
    case "MOMENTUM":
      return StrategyCategoryCode.MOMENTUM;
    case "BREAKOUT":
      return StrategyCategoryCode.BREAKOUT;
    case "SCALPING":
      return StrategyCategoryCode.SCALPING;
    case "SWING":
      return StrategyCategoryCode.SWING;
    case "ARBITRAGE":
      return StrategyCategoryCode.ARBITRAGE;
    case "MARKET_MAKING":
      return StrategyCategoryCode.MARKET_MAKING;
    case "CUSTOM":
      return StrategyCategoryCode.CUSTOM;
    default: {
      const exhaustive: never = category;
      throw new Error(`Unhandled StrategyCategory: ${String(exhaustive)}`);
    }
  }
}

export function toDomainCategoryCode(code: StrategyCategoryCode): DomainStrategyCategory {
  switch (code) {
    case StrategyCategoryCode.TREND_FOLLOWING:
      return "TREND_FOLLOWING";
    case StrategyCategoryCode.MEAN_REVERSION:
      return "MEAN_REVERSION";
    case StrategyCategoryCode.MOMENTUM:
      return "MOMENTUM";
    case StrategyCategoryCode.BREAKOUT:
      return "BREAKOUT";
    case StrategyCategoryCode.SCALPING:
      return "SCALPING";
    case StrategyCategoryCode.SWING:
      return "SWING";
    case StrategyCategoryCode.ARBITRAGE:
      return "ARBITRAGE";
    case StrategyCategoryCode.MARKET_MAKING:
      return "MARKET_MAKING";
    case StrategyCategoryCode.CUSTOM:
      return "CUSTOM";
    default: {
      const exhaustive: never = code;
      throw new Error(`Unhandled Prisma StrategyCategoryCode: ${String(exhaustive)}`);
    }
  }
}

export function toPrismaTreeRole(role: "ENTRY" | "EXIT"): RuleTreeRole {
  switch (role) {
    case "ENTRY":
      return RuleTreeRole.ENTRY;
    case "EXIT":
      return RuleTreeRole.EXIT;
    default: {
      const exhaustive: never = role;
      throw new Error(`Unhandled RuleTreeRole: ${String(exhaustive)}`);
    }
  }
}

export function toPrismaLogicalOperator(operator: LogicalOperator): LogicalOperatorType {
  switch (operator) {
    case "AND":
      return LogicalOperatorType.AND;
    case "OR":
      return LogicalOperatorType.OR;
    case "NOT":
      return LogicalOperatorType.NOT;
    default: {
      const exhaustive: never = operator;
      throw new Error(`Unhandled LogicalOperator: ${String(exhaustive)}`);
    }
  }
}

export function toDomainLogicalOperator(operator: LogicalOperatorType): LogicalOperator {
  switch (operator) {
    case LogicalOperatorType.AND:
      return "AND";
    case LogicalOperatorType.OR:
      return "OR";
    case LogicalOperatorType.NOT:
      return "NOT";
    default: {
      const exhaustive: never = operator;
      throw new Error(`Unhandled Prisma LogicalOperatorType: ${String(exhaustive)}`);
    }
  }
}

export function toPrismaComparisonOperator(operator: ComparisonOperator): ComparisonOperatorType {
  switch (operator) {
    case "GREATER_THAN":
      return ComparisonOperatorType.GREATER_THAN;
    case "GREATER_THAN_OR_EQUAL":
      return ComparisonOperatorType.GREATER_THAN_OR_EQUAL;
    case "LESS_THAN":
      return ComparisonOperatorType.LESS_THAN;
    case "LESS_THAN_OR_EQUAL":
      return ComparisonOperatorType.LESS_THAN_OR_EQUAL;
    case "EQUAL":
      return ComparisonOperatorType.EQUAL;
    case "NOT_EQUAL":
      return ComparisonOperatorType.NOT_EQUAL;
    case "CROSSES_ABOVE":
      return ComparisonOperatorType.CROSSES_ABOVE;
    case "CROSSES_BELOW":
      return ComparisonOperatorType.CROSSES_BELOW;
    case "BETWEEN":
      return ComparisonOperatorType.BETWEEN;
    default: {
      const exhaustive: never = operator;
      throw new Error(`Unhandled ComparisonOperator: ${String(exhaustive)}`);
    }
  }
}

export function toDomainComparisonOperator(operator: ComparisonOperatorType): ComparisonOperator {
  switch (operator) {
    case ComparisonOperatorType.GREATER_THAN:
      return "GREATER_THAN";
    case ComparisonOperatorType.GREATER_THAN_OR_EQUAL:
      return "GREATER_THAN_OR_EQUAL";
    case ComparisonOperatorType.LESS_THAN:
      return "LESS_THAN";
    case ComparisonOperatorType.LESS_THAN_OR_EQUAL:
      return "LESS_THAN_OR_EQUAL";
    case ComparisonOperatorType.EQUAL:
      return "EQUAL";
    case ComparisonOperatorType.NOT_EQUAL:
      return "NOT_EQUAL";
    case ComparisonOperatorType.CROSSES_ABOVE:
      return "CROSSES_ABOVE";
    case ComparisonOperatorType.CROSSES_BELOW:
      return "CROSSES_BELOW";
    case ComparisonOperatorType.BETWEEN:
      return "BETWEEN";
    default: {
      const exhaustive: never = operator;
      throw new Error(`Unhandled Prisma ComparisonOperatorType: ${String(exhaustive)}`);
    }
  }
}

export function toPrismaParameterType(type: "integer" | "decimal" | "boolean" | "enum" | "string"): StrategyParameterType {
  switch (type) {
    case "integer":
      return StrategyParameterType.INTEGER;
    case "decimal":
      return StrategyParameterType.DECIMAL;
    case "boolean":
      return StrategyParameterType.BOOLEAN;
    case "enum":
      return StrategyParameterType.ENUM;
    case "string":
      return StrategyParameterType.STRING;
    default: {
      const exhaustive: never = type;
      throw new Error(`Unhandled StrategyParameterType: ${String(exhaustive)}`);
    }
  }
}

export function toPrismaApprovalDecision(decision: "PENDING" | "APPROVED" | "REJECTED"): ApprovalDecision {
  switch (decision) {
    case "PENDING":
      return ApprovalDecision.PENDING;
    case "APPROVED":
      return ApprovalDecision.APPROVED;
    case "REJECTED":
      return ApprovalDecision.REJECTED;
    default: {
      const exhaustive: never = decision;
      throw new Error(`Unhandled ApprovalDecision: ${String(exhaustive)}`);
    }
  }
}

export function toDomainApprovalDecision(decision: ApprovalDecision): "PENDING" | "APPROVED" | "REJECTED" {
  switch (decision) {
    case ApprovalDecision.PENDING:
      return "PENDING";
    case ApprovalDecision.APPROVED:
      return "APPROVED";
    case ApprovalDecision.REJECTED:
      return "REJECTED";
    default: {
      const exhaustive: never = decision;
      throw new Error(`Unhandled Prisma ApprovalDecision: ${String(exhaustive)}`);
    }
  }
}

export function toPrismaHistoryAction(action: StrategyHistoryAction): StrategyHistoryActionType {
  switch (action) {
    case "STRATEGY_CREATED":
      return StrategyHistoryActionType.STRATEGY_CREATED;
    case "STRATEGY_UPDATED":
      return StrategyHistoryActionType.STRATEGY_UPDATED;
    case "VERSION_DRAFTED":
      return StrategyHistoryActionType.VERSION_DRAFTED;
    case "VERSION_VALIDATED":
      return StrategyHistoryActionType.VERSION_VALIDATED;
    case "VERSION_APPROVAL_REQUESTED":
      return StrategyHistoryActionType.VERSION_APPROVAL_REQUESTED;
    case "VERSION_APPROVED":
      return StrategyHistoryActionType.VERSION_APPROVED;
    case "VERSION_REJECTED":
      return StrategyHistoryActionType.VERSION_REJECTED;
    case "VERSION_PUBLISHED":
      return StrategyHistoryActionType.VERSION_PUBLISHED;
    case "STRATEGY_ARCHIVED":
      return StrategyHistoryActionType.STRATEGY_ARCHIVED;
    default: {
      const exhaustive: never = action;
      throw new Error(`Unhandled StrategyHistoryAction: ${String(exhaustive)}`);
    }
  }
}

export function toDomainHistoryAction(action: StrategyHistoryActionType): StrategyHistoryAction {
  switch (action) {
    case StrategyHistoryActionType.STRATEGY_CREATED:
      return "STRATEGY_CREATED";
    case StrategyHistoryActionType.STRATEGY_UPDATED:
      return "STRATEGY_UPDATED";
    case StrategyHistoryActionType.VERSION_DRAFTED:
      return "VERSION_DRAFTED";
    case StrategyHistoryActionType.VERSION_VALIDATED:
      return "VERSION_VALIDATED";
    case StrategyHistoryActionType.VERSION_APPROVAL_REQUESTED:
      return "VERSION_APPROVAL_REQUESTED";
    case StrategyHistoryActionType.VERSION_APPROVED:
      return "VERSION_APPROVED";
    case StrategyHistoryActionType.VERSION_REJECTED:
      return "VERSION_REJECTED";
    case StrategyHistoryActionType.VERSION_PUBLISHED:
      return "VERSION_PUBLISHED";
    case StrategyHistoryActionType.STRATEGY_ARCHIVED:
      return "STRATEGY_ARCHIVED";
    default: {
      const exhaustive: never = action;
      throw new Error(`Unhandled Prisma StrategyHistoryActionType: ${String(exhaustive)}`);
    }
  }
}
