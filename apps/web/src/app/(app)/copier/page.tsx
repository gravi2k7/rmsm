import { SessionGate } from "@/components/ui-extra/session-gate";
import { CopierPage } from "@/components/copier/copier-page";

export default function CopierRoute() {
  return (
    <SessionGate>
      <CopierPage />
    </SessionGate>
  );
}
