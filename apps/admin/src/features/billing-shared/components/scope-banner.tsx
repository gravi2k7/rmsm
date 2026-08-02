import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@rmsm/ui";

/**
 * Every Enterprise Operations page that aggregates across organizations
 * shows this. The API has no cross-tenant billing listing endpoint (see
 * `features/billing-shared/types.ts`), so these pages fan out over the
 * organizations the signed-in admin account itself belongs to. This
 * banner is that fact, stated plainly, rather than left for the admin to
 * discover as unexplained missing rows.
 */
export function ScopeBanner() {
  return (
    <Alert className="mb-6">
      <Info className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>Scope: organizations you have access to</AlertTitle>
      <AlertDescription>
        This view covers organizations your admin account holds an active membership in. Organizations marked{" "}
        <span className="font-medium">Restricted</span> exist on the platform but require billing access on that organization to view.
      </AlertDescription>
    </Alert>
  );
}
