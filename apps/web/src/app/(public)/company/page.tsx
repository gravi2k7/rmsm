import { RoutePlaceholder } from "@/components/public";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: "Company", description: "About RMSM.", path: "/company" });

export default function CompanyPage() {
  return <RoutePlaceholder title="Company" description="About RMSM." />;
}
