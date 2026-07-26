import { RoutePlaceholder } from "@/components/public";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/" });

export default function HomePage() {
  return <RoutePlaceholder title="RMSM AI" description="Institutional-grade AI trading platform." />;
}
