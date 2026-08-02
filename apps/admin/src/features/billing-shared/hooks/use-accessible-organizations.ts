import { useOrganizations } from "@/features/organizations/hooks/use-organizations";

/**
 * The base organization set every Enterprise Operations billing page
 * fans out over. Re-exported from the existing Module 003 hook rather
 * than duplicated — see `types.ts`'s file comment for why "accessible
 * organizations" (not "all organizations") is the honest name for this.
 */
export function useAccessibleOrganizations() {
  return useOrganizations();
}
