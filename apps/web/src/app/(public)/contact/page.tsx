import { RoutePlaceholder } from "@/components/public";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: "Contact", description: "Get in touch with RMSM.", path: "/contact" });

export default function ContactPage() {
  return <RoutePlaceholder title="Contact" description="Get in touch with RMSM." />;
}
