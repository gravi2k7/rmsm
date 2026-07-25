export enum PolicyEffect {
  ALLOW = "ALLOW",
  DENY = "DENY",
}

export const POLICY_EFFECTS = Object.values(PolicyEffect) as readonly PolicyEffect[];
