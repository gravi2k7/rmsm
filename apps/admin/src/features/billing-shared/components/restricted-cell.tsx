import { Lock } from "lucide-react";
import { Badge } from "@rmsm/ui";

export function RestrictedCell() {
  return (
    <Badge variant="secondary" className="gap-1">
      <Lock className="h-3 w-3" aria-hidden="true" />
      Restricted
    </Badge>
  );
}
