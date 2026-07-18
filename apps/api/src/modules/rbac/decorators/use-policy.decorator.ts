import { SetMetadata } from "@nestjs/common";
import type { Policy } from "../interfaces/policy.interface";

export const POLICY_KEY = "policy";

/** Attaches a `Policy` to a route handler — evaluated by `PolicyGuard`.
 * Takes a policy *instance* (not a DI token) — policies in this framework
 * are stateless, pure evaluators, so there's no need for the extra
 * indirection of resolving one from the DI container per request. */
export const UsePolicy = (policy: Policy) => SetMetadata(POLICY_KEY, policy);
