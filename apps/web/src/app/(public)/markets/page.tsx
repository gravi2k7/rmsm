import { RoutePlaceholder } from "@/components/public";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: "Markets", description: "Real-time market coverage.", path: "/markets" });

export default function MarketsPage() {
  return <RoutePlaceholder title="Markets" description="Real-time market coverage." />;
}
