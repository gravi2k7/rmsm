import {
  ArrowRightLeft,
  Briefcase,
  Building2,
  Clock,
  FileSignature,
  Globe,
  Handshake,
  Laptop,
  LifeBuoy,
  MapPin,
  MessageCircle,
  Presentation,
  Puzzle,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FeatureCardProps } from "@/components/public/features";
import type { FAQItemProps } from "@/components/public/faq";

/**
 * WM-010R Enterprise Contact Page copy/data. Same pattern as every prior
 * milestone's `content.ts` — page composes existing design-system
 * components, static data lives here so `page.tsx` stays a thin Server
 * Component composition. The interactive Contact Form (Section 3) is the
 * one part of this page that needs client-side state/validation — its
 * data (field options) lives in `./contact-form.tsx` instead, next to the
 * "use client" component that actually uses it, keeping this file free of
 * anything that would force it to be a client module too.
 */

export const contactHero = {
  eyebrow: "Get in Touch",
  title: "Contact RMSM",
  subtitle: "Connect with our team to explore intelligent trading, AI automation, and enterprise investment solutions.",
  primaryCta: { label: "Request Demo", href: "#contact-form" },
  secondaryCta: { label: "Talk to Sales", href: "#contact-options" },
} as const;

export interface ContactOption {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Deliberately not a real email/phone number — the only real contact
   * mechanism on this page is the form below (per the spec's "no real
   * email addresses" / "no backend implementation" constraints). */
  contactMethod: string;
  cta: { label: string; href: string };
}

export const contactOptions: ContactOption[] = [
  {
    icon: Handshake,
    title: "Sales",
    description: "Talk to our sales team about enterprise plans, pricing, and procurement.",
    contactMethod: "Available via the contact form",
    cta: { label: "Contact Sales", href: "#contact-form" },
  },
  {
    icon: FileSignature,
    title: "Enterprise Licensing",
    description: "Discuss licensing models, enterprise agreements, and commercial terms.",
    contactMethod: "Available via the contact form",
    cta: { label: "Discuss Licensing", href: "#contact-form" },
  },
  {
    icon: LifeBuoy,
    title: "Technical Support",
    description: "Ask technical questions about the platform, architecture, or integrations.",
    contactMethod: "Available via the contact form",
    cta: { label: "Ask a Question", href: "#contact-form" },
  },
  {
    icon: Users,
    title: "Partnerships",
    description: "Explore technology, integration, or channel partnership opportunities.",
    contactMethod: "Available via the contact form",
    cta: { label: "Explore Partnership", href: "#contact-form" },
  },
  {
    icon: MessageCircle,
    title: "General Enquiries",
    description: "Anything else — get in touch and our team will route it to the right people.",
    contactMethod: "Available via the contact form",
    cta: { label: "Get in Touch", href: "#contact-form" },
  },
];

export const enterpriseServices: FeatureCardProps[] = [
  { icon: Presentation, title: "Product Demonstrations", description: "A guided walkthrough of the platform tailored to your organization." },
  { icon: Wrench, title: "Implementation Consulting", description: "Support planning and executing your platform implementation." },
  { icon: Building2, title: "Enterprise Architecture Reviews", description: "A review of how the platform fits your existing enterprise architecture." },
  { icon: Puzzle, title: "Custom Integrations", description: "Discuss integration requirements beyond the standard platform capabilities." },
  { icon: ArrowRightLeft, title: "Migration Planning", description: "Plan a migration from your existing tools and workflows." },
  { icon: Briefcase, title: "Professional Services", description: "Additional advisory and delivery support across your engagement." },
];

export const globalPresence: FeatureCardProps[] = [
  { icon: Globe, title: "Global Support", description: "Conceptually designed to support customers across regions." },
  { icon: Laptop, title: "Remote-First Team", description: "A team structured to work and support customers remotely." },
  { icon: Clock, title: "Worldwide Availability", description: "Conceptually designed with availability across time zones in mind." },
  { icon: MapPin, title: "Regional Coverage", description: "Regional coverage details are provided directly by our team." },
];

export const contactFaqs: FAQItemProps[] = [
  {
    question: "How quickly will someone respond?",
    answer: "Response times vary by request type and volume. Our team aims to respond as quickly as possible to every enquiry submitted through this page.",
  },
  {
    question: "Can I request a demo?",
    answer: "Yes. Select \"Request a Product Demo\" as your subject in the contact form and our team will follow up.",
  },
  {
    question: "Do you support enterprise deployments?",
    answer: "Yes. Enterprise deployment options are discussed directly with our team based on your requirements — use the contact form to start that conversation.",
  },
  {
    question: "Do you provide implementation services?",
    answer: "Yes. Implementation consulting and related professional services are available and scoped directly with our team.",
  },
  {
    question: "How do I discuss licensing?",
    answer: "Select \"Discuss Enterprise Licensing\" as your subject in the contact form, and our team will follow up to discuss terms.",
  },
];
