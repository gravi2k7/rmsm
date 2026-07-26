import { RoutePlaceholder } from "@/components/public";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: "AI", description: "AI-driven trading intelligence.", path: "/ai" });

export default function AiPage() {
  return <RoutePlaceholder title="AI" description="AI-driven trading intelligence." />;
}
