import { RoutePlaceholder } from "@/components/public";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: "Pricing", description: "Plans for every desk.", path: "/pricing" });

export default function PricingPage() {
  return <RoutePlaceholder title="Pricing" description="Plans for every desk." />;
}
