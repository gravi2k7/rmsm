import { RoutePlaceholder } from "@/components/public";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: "Terms of Service", description: "The terms governing use of RMSM.", path: "/legal/terms" });

export default function TermsOfServicePage() {
  return <RoutePlaceholder title="Terms of Service" description="This page is coming soon." />;
}
