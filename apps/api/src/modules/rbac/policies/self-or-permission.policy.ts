import type { Policy, PolicyEvaluationContext } from "../interfaces/policy.interface";

/**
 * The single most common attribute-based rule in practice: "a user can
 * act on their own resource (e.g. their own profile, their own
 * sessions), and someone holding an explicit permission can act on
 * anyone's" — the exact ownership-or-admin-override shape
 * `SessionsController` already hand-implements inline today (comparing
 * a resource's own `userId` against the acting user) without a reusable,
 * named policy backing it. A factory, not a single fixed policy, since
 * the route-param name identifying "whose resource is this" and the
 * override permission both vary per endpoint.
 */
export function createSelfOrPermissionPolicy(routeParamName: string, overridePermission: string): Policy {
  return {
    name: `self-or-permission:${overridePermission}`,
    evaluate(context: PolicyEvaluationContext): boolean {
      const targetUserId = context.routeParams[routeParamName];
      if (targetUserId && targetUserId === context.user.sub) return true;
      return context.user.permissions.includes(overridePermission);
    },
  };
}
