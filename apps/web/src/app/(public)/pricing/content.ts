import {
  ArrowRightLeft,
  Briefcase,
  Building2,
  Cloud,
  CloudCog,
  Code,
  Eye,
  FileSignature,
  GraduationCap,
  Layers,
  LifeBuoy,
  Lock,
  Puzzle,
  Server,
  Settings,
  Shuffle,
  User,
  Wrench,
} from "lucide-react";
import type { FeatureCardProps } from "@/components/public/features";
import type { PricingCardProps } from "@/components/public/pricing";
import type { FeatureListItem } from "@/components/public/features";
import type { ComparisonColumn, ComparisonRow } from "@/components/public/comparison";
import type { FAQItemProps } from "@/components/public/faq";

/**
 * WM-008R Enterprise Pricing Page copy/data. Same pattern as every prior
 * milestone's `content.ts` — page composes existing design-system
 * components, data lives here so `page.tsx` stays a thin composition.
 *
 * Per the spec: no actual pricing is invented anywhere in this file.
 * Every plan's `price` is a literal placeholder string ("Contact Sales"),
 * and the feature-comparison table is explicitly captioned as illustrative
 * and subject to change — not a finalized commercial commitment.
 */

export const pricingHero = {
  eyebrow: "Enterprise Pricing",
  badge: "Modular licensing, built for scale",
  title: "Enterprise Pricing",
  subtitle: "Flexible plans designed for professional traders, investment firms, and enterprise organizations.",
  // WM-020A — self-serve trial replaces "Talk to Sales" as the hero's
  // primary path; secondary "Request Demo" CTA and every per-plan
  // "Talk to Sales" button below are unchanged (still /contact).
  primaryCta: { label: "Start Free Trial", href: "/signup" },
  secondaryCta: { label: "Request Demo", href: "/contact" },
} as const;

export const pricingPhilosophy: FeatureCardProps[] = [
  { icon: Eye, title: "Transparent Pricing", description: "Clear plan structure with no hidden fees or surprise charges." },
  { icon: Layers, title: "Scalable Plans", description: "Plans designed to grow with your desk, team, or organization." },
  { icon: Building2, title: "Enterprise Flexibility", description: "Commercial terms structured around enterprise procurement and deployment needs." },
  { icon: Puzzle, title: "Modular Licensing", description: "License the platform capabilities your organization actually needs." },
];

const starterFeatures: FeatureListItem[] = [
  { label: "Core platform access" },
  { label: "Standard market coverage" },
  { label: "Community support" },
];

const professionalFeatures: FeatureListItem[] = [
  { label: "Everything in Starter" },
  { label: "Advanced analytics and AI capabilities" },
  { label: "Priority support" },
  { label: "API access" },
];

const enterpriseFeatures: FeatureListItem[] = [
  { label: "Everything in Professional" },
  { label: "SSO and RBAC" },
  { label: "Audit logging" },
  { label: "Dedicated support" },
];

export const pricingPlans: PricingCardProps[] = [
  {
    name: "Starter",
    price: "Contact Sales",
    description: "For individual traders and small teams getting started.",
    features: starterFeatures,
    cta: { label: "Talk to Sales", href: "/contact" },
  },
  {
    name: "Professional",
    price: "Contact Sales",
    description: "For professional trading and investment teams.",
    features: professionalFeatures,
    cta: { label: "Talk to Sales", href: "/contact" },
    badge: "Most Popular",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Contact Sales",
    description: "For institutions with enterprise governance and support needs.",
    features: enterpriseFeatures,
    cta: { label: "Talk to Sales", href: "/contact" },
  },
];

export const customPlan = {
  title: "Custom",
  description: "For institutions with bespoke deployment, licensing, or integration requirements — commercial and technical terms tailored to your organization.",
  features: [
    { label: "Private or on-premises deployment" },
    { label: "Custom integrations" },
    { label: "Enterprise agreements" },
    { label: "Dedicated implementation support" },
  ] as FeatureListItem[],
  cta: { label: "Talk to Sales", href: "/contact" },
};

