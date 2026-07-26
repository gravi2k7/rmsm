import { HeroWithImage } from "@/components/public/hero";
import { FeatureGrid } from "@/components/public/features";
import { ComparisonTable } from "@/components/public/comparison";
import { LogoCloud } from "@/components/public/logos";
import { TestimonialGrid } from "@/components/public/testimonial";
import { CTABanner } from "@/components/public/cta";
import { SectionHeader } from "@/components/public/content";
import { IconWrapper } from "@/components/public/icons";
import { Container } from "@/components/public/container";
import { Section } from "@/components/public/section";
import { buildMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/public/json-ld";
import {
  architectureCards,
  benefits,
  customerTestimonials,
  heroContent,
  keyFeatures,
  platformOverviewCards,
  trustedByLogos,
  whyRmsmColumns,
  whyRmsmRows,
} from "./content";

export const metadata = buildMetadata({
  path: "/",
  description:
    "RMSM is an institutional-grade AI trading platform combining real-time market intelligence, strategy execution, portfolio risk management, and AI-driven trading copilots.",
  keywords: ["enterprise trading platform", "AI trading intelligence", "institutional trading software", "portfolio risk management"],
});

/**
 * Enterprise Home Page (WM-004R). Composed entirely from the existing
 * WM-003R marketing design system plus the WM-002R shell — no new UI
 * patterns, only existing components fed with page-specific copy from
 * `./content.ts`. Per WM-004R's explicit scope: this milestone touches only
 * the `/` route; Platform, AI, Pricing, Markets, and Contact remain their
 * existing `RoutePlaceholder` pages.
 */
export default function HomePage() {
  return (
    <>
      <JsonLd data={webPageJsonLd({ title: undefined, description: "RMSM is an institutional-grade AI trading platform combining real-time market intelligence, strategy execution, portfolio risk management, and AI-driven trading copilots.", path: "/" })} />
      <HeroWithImage {...heroContent} background="gradient" />

      <Section>
        <Container>
          <LogoCloud title="Trusted by leading trading desks worldwide" logos={trustedByLogos} variant="marquee" />
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader
            eyebrow="Platform Overview"
            title="Everything your desk needs, in one platform"
            description="Six capabilities that replace the disconnected tools most trading desks stitch together today."
          />
          <FeatureGrid features={platformOverviewCards} columns={3} />
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Key Features" title="Built for how enterprise trading desks actually work" />
          <FeatureGrid features={keyFeatures} columns={3} />
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader
            eyebrow="Why RMSM"
            title="A single platform instead of a patchwork of tools"
            description="See how RMSM compares to legacy tooling and single-purpose point solutions."
          />
          <ComparisonTable columns={whyRmsmColumns} rows={whyRmsmRows} caption="Comparison of RMSM against legacy tools and point solutions" />
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader
            eyebrow="Platform Architecture"
            title="Four layers, one platform"
            description="Data, intelligence, execution, and risk work together instead of living in separate systems."
          />
          <FeatureGrid features={architectureCards} columns={4} />
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Benefits" title="The business value of a unified trading platform" />
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="flex flex-col gap-4 rounded-xl border border-border p-6">
                <IconWrapper icon={benefit.icon} variant="primary" size="lg" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-primary">{benefit.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight">{benefit.title}</h3>
                  <p className="mt-2 text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Customer Success" title="What trading desks say about RMSM" />
          <TestimonialGrid testimonials={customerTestimonials} columns={3} />
        </Container>
      </Section>

      <CTABanner
        title="Bring enterprise AI trading intelligence to your desk"
        description="Request a demo, or explore the platform to see how RMSM fits your existing workflow."
        primaryCta={{ label: "Request Demo", href: "/contact" }}
        secondaryCta={{ label: "Explore Platform", href: "/platform" }}
      />
    </>
  );
}
