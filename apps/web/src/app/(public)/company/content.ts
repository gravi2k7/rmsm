import {
  Activity,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Cloud,
  Code,
  Cpu,
  Database,
  Eye,
  Gauge,
  GitBranch,
  Handshake,
  Landmark,
  Layers,
  Lightbulb,
  Lock,
  Puzzle,
  Radio,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  User,
  UserCheck,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FeatureCardProps, FeatureListItem } from "@/components/public/features";
import type { TimelineItemData } from "@/components/public/timeline";
import type { TeamCardProps } from "@/components/public/team";

/**
 * WM-009R About RMSM Page copy/data. Same pattern as every prior
 * milestone's `content.ts` — page composes existing design-system
 * components, data lives here so `page.tsx` stays a thin composition.
 *
 * Per the spec: no marketing hype, no unsupported business claims, no
 * fake customer counts, no fake awards, no fake certifications, and no
 * invented people. Section 9 ("Leadership / Team") reuses `TeamCard`'s
 * `name`/`role` fields at the functional-team level (e.g. "Leadership",
 * "Engineering") rather than naming any individual — a professional
 * placeholder, not a fabricated bio.
 */

export const aboutHero = {
  eyebrow: "About RMSM",
  badge: "Enterprise trading intelligence platform",
  title: "About RMSM",
  subtitle: "Building the next generation enterprise platform for intelligent trading, investment operations, AI automation, and market intelligence.",
  primaryCta: { label: "Request Demo", href: "/contact" },
  secondaryCta: { label: "Talk to Sales", href: "/contact" },
} as const;

export const ourVision: FeatureCardProps[] = [
  { icon: Building2, title: "Enterprise Trading Technology", description: "Technology built for the operational demands of institutional trading and investment desks." },
  { icon: Sparkles, title: "AI-Powered Decision Support", description: "AI that supports, rather than replaces, human judgment across every workflow." },
  { icon: Database, title: "Data-Driven Investment Operations", description: "Operations grounded in structured, real-time data across markets and portfolios." },
  { icon: Layers, title: "Scalable Financial Infrastructure", description: "Infrastructure architected to scale across desks, teams, and institutions." },
  { icon: Lightbulb, title: "Continuous Innovation", description: "A platform that evolves continuously alongside the needs of the institutions it serves." },
];

export const ourMission: FeatureListItem[] = [
  { label: "Empower professionals", description: "Give trading and investment professionals the tools they need to work effectively." },
  { label: "Improve operational efficiency", description: "Reduce manual, repetitive operational work across the desk." },
  { label: "Deliver trustworthy AI", description: "Build AI capabilities with transparency and human oversight at the core." },
  { label: "Simplify complex workflows", description: "Turn complex, multi-step processes into a single, coherent platform." },
  { label: "Enable better investment decisions", description: "Ground every decision in structured, explainable context." },
];

export const whatRmsmStandsFor: FeatureCardProps[] = [
  { icon: Building2, title: "Enterprise-First", description: "Built from the ground up for enterprise operational, security, and governance needs." },
  { icon: Shield, title: "Security", description: "Security treated as a foundational design constraint, not an afterthought." },
  { icon: Layers, title: "Scalability", description: "Architecture designed to scale across desks, teams, and institutions." },
  { icon: ShieldCheck, title: "Reliability", description: "Consistent, dependable behavior across every platform capability." },
  { icon: Eye, title: "Transparency", description: "Clear, explainable behavior across analytics, AI, and decision support." },
  { icon: Lightbulb, title: "Innovation", description: "A continuous commitment to advancing platform capability." },
  { icon: Handshake, title: "Customer Success", description: "Success measured by the outcomes our customers achieve." },
  { icon: Bot, title: "Responsible AI", description: "AI developed with human oversight, transparency, and accountability." },
];

export const platformPhilosophy: FeatureCardProps[] = [
  { icon: Puzzle, title: "Modular Architecture", description: "Independently composable modules across every platform domain." },
  { icon: GitBranch, title: "Domain-Driven Design", description: "Domain boundaries that mirror how trading and investment organizations actually work." },
  { icon: Layers, title: "Clean Architecture", description: "Clear separation between domain logic, application logic, and infrastructure." },
  { icon: Code, title: "API-First", description: "Every capability designed as a first-class, documented API." },
  { icon: Cloud, title: "Cloud-Native", description: "Architected for modern cloud deployment patterns." },
  { icon: Radio, title: "Event-Driven Systems", description: "Asynchronous, event-driven communication across services." },
  { icon: Sparkles, title: "AI-Native Workflows", description: "AI considered a first-class part of the workflow, not a bolt-on feature." },
  { icon: Lock, title: "Security by Design", description: "Security considerations built into architecture from the start." },
  { icon: Activity, title: "High Availability", description: "Architected with resilience and availability as core requirements." },
  { icon: Wrench, title: "Maintainability", description: "Code and architecture designed to remain maintainable as the platform grows." },
];

