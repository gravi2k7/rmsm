/**
 * The 5 Organization domain events named in the Module 003 spec. Payloads
 * are intentionally small and id-based (not full entity snapshots) —
 * consumers that need the current entity state call back through
 * OrganizationService/OrganizationRepository, the same single source of
 * truth every other part of the platform already reads from.
 */
export interface OrganizationDomainEventPayloadMap {
  OrganizationCreated: { organizationId: string; actorId: string; slug: string; name: string };
  OrganizationUpdated: { organizationId: string; actorId: string; fields: string[] };
  OrganizationArchived: { organizationId: string; actorId: string };
  OrganizationDeleted: { organizationId: string; actorId: string };
  OrganizationOwnerTransferred: {
    organizationId: string;
    actorId: string;
    previousOwnerMembershipId: string;
    newOwnerMembershipId: string;
  };
}

export type OrganizationDomainEventName = keyof OrganizationDomainEventPayloadMap;