export const featureComparisonColumns: ComparisonColumn[] = [
  { key: "starter", label: "Starter" },
  { key: "professional", label: "Professional", highlight: true },
  { key: "enterprise", label: "Enterprise" },
  { key: "custom", label: "Custom" },
];

export const featureComparisonRows: ComparisonRow[] = [
  { label: "AI Platform", values: { starter: true, professional: true, enterprise: true, custom: true } },
  { label: "Trading Intelligence", values: { starter: true, professional: true, enterprise: true, custom: true } },
  { label: "Market Intelligence", values: { starter: true, professional: true, enterprise: true, custom: true } },
  { label: "Portfolio Intelligence", values: { starter: false, professional: true, enterprise: true, custom: true } },
  { label: "Risk Intelligence", values: { starter: false, professional: true, enterprise: true, custom: true } },
  { label: "Workflow Automation", values: { starter: false, professional: true, enterprise: true, custom: true } },
  { label: "API Access", values: { starter: false, professional: true, enterprise: true, custom: true } },
  { label: "SSO", values: { starter: false, professional: false, enterprise: true, custom: true } },
  { label: "RBAC", values: { starter: false, professional: false, enterprise: true, custom: true } },
  { label: "Audit Logging", values: { starter: false, professional: false, enterprise: true, custom: true } },
  { label: "Priority Support", values: { starter: false, professional: true, enterprise: true, custom: true } },
  { label: "Custom Integrations", values: { starter: false, professional: false, enterprise: false, custom: true } },
];

export const featureComparisonCaption =
  "Feature availability by plan is illustrative and subject to change. Contact sales for current plan details.";

export const enterpriseLicensing: FeatureCardProps[] = [
  { icon: User, title: "Per User", description: "Licensing scoped to individual named users." },
  { icon: Building2, title: "Per Organization", description: "Licensing scoped to your entire organization." },
  { icon: FileSignature, title: "Enterprise Agreement", description: "Custom commercial terms negotiated directly with our team." },
  { icon: Lock, title: "Private Deployment", description: "Licensing structured around a private or dedicated deployment." },
  { icon: Settings, title: "Custom Licensing", description: "Licensing tailored to requirements not covered by standard plans." },
];

export const deploymentOptions: FeatureCardProps[] = [
  { icon: Cloud, title: "Cloud", description: "Conceptually supported deployment on a cloud provider of your choice." },
  { icon: CloudCog, title: "Private Cloud", description: "Conceptually supported deployment on dedicated cloud infrastructure." },
  { icon: Shuffle, title: "Hybrid", description: "Conceptually supported mix of cloud and on-premises components." },
  { icon: Server, title: "On-Premises", description: "Conceptually supported deployment within your own data center." },
];

export const professionalServices: FeatureCardProps[] = [
  { icon: Wrench, title: "Implementation", description: "Support getting your organization onboarded and configured." },
  { icon: ArrowRightLeft, title: "Migration", description: "Support migrating from existing tools and workflows." },
  { icon: GraduationCap, title: "Training", description: "Training for your team on platform capabilities and workflows." },
  { icon: Briefcase, title: "Consulting", description: "Advisory support on adoption, workflow, and configuration." },
  { icon: Code, title: "Custom Development", description: "Custom development for requirements outside the standard platform." },
  { icon: LifeBuoy, title: "Support", description: "Ongoing support across your deployment." },
];

export const pricingFaqs: FAQItemProps[] = [
  {
    question: "How is pricing determined?",
    answer: "Pricing is determined based on your organization's scale, deployment model, and feature requirements. Contact our sales team for a tailored quote.",
  },
  {
    question: "Can RMSM be deployed privately?",
    answer: "RMSM's architecture is designed to conceptually support private and on-premises deployment. Contact our sales team to discuss your specific requirements.",
  },
  {
    question: "Do you offer enterprise agreements?",
    answer: "Yes. Enterprise agreements with custom commercial terms are available — contact our sales team to get started.",
  },
  {
    question: "How do custom integrations work?",
    answer: "Custom integration requirements are scoped and discussed directly with our team as part of the Enterprise or Custom plan conversation.",
  },
  {
    question: "How is support provided?",
    answer: "Support level varies by plan, from community support up to dedicated enterprise support. Contact our sales team for details on your plan.",
  },
];