export const capabilitiesTimeline: TimelineItemData[] = [
  { title: "Foundation", description: "Core platform foundation, architecture, and design system.", status: "done" },
  { title: "Core Platform", description: "Enterprise platform capabilities across market, portfolio, and risk domains.", status: "done" },
  { title: "AI Platform", description: "AI agents and decision intelligence layered across the platform.", status: "done" },
  { title: "Market Intelligence", description: "Multi-asset market coverage and analytics.", status: "done" },
  { title: "Workflow Automation", description: "Automation across recurring research, analysis, and operational workflows.", status: "active" },
  { title: "Enterprise Operations", description: "Enterprise governance, licensing, and deployment capabilities.", status: "active" },
  { title: "Future Innovation", description: "Continued investment in platform capability and AI innovation.", status: "upcoming" },
];

export const whyChooseRmsm: FeatureCardProps[] = [
  { icon: Layers, title: "Unified Platform", description: "One platform instead of a patchwork of disconnected tools." },
  { icon: Gauge, title: "Operational Efficiency", description: "Reduces manual, repetitive operational work." },
  { icon: Bot, title: "AI Assistance", description: "AI agents that assist research, analysis, and decision workflows." },
  { icon: ShieldAlert, title: "Risk Awareness", description: "Continuous visibility into exposure, risk, and limit conditions." },
  { icon: TrendingUp, title: "Scalable Architecture", description: "Architecture designed to scale with your organization." },
  { icon: Cpu, title: "Modern Technology", description: "Built on a modern, proven technology foundation." },
  { icon: ClipboardCheck, title: "Enterprise Governance", description: "Governance, audit, and access controls built in by design." },
  { icon: Zap, title: "Automation", description: "Automates recurring research, analysis, and operational work." },
];

export const responsibleAi: FeatureCardProps[] = [
  { icon: UserCheck, title: "Human Oversight", description: "Human review and approval built into AI-assisted workflows where required." },
  { icon: Eye, title: "Transparency", description: "AI-assisted output designed to be explainable, not a black box." },
  { icon: Shield, title: "Security", description: "AI services built on the same security foundation as the rest of the platform." },
  { icon: Lock, title: "Privacy", description: "Data handling practices designed with privacy as a core consideration." },
  { icon: ClipboardList, title: "Auditability", description: "AI-assisted decisions and actions are logged and reviewable." },
];

export interface AboutTeamGroup extends Pick<TeamCardProps, "name" | "role"> {}

export const aboutTeamGroups: AboutTeamGroup[] = [
  { name: "Leadership", role: "Setting platform strategy and long-term direction." },
  { name: "Engineering", role: "Building and operating the platform." },
  { name: "Product", role: "Shaping the platform roadmap and experience." },
  { name: "Research", role: "Advancing the platform's AI and analytics capabilities." },
  { name: "Customer Success", role: "Supporting enterprise customers throughout their journey." },
];

export interface EnterpriseValue {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const enterpriseValues: EnterpriseValue[] = [
  { icon: Scale, title: "Integrity", description: "Doing the right thing, especially when it's harder." },
  { icon: Lightbulb, title: "Innovation", description: "Continuously advancing what the platform can do." },
  { icon: Handshake, title: "Trust", description: "Earning trust through transparency and reliability." },
  { icon: Star, title: "Excellence", description: "Holding a high bar for the quality of our work." },
  { icon: Users, title: "Collaboration", description: "Working across teams and with customers toward shared outcomes." },
  { icon: BookOpen, title: "Continuous Learning", description: "Continuously improving how we build and operate the platform." },
  { icon: Target, title: "Customer Focus", description: "Grounding every decision in the outcomes our customers need." },
];

export const globalPlatformVision: FeatureCardProps[] = [
  { icon: User, title: "Professional Traders", description: "Conceptually designed to support individual and desk-level trading professionals." },
  { icon: Building2, title: "Investment Firms", description: "Conceptually designed to support investment firms across strategies and asset classes." },
  { icon: Briefcase, title: "Asset Managers", description: "Conceptually designed to support asset managers across portfolios and mandates." },
  { icon: Search, title: "Research Teams", description: "Conceptually designed to support research teams across market and company analysis." },
  { icon: Landmark, title: "Financial Institutions", description: "Conceptually designed to support banks and other financial institutions." },
];
