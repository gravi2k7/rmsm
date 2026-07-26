import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@rmsm/ui";
import { HeroSplit } from "@/components/public/hero";
import { FeatureGrid } from "@/components/public/features";
import { AIWorkflowCard } from "@/components/public/ai";
import { CTABanner } from "@/components/public/cta";
import { SectionHeader } from "@/components/public/content";
import { IconWrapper } from "@/components/public/icons";
import { Container } from "@/components/public/container";
import { Section } from "@/components/public/section";
import { buildMetadata } from "@/lib/seo";
import {
  assetClassCoverage,
  enterpriseAnalytics,
  enterpriseRisk,
  globalCoverage,
  marketDataLayers,
  marketIntelligence,
  marketsBenefits,
  marketsHero,
  marketsOverview,
  tradingWorkflowSteps,
} from "./content";

export const metadata = buildMetadata({
  title: "Markets",
  path: "/markets",
  description:
    "RMSM Enterprise Markets: unified intelligence across equities, futures, options, forex, commodities, fixed income, ETFs, cryptocurrency, and indices — with enterprise-grade analytics, AI, and decision support.",
});

/**
 * Enterprise Markets Page (WM-007R). Composed entirely from the existing
 * design system, fed with page-specific copy from `./content.ts`. Presents
 * RMSM as a multi-asset enterprise trading and investment intelligence
 * platform — market coverage and enterprise workflows, not broker/exchange/
 * data-provider integration claims.
 *
 * The one page-local, non-shared layout (Asset Class Coverage, Section 4)
 * uses `@rmsm/ui`'s generic `Card` primitives directly rather than adding a
 * new public design-system component, since its four-field shape
 * (Overview/Analytics/Decision Support/AI Capabilities) isn't reused
 * elsewhere — same conservative approach WM-004R used for its Benefits
 * section.
 */
export default function MarketsPage() {
  return (
    <>
      <HeroSplit {...marketsHero} />

      <Section id="markets">
        <Container className="flex flex-col gap-10">
          <SectionHeader
            eyebrow="Markets Overview"
            title="Unified coverage across global markets"
            description="Nine market categories, one integrated platform."
          />
          <FeatureGrid features={marketsOverview} columns={3} />
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Market Intelligence" title="Understand every market, continuously" />
          <FeatureGrid features={marketIntelligence} columns={4} />
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader
            eyebrow="Asset Class Coverage"
            title="Depth across every asset class"
            description="Overview, analytics, decision support, and AI capabilities for each covered asset class."
          />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {assetClassCoverage.map((asset) => (
              <Card key={asset.name}>
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <IconWrapper icon={asset.icon} variant="primary" />
                  <CardTitle>{asset.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">Overview</p>
                    <p className="text-muted-foreground">{asset.overview}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Analytics</p>
                    <p className="text-muted-foreground">{asset.analytics}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Decision Support</p>
                    <p className="text-muted-foreground">{asset.decisionSupport}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">AI Capabilities</p>
                    <p className="text-muted-foreground">{asset.aiCapabilities}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Trading Workflows" title="One workflow, from research to reporting" />
          <AIWorkflowCard
            title="Institutional Trading Workflow"
            description="Every covered market moves through the same structured, auditable workflow."
            steps={tradingWorkflowSteps}
            className="mx-auto w-full max-w-4xl"
          />
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Enterprise Analytics" title="Analytics for every desk" />
          <FeatureGrid features={enterpriseAnalytics} columns={4} />
        </Container>
      </Section>

      <Section className="bg-muted/30" id="architecture">
        <Container className="flex flex-col gap-10">
          <SectionHeader
            eyebrow="Market Data Architecture"
            title="From external data to portfolio decisions"
            description="A conceptual data flow — from external market data through to portfolio-level decision support."
          />
          <div className="mx-auto flex w-full max-w-2xl flex-col items-stretch">
            {marketDataLayers.map((layer, i) => (
              <div key={layer.title} className="contents">
                <div className="flex items-center gap-4 rounded-xl border border-border bg-background p-6">
                  <IconWrapper icon={layer.icon} variant="primary" size="lg" />
                  <div>
                    <h3 className="font-semibold">{layer.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{layer.description}</p>
                  </div>
                </div>
                {i < marketDataLayers.length - 1 ? (
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
          <SectionHeader eyebrow="Enterprise Risk" title="Risk visibility across every position" />
          <FeatureGrid features={enterpriseRisk} columns={4} />
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader
            eyebrow="Global Coverage"
            title="Built for global markets, by design"
            description="RMSM's modular architecture is designed to support global markets. Regional availability depends on deployment and regulatory requirements."
          />
          <FeatureGrid features={globalCoverage} columns={3} />
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Enterprise Benefits" title="Business outcomes, not just market data" />
          <FeatureGrid features={marketsBenefits} columns={3} />
        </Container>
      </Section>

      <CTABanner
        title="See enterprise market intelligence in action"
        description="Request an enterprise demo, or talk to our team about your market coverage requirements."
        primaryCta={{ label: "Request Enterprise Demo", href: "/contact" }}
        secondaryCta={{ label: "Explore Platform", href: "/platform" }}
      />
    </>
  );
}
