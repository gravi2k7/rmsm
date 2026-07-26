import { RoutePlaceholder } from "@/components/public";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: "Platform", description: "The RMSM platform, end to end.", path: "/platform" });

export default function PlatformPage() {
  return <RoutePlaceholder title="Platform" description="The RMSM platform, end to end." />;
}
