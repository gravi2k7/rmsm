import { RoutePlaceholder } from "@/components/public";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: "Blog", description: "News and updates from RMSM.", path: "/blog" });

export default function BlogPage() {
  return <RoutePlaceholder title="Blog" description="News and updates from RMSM." />;
}
