import { HeroCentered } from "@/components/public/hero";
import { FeatureGrid } from "@/components/public/features";
import { PricingGrid, EnterprisePlanCard, ComparisonTable } from "@/components/public/pricing";
import { FAQSection } from "@/components/public/faq";
import { CTABanner } from "@/components/public/cta";
import { SectionHeader } from "@/components/public/content";
import { Container } from "@/components/public/container";
import { Section } from "@/components/public/section";
import { buildMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/public/json-ld";
import {
  customPlan,
  deploymentOptions,
  enterpriseLicensing,
  featureComparisonCaption,
  featureComparisonColumns,
  featureComparisonRows,
  pricingFaqs,
  pricingHero,
  pricingPhilosophy,
  pricingPlans,
  professionalServices,
} from "./content";

export const metadata = buildMetadata({
  title: "Pricing",
  path: "/pricing",
  description:
    "RMSM Enterprise Pricing: flexible, modular licensing for professional traders, investment firms, and enterprise organizations. Contact sales for a tailored quote.",
  keywords: ["enterprise software pricing", "trading platform pricing"],
});

/**
 * Enterprise Pricing Page (WM-008R). Composed entirely from the existing
 * design system — the `pricing/`, `comparison/`, and `faq/` component
 * libraries — fed with page-specific copy from `./content.ts`. No actual
 * pricing is invented anywhere on this page: every plan price is the
 * literal placeholder "Contact Sales," and the feature-comparison table is
 * explicitly captioned as illustrative and subject to change.
 */
export default function PricingPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd({ title: "Pricing", description: "RMSM Enterprise Pricing: flexible, modular licensing for professional traders, investment firms, and enterprise organizations. Contact sales for a tailored quote.", path: "/pricing" })} />
      <HeroCentered {...pricingHero} />

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Pricing Philosophy" title="Pricing built for how enterprises actually buy software" />
          <FeatureGrid features={pricingPhilosophy} columns={4} />
        </Container>
      </Section>

      <Section className="bg-muted/30" id="plans">
        <Container className="flex flex-col gap-10">
          <SectionHeader
            eyebrow="Pricing Plans"
            title="Plans for every stage"
            description="Exact pricing is determined with our sales team based on your organization's needs."
          />
          <PricingGrid plans={pricingPlans} />
          <EnterprisePlanCard {...customPlan} />
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Feature Comparison" title="Compare plan capabilities" />
          <ComparisonTable columns={featureComparisonColumns} rows={featureComparisonRows} />
          <p className="text-center text-sm text-muted-foreground">{featureComparisonCaption}</p>
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Enterprise Licensing" title="Licensing models built for enterprise procurement" />
          <FeatureGrid features={enterpriseLicensing} columns={3} />
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader
            eyebrow="Deployment Options"
            title="Deploy the way your organization requires"
            description="Deployment models are described conceptually — availability depends on your specific engagement."
          />
          <FeatureGrid features={deploymentOptions} columns={4} />
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Professional Services" title="Optional services to support your deployment" />
          <FeatureGrid features={professionalServices} columns={3} />
        </Container>
      </Section>

      <Section>
        <Container>
          <FAQSection title="Frequently Asked Questions" items={pricingFaqs} />
        </Container>
      </Section>

      <CTABanner
        title="Talk to our sales team"
        description="Get a tailored quote, or request a demo to see the RMSM platform in action."
        primaryCta={{ label: "Talk to Sales", href: "/contact" }}
        secondaryCta={{ label: "Explore Platform", href: "/platform" }}
      />
    </>
  );
}
