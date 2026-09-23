import { SessionGate } from "@/components/ui-extra/session-gate";
import { BrokersPage } from "@/components/brokers/brokers-page";

export default function BrokersRoute() {
  return (
    <SessionGate>
      <BrokersPage />
    </SessionGate>
  );
}
