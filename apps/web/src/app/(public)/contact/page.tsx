import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@rmsm/ui";
import { HeroCentered } from "@/components/public/hero";
import { FeatureGrid } from "@/components/public/features";
import { FAQSection } from "@/components/public/faq";
import { CTABanner } from "@/components/public/cta";
import { SectionHeader } from "@/components/public/content";
import { IconWrapper } from "@/components/public/icons";
import { Container } from "@/components/public/container";
import { Section } from "@/components/public/section";
import { buildMetadata } from "@/lib/seo";
import { ContactForm } from "./contact-form";
import { contactFaqs, contactHero, contactOptions, enterpriseServices, globalPresence } from "./content";

export const metadata = buildMetadata({
  title: "Contact",
  path: "/contact",
  description:
    "Contact RMSM to talk to sales, request a product demo, ask technical questions, discuss enterprise licensing, or explore partnerships.",
});

/**
 * Enterprise Contact Page (WM-010R). A Server Component composing the
 * existing design system for every static section; only the Contact Form
 * (Section 3, `./contact-form.tsx`) is a client component, since it's the
 * one part of this page that needs interactive state and validation. Every
 * "contact" action on the page — hero CTAs, contact-option cards, and the
 * final CTA — routes to the one real, frontend-only form at `#contact-form`
 * rather than a fabricated email address or backend endpoint.
 */
export default function ContactPage() {
  return (
    <>
      <HeroCentered {...contactHero} />

      <Section id="contact-options">
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Contact Options" title="Reach the right team, faster" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {contactOptions.map((option) => (
              <Card key={option.title} className="flex flex-col">
                <CardHeader>
                  <IconWrapper icon={option.icon} variant="primary" />
                  <CardTitle className="mt-2">{option.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                  <p className="text-xs text-muted-foreground">{option.contactMethod}</p>
                  <Button asChild variant="outline" className="mt-auto w-fit">
                    <Link href={option.cta.href}>{option.cta.label}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-muted/30" id="contact-form">
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Contact Form" title="Send us a message" description="No backend is connected in this milestone — submitting validates the form locally." />
          <div className="mx-auto w-full max-w-2xl">
            <ContactForm />
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader eyebrow="Enterprise Services" title="Support across your engagement" />
          <FeatureGrid features={enterpriseServices} columns={3} />
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="flex flex-col gap-10">
          <SectionHeader
            eyebrow="Office / Global Presence"
            title="A remote-first, globally available team"
            description="Conceptual messaging only — specific regional and office details are provided directly by our team."
          />
          <FeatureGrid features={globalPresence} columns={4} />
        </Container>
      </Section>

      <Section>
        <Container>
          <FAQSection title="Frequently Asked Questions" items={contactFaqs} />
        </Container>
      </Section>

      <CTABanner
        title="Let's Build the Future of Intelligent Investment Operations"
        primaryCta={{ label: "Request Demo", href: "#contact-form" }}
        secondaryCta={{ label: "Contact Sales", href: "#contact-form" }}
      />
    </>
  );
}
