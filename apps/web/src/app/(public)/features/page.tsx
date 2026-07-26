import { RoutePlaceholder } from "@/components/public";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: "Features", description: "Everything RMSM offers.", path: "/features" });

export default function FeaturesPage() {
  return <RoutePlaceholder title="Features" description="Everything RMSM offers." />;
}
