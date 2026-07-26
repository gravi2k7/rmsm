import { ChevronDown } from "lucide-react";
import { HeroSplit } from "@/components/public/hero";
import { FeatureGrid } from "@/components/public/features";
import { ProductCard } from "@/components/public/cards";
import { IntegrationCard } from "@/components/public/cards/integration-card";
import { CTABanner } from "@/components/public/cta";
import { SectionHeader } from "@/components/public/content";
import { IconWrapper } from "@/components/public/icons";
import { AICapabilityGrid, AIWorkflowCard } from "@/components/public/ai";
import { Container } from "@/components/public/container";
import { Section } from "@/components/public/section";
import { buildMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/public/json-ld";
import {
  aiAgentPlatform,
  aiArchitectureLayers,
  aiBusinessBenefits,
  aiCapabilityMatrix,
  aiHero,
  aiIntelligenceModules,
  aiPlatformOverview,
  aiSecurityGovernance,
  aiTechnologyStack,
  aiWorkflowSteps,
  ragKnowledgeSteps,
} from "./content";

export const metadata = buildMetadata({
  title: "AI Solutions",
  path: "/ai",
  description:
    "RMSM's enterprise AI platform: AI agents, decision intelligence, and retrieval-augmented enterprise knowledge, architected for the governance and security requirements of institutional trading and investment teams.",
  keywords: ["enterprise AI platform", "AI trading agents", "decision intelligence software"],
});

/**
 * Enterprise AI Solutions Page (WM-006R). Composed entirely from the
 * existing design system — including the AI-specific `ai/` component
 * library (`AICapabilityGrid`, `AIWorkflowCard`) alongside the generic
 * `features/`/`cards/` components already used by Home and Platform — fed
 * with page-specific copy from `./content.ts`. Explains RMSM's enterprise
 * AI capabilities and architecture for a CTO/CIO/quant/institutional
 * audience, not generic AI marketing.
 */
export default function AiPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd({ title: "AI Solutions", description: "RMSM's enterprise AI platform: AI agents, decision intelligence, and retrieval-augmented enterprise knowledge, architected for the governance and security requirements of institutional trading and investment teams.", path: "/ai" })} />
      <HeroSplit {...aiHero} />

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader
            eyebrow="AI Platform Overview"
            title="The RMSM AI ecosystem"
            description="Eight AI capability domains that compose into a single enterprise AI platform."
          />
          <AICapabilityGrid capabilities={aiPlatformOverview} columns={3} />
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="AI Capability Matrix" title="A broad, grounded set of AI capabilities" />
          <FeatureGrid features={aiCapabilityMatrix} columns={4} />
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="AI Agent Platform" title="Enterprise agents for every workflow" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {aiAgentPlatform.map((agent) => (
              <ProductCard key={agent.name} {...agent} />
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-muted/30" id="architecture">
        <Container className="flex flex-col gap-10">
          <SectionHeader
            eyebrow="Enterprise AI Architecture"
            title="A layered AI architecture, end to end"
            description="From the presentation layer down to enterprise data sources — each layer has a clear, isolated responsibility."
          />
          <div className="mx-auto flex w-full max-w-2xl flex-col items-stretch">
            {aiArchitectureLayers.map((layer, i) => (
              <div key={layer.title} className="contents">
                <div className="flex items-center gap-4 rounded-xl border border-border bg-background p-6">
                  <IconWrapper icon={layer.icon} variant="primary" size="lg" />
                  <div>
                    <h3 className="font-semibold">{layer.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{layer.description}</p>
                  </div>
                </div>
                {i < aiArchitectureLayers.length - 1 ? (
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
          <SectionHeader eyebrow="AI Intelligence Modules" title="AI across every platform domain" />
          <FeatureGrid features={aiIntelligenceModules} columns={4} />
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="AI Workflow Engine" title="Orchestrated, auditable AI workflows" />
          <AIWorkflowCard
            title="AI Workflow Engine"
            description="Every AI-assisted workflow moves through the same governed pipeline."
            steps={aiWorkflowSteps}
            className="mx-auto w-full max-w-3xl"
          />
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="RAG & Enterprise Knowledge" title="Grounded in your enterprise knowledge" />
          <AIWorkflowCard
            title="RAG & Enterprise Knowledge"
            description="Enterprise documents and data are ingested, embedded, and retrieved to ground every AI response."
            steps={ragKnowledgeSteps}
            className="mx-auto w-full max-w-3xl"
          />
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="AI Security & Governance" title="Enterprise-grade AI governance by default" />
          <FeatureGrid features={aiSecurityGovernance} columns={4} />
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="AI Technology Stack" title="A modern, proven AI technology foundation" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {aiTechnologyStack.map((tech) => (
              <IntegrationCard key={tech.name} {...tech} />
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="AI Business Benefits" title="Business outcomes, not just AI features" />
          <FeatureGrid features={aiBusinessBenefits} columns={4} />
        </Container>
      </Section>

      <CTABanner
        title="Bring enterprise AI to your trading desk"
        description="Request an AI demo, or talk to our team about your AI governance and deployment requirements."
        primaryCta={{ label: "Request AI Demo", href: "/contact" }}
        secondaryCta={{ label: "Explore Platform", href: "/platform" }}
      />
    </>
  );
}
