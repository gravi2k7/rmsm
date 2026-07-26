import {
  Activity,
  BarChart3,
  Bell,
  Eye,
  Gauge,
  LayoutDashboard,
  Lock,
  Radar,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Workflow as WorkflowIcon,
} from "lucide-react";
import type { FeatureCardProps } from "@/components/public/features";
import type { LogoItem } from "@/components/public/logos";
import type { TestimonialCardProps } from "@/components/public/testimonial";
import type { ComparisonColumn, ComparisonRow } from "@/components/public/comparison";

/**
 * WM-004R Enterprise Home Page copy/data. Kept out of `page.tsx` so the page
 * itself stays a thin composition of existing design-system components —
 * nothing here is a new UI pattern, only props the existing components
 * already accept (per WM-004R's "compose, do not create" constraint).
 */

export const heroContent = {
  eyebrow: "RMSM Enterprise Platform",
  badge: "Institutional-grade AI trading platform",
  title: "Enterprise AI trading intelligence, unified for the modern desk",
  subtitle: "Real-time market intelligence, execution, and risk management in one enterprise-grade platform.",
  description:
    "RMSM brings market data, AI-driven signals, strategy execution, and portfolio risk management together in a single, auditable workspace built for institutional trading desks.",
  // WM-020A — hero primary CTA now drives self-serve signup instead of
  // a sales conversation; "Request Demo" still exists site-wide (this
  // page's own closing CTABanner, and every other page's), unchanged.
  primaryCta: { label: "Start Free Trial", href: "/signup" },
  secondaryCta: { label: "Explore Platform", href: "/platform" },
} as const;

export const trustedByLogos: LogoItem[] = [
  { name: "Marlow Capital" },
  { name: "Northbridge Partners" },
  { name: "Sable Peak Advisors" },
  { name: "Aldergate Investments" },
  { name: "Verity Asset Management" },
  { name: "Kestrel Trading Group" },
];

export const platformOverviewCards: FeatureCardProps[] = [
  {
    icon: Sparkles,
    title: "AI Platform",
    description: "A conversational AI copilot with persistent memory of your portfolio, preferences, and strategy history.",
    href: "/ai",
    linkLabel: "Learn more",
  },
  {
    icon: TrendingUp,
    title: "Trading Intelligence",
    description: "Continuous, AI-scored signal generation ranked by conviction, risk, and fit with your existing positions.",
    href: "/ai",
    linkLabel: "Learn more",
  },
  {
    icon: BarChart3,
    title: "Market Analytics",
    description: "Real-time analytics across equities, futures, options, FX, and digital assets in one unified view.",
    href: "/markets",
    linkLabel: "Learn more",
  },
  {
    icon: LayoutDashboard,
    title: "Portfolio Management",
    description: "A real-time view of positions, exposure, cash, and buying power across every account.",
    href: "/platform",
    linkLabel: "Learn more",
  },
  {
    icon: ShieldCheck,
    title: "Risk Engine",
    description: "Continuous position limits, exposure monitoring, and margin visibility enforced automatically.",
    href: "/platform",
    linkLabel: "Learn more",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Role-based access, full audit logging, and encryption at rest and in transit across the platform.",
    href: "/platform",
    linkLabel: "Learn more",
  },
];

export const keyFeatures: FeatureCardProps[] = [
  { icon: Radar, title: "Market scanning at scale", description: "Continuous scanning across thousands of instruments, surfaced the moment they match your criteria." },
  { icon: Eye, title: "Explainable decision support", description: "Every AI-generated signal ships with the reasoning behind it, not just a score." },
  { icon: WorkflowIcon, title: "Strategy builder", description: "Compose, backtest, and deploy rules-based and AI-assisted strategies with guardrails." },
  { icon: Bell, title: "Real-time notifications", description: "Alerts on positions, orders, risk thresholds, and AI signals as they happen." },
  { icon: Gauge, title: "Execution analytics", description: "Slippage, fill quality, and latency tracked on every order, end to end." },
  { icon: Activity, title: "Unified workspace", description: "Portfolio, watchlists, orders, and decisions in a single command center." },
];

export const whyRmsmColumns: ComparisonColumn[] = [
  { key: "legacy", label: "Legacy Tools" },
  { key: "point", label: "Point Solutions" },
  { key: "rmsm", label: "RMSM", highlight: true },
];

export const whyRmsmRows: ComparisonRow[] = [
  { label: "Unified market data & execution", values: { legacy: false, point: "Partial", rmsm: true } },
  { label: "AI-driven, explainable signals", values: { legacy: false, point: false, rmsm: true } },
  { label: "Real-time risk & exposure monitoring", values: { legacy: "Manual", point: "Partial", rmsm: true } },
  { label: "Enterprise security & audit trails", values: { legacy: "Partial", point: "Partial", rmsm: true } },
  { label: "Single workspace for the whole desk", values: { legacy: false, point: false, rmsm: true } },
];

export const architectureCards: FeatureCardProps[] = [
  { icon: Server, title: "Data Layer", description: "Real-time market data, portfolio state, and historical records normalized across every connected venue." },
  { icon: Sparkles, title: "Intelligence Layer", description: "AI signal generation, scanning, and decision support built directly on top of your live data." },
  { icon: WorkflowIcon, title: "Execution Layer", description: "Order routing and execution management with full audit trails back to the originating signal." },
  { icon: ShieldCheck, title: "Risk Layer", description: "Continuous exposure, margin, and limit monitoring that sits across every position and order." },
];

export interface BenefitContent {
  icon: typeof Sparkles;
  eyebrow: string;
  title: string;
  description: string;
}

export const benefits: BenefitContent[] = [
  {
    icon: Gauge,
    eyebrow: "Faster decisions",
    title: "Move from signal to decision in seconds, not hours",
    description: "AI-scored signals with full supporting reasoning mean your desk spends less time screening and more time deciding.",
  },
  {
    icon: Lock,
    eyebrow: "Reduced operational risk",
    title: "Risk and compliance built in, not bolted on",
    description: "Continuous exposure monitoring, role-based access, and full audit trails come standard across every workflow.",
  },
];

export const customerTestimonials: TestimonialCardProps[] = [
  {
    quote: "RMSM cut the time our desk spends screening opportunities by more than half. The AI reasoning is what makes us trust the signals.",
    name: "Sarah Whitfield",
    title: "Head of Trading",
    company: "Marlow Capital",
    rating: 5,
  },
  {
    quote: "We replaced four disconnected tools with one workspace. Risk visibility alone justified the switch.",
    name: "David Chen",
    title: "Chief Risk Officer",
    company: "Northbridge Partners",
    rating: 5,
  },
  {
    quote: "The explainability behind every AI signal is what got our compliance team comfortable rolling this out desk-wide.",
    name: "Priya Ramanathan",
    title: "Portfolio Manager",
    company: "Sable Peak Advisors",
    rating: 4,
  },
];
