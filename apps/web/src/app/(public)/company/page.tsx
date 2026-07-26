import { HeroCentered } from "@/components/public/hero";
import { FeatureGrid, FeatureList } from "@/components/public/features";
import { Roadmap } from "@/components/public/timeline";
import { TeamGrid } from "@/components/public/team";
import { IconCard } from "@/components/public/cards";
import { CTABanner } from "@/components/public/cta";
import { SectionHeader } from "@/components/public/content";
import { Container } from "@/components/public/container";
import { Section } from "@/components/public/section";
import { buildMetadata } from "@/lib/seo";
import {
  aboutHero,
  aboutTeamGroups,
  capabilitiesTimeline,
  enterpriseValues,
  globalPlatformVision,
  ourMission,
  ourVision,
  platformPhilosophy,
  responsibleAi,
  whatRmsmStandsFor,
  whyChooseRmsm,
} from "./content";

export const metadata = buildMetadata({
  title: "About",
  path: "/company",
  description:
    "About RMSM: building the next generation enterprise platform for intelligent trading, investment operations, AI automation, and market intelligence.",
});

/**
 * About RMSM Page (WM-009R). Composed entirely from the existing design
 * system — including the `timeline/` (`Roadmap`) and `team/` (`TeamGrid`)
 * component libraries, built in WM-003R but unused by any page until now.
 *
 * Section 9 ("Leadership / Team") reuses `TeamCard`'s `name`/`role` fields
 * at the functional-team level ("Leadership", "Engineering", ...) rather
 * than naming any individual — per the spec's explicit instruction not to
 * invent people. No marketing hype, customer counts, awards, or
 * certifications are claimed anywhere on this page.
 */
export default function AboutPage() {
  return (
    <>
      <HeroCentered {...aboutHero} />

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Our Vision" title="Building the next generation enterprise platform" />
          <FeatureGrid features={ourVision} columns={3} />
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Our Mission" title="What we're working to achieve" align="left" />
          <div className="mx-auto w-full max-w-3xl">
            <FeatureList items={ourMission} columns={2} />
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="What RMSM Stands For" title="Core principles behind the platform" />
          <FeatureGrid features={whatRmsmStandsFor} columns={4} />
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Platform Philosophy" title="Engineering principles behind the platform" />
          <FeatureGrid features={platformPhilosophy} columns={4} />
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader
            eyebrow="Enterprise Capabilities Timeline"
            title="How the platform has evolved"
            description="A conceptual view of platform evolution — not tied to specific dates."
          />
          <Roadmap items={capabilitiesTimeline} />
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Why Organizations Choose RMSM" title="What sets the platform apart" />
          <FeatureGrid features={whyChooseRmsm} columns={4} />
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader
            eyebrow="Responsible AI"
            title="AI built with oversight and accountability"
            description="Our approach to AI, described conceptually."
          />
          <FeatureGrid features={responsibleAi} columns={3} />
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader
            eyebrow="Leadership / Team"
            title="The teams behind RMSM"
            description="A placeholder overview of our functional teams, not individual biographies."
          />
          <TeamGrid members={aboutTeamGroups} columns={3} />
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Enterprise Values" title="The values that guide how we work" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {enterpriseValues.map((value) => (
              <IconCard key={value.title} {...value} />
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader
            eyebrow="Global Platform Vision"
            title="Designed to support institutions everywhere"
            description="Conceptual messaging only — regional and organizational availability depends on deployment."
          />
          <FeatureGrid features={globalPlatformVision} columns={3} />
        </Container>
      </Section>

      <CTABanner
        title="Ready to Explore RMSM?"
        description="Request a demo, or talk to our team about how RMSM fits your organization."
        primaryCta={{ label: "Request Demo", href: "/contact" }}
        secondaryCta={{ label: "Contact Sales", href: "/contact" }}
      />
    </>
  );
}
