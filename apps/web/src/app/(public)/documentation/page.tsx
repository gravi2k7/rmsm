import { RoutePlaceholder } from "@/components/public";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: "Documentation", description: "Guides and API reference.", path: "/documentation" });

export default function DocumentationPage() {
  return <RoutePlaceholder title="Documentation" description="Guides and API reference." />;
}
