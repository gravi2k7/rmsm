import type {
  Approval,
  ApiErrorBody,
  ListStrategiesParams,
  PaginatedStrategies,
  Publication,
  Strategy,
  StrategyCategory,
  StrategyCategoryMeta,
  StrategyParameterDefinition,
  StrategyVersion,
  ValidationResult,
} from "@/types/strategy";
import { toRuleGroupWire, type WireRuleGroup } from "./rule-tree-mapper";
import type { RuleGroupNode } from "@/types/strategy";

/** Same-origin `/api` reverse-proxied to `apps/api` in production; overridable
 * for local dev pointed at a differently-hosted API. */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.statusCode = body.statusCode;
    this.code = body.code;
    this.details = body.details;
  }
}

export interface RequestContext {
  organizationId: string;
  accessToken: string;
}

async function request<T>(ctx: RequestContext, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/organizations/${ctx.organizationId}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ctx.accessToken}`,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let body: ApiErrorBody;
    try {
      body = await res.json();
    } catch {
      body = { statusCode: res.status, message: res.statusText || "Request failed" };
    }
    throw new ApiError({ statusCode: res.status, message: body.message ?? "Request failed", code: body.code, details: body.details });
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function toQueryString(params: object): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export const strategyApi = {
  list(ctx: RequestContext, params: ListStrategiesParams = {}): Promise<PaginatedStrategies> {
    return request(ctx, `/strategies${toQueryString(params)}`);
  },

  get(ctx: RequestContext, strategyId: string): Promise<Strategy> {
    return request(ctx, `/strategies/${strategyId}`);
  },

  categories(ctx: RequestContext): Promise<StrategyCategoryMeta[]> {
    return request(ctx, `/strategies/categories`);
  },

  tags(ctx: RequestContext): Promise<string[]> {
    return request(ctx, `/strategies/tags`);
  },

  create(ctx: RequestContext, input: { name: string; description: string; category: StrategyCategory }): Promise<Strategy> {
    return request(ctx, `/strategies`, { method: "POST", body: JSON.stringify(input) });
  },

  update(
    ctx: RequestContext,
    strategyId: string,
    input: { name?: string; description?: string; addTags?: string[]; removeTags?: string[] },
  ): Promise<Strategy> {
    return request(ctx, `/strategies/${strategyId}`, { method: "PUT", body: JSON.stringify(input) });
  },

  archive(ctx: RequestContext, strategyId: string): Promise<Strategy> {
    return request(ctx, `/strategies/${strategyId}`, { method: "DELETE" });
  },

  clone(ctx: RequestContext, strategyId: string, newName: string): Promise<Strategy> {
    return request(ctx, `/strategies/${strategyId}/clone`, { method: "POST", body: JSON.stringify({ newName }) });
  },

  publishLatestApproved(ctx: RequestContext, strategyId: string): Promise<Publication> {
    return request(ctx, `/strategies/${strategyId}/publish`, { method: "POST" });
  },

  listVersions(ctx: RequestContext, strategyId: string): Promise<StrategyVersion[]> {
    return request(ctx, `/strategies/${strategyId}/versions`);
  },

  createVersion(
    ctx: RequestContext,
    strategyId: string,
    input: { entryRules: RuleGroupNode; exitRules: RuleGroupNode; parameters: StrategyParameterDefinition[] },
  ): Promise<StrategyVersion> {
    const body: { entryRules: WireRuleGroup; exitRules: WireRuleGroup; parameters: StrategyParameterDefinition[] } = {
      entryRules: toRuleGroupWire(input.entryRules),
      exitRules: toRuleGroupWire(input.exitRules),
      parameters: input.parameters,
    };
    return request(ctx, `/strategies/${strategyId}/versions`, { method: "POST", body: JSON.stringify(body) });
  },
};

export const versionApi = {
  get(ctx: RequestContext, versionId: string): Promise<StrategyVersion> {
    return request(ctx, `/strategy-versions/${versionId}`);
  },

  validate(ctx: RequestContext, versionId: string): Promise<ValidationResult> {
    return request(ctx, `/strategy-versions/${versionId}/validate`, { method: "POST" });
  },

  requestApproval(ctx: RequestContext, versionId: string): Promise<Approval> {
    return request(ctx, `/strategy-versions/${versionId}/request-approval`, { method: "POST" });
  },

  decide(ctx: RequestContext, versionId: string, decision: "APPROVED" | "REJECTED", comments?: string): Promise<Approval> {
    return request(ctx, `/strategy-versions/${versionId}/decide`, { method: "POST", body: JSON.stringify({ decision, comments }) });
  },

  publish(ctx: RequestContext, versionId: string): Promise<Publication> {
    return request(ctx, `/strategy-versions/${versionId}/publish`, { method: "POST" });
  },

  rollback(ctx: RequestContext, versionId: string): Promise<StrategyVersion> {
    return request(ctx, `/strategy-versions/${versionId}/rollback`, { method: "POST" });
  },
};
