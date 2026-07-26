import { ChevronDown } from "lucide-react";
import { HeroSplit } from "@/components/public/hero";
import { FeatureGrid } from "@/components/public/features";
import { ProductCard } from "@/components/public/cards";
import { IntegrationCard } from "@/components/public/cards/integration-card";
import { CTABanner } from "@/components/public/cta";
import { SectionHeader } from "@/components/public/content";
import { IconWrapper } from "@/components/public/icons";
import { Container } from "@/components/public/container";
import { Section } from "@/components/public/section";
import { buildMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/public/json-ld";
import {
  architectureLayers,
  deploymentModels,
  enterpriseBenefits,
  enterpriseFeatures,
  integrationCapabilities,
  platformDomains,
  platformHero,
  platformOverviewDomains,
  securityCompliance,
  technologyStack,
} from "./content";

export const metadata = buildMetadata({
  title: "Platform",
  path: "/platform",
  description:
    "RMSM is an enterprise trading intelligence platform: an integrated, AI-powered investment and trading platform architected for the operational, security, and compliance requirements of institutional trading desks.",
  keywords: ["enterprise trading platform", "trading platform architecture", "institutional trading software"],
});

/**
 * Enterprise Platform Page (WM-005R). Composed entirely from the existing
 * design system, fed with page-specific copy from `./content.ts`. Explains
 * RMSM as a modular enterprise platform for a CTO/CIO/institutional
 * audience — capabilities and architecture, not marketing slogans.
 */
export default function PlatformPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd({ title: "Platform", description: "RMSM is an enterprise trading intelligence platform: an integrated, AI-powered investment and trading platform architected for the operational, security, and compliance requirements of institutional trading desks.", path: "/platform" })} />
      <HeroSplit {...platformHero} />

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader
            eyebrow="Platform Overview"
            title="A modular enterprise platform"
            description="Eight domains that compose into a single, integrated trading intelligence platform."
          />
          <FeatureGrid features={platformOverviewDomains} columns={4} />
        </Container>
      </Section>

      <Section className="bg-muted/30" id="architecture">
        <Container className="flex flex-col gap-10">
          <SectionHeader
            eyebrow="Enterprise Architecture"
            title="A layered architecture, end to end"
            description="From the presentation layer down to data — each layer has a clear, isolated responsibility."
          />
          <div className="mx-auto flex w-full max-w-2xl flex-col items-stretch">
            {architectureLayers.map((layer, i) => (
              <div key={layer.title} className="contents">
                <div className="flex items-center gap-4 rounded-xl border border-border bg-background p-6">
                  <IconWrapper icon={layer.icon} variant="primary" size="lg" />
                  <div>
                    <h3 className="font-semibold">{layer.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{layer.description}</p>
                  </div>
                </div>
                {i < architectureLayers.length - 1 ? (
                  <div className="flex justify-center py-2" aria-hidden="true">
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Platform Domains" title="Every domain your enterprise needs" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {platformDomains.map((domain) => (
              <ProductCard key={domain.name} {...domain} />
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Enterprise Features" title="Built for enterprise IT from the ground up" />
          <FeatureGrid features={enterpriseFeatures} columns={4} />
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Technology Stack" title="A modern, proven technology foundation" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {technologyStack.map((tech) => (
              <IntegrationCard key={tech.name} {...tech} />
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Deployment Models" title="Deploy the way your enterprise requires" />
          <FeatureGrid features={deploymentModels} columns={4} />
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Security & Compliance" title="Enterprise-grade security by default" />
          <FeatureGrid features={securityCompliance} columns={3} />
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Integration" title="Connects to the systems you already run" />
          <FeatureGrid features={integrationCapabilities} columns={3} />
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Enterprise Benefits" title="Business outcomes, not just features" />
          <FeatureGrid features={enterpriseBenefits} columns={4} />
        </Container>
      </Section>

      <CTABanner
        title="See the RMSM enterprise platform in action"
        description="Request an enterprise demo, or talk to our team about your architecture and deployment requirements."
        primaryCta={{ label: "Request Enterprise Demo", href: "/contact" }}
        secondaryCta={{ label: "Explore Home", href: "/" }}
      />
    </>
  );
}
