import type { AccessTokenPayload } from "../../auth/services/token.service";

/**
 * The context a `Policy` evaluates against — deliberately generic over
 * an optional `TResource` (e.g. an already-loaded entity a policy needs
 * to inspect, like "is this the strategy's own owner"), so a policy isn't
 * limited to only what's cheaply available on the raw HTTP request.
 */
export interface PolicyEvaluationContext<TResource = unknown> {
  readonly user: AccessTokenPayload;
  readonly routeParams: Readonly<Record<string, string>>;
  readonly resource?: TResource;
}

/**
 * A named, composable authorization rule that's more expressive than a
 * flat permission-key check — e.g. "the acting user IS the resource's own
 * owner", "the resource belongs to an organization the user is a member
 * of", or any rule that needs to look at *which* resource is being
 * accessed, not just *whether the user holds a permission key* the way
 * `PermissionsGuard`/`RolesGuard` already handle well.
 *
 * `PermissionsGuard`/`RolesGuard` aren't replaced by this — they stay the
 * right tool for "does this user's role/permission set allow this
 * endpoint at all." `Policy` is for the attribute-based layer on top of
 * that, where the answer depends on specific request/resource data.
 */
export interface Policy<TResource = unknown> {
  readonly name: string;
  evaluate(context: PolicyEvaluationContext<TResource>): boolean | Promise<boolean>;
}
