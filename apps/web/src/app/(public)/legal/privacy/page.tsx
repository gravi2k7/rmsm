import { RoutePlaceholder } from "@/components/public";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: "Privacy Policy", description: "How RMSM handles your data.", path: "/legal/privacy" });

export default function PrivacyPolicyPage() {
  return <RoutePlaceholder title="Privacy Policy" description="This page is coming soon." />;
}
