import {
  Activity,
  BadgeCheck,
  Bot,
  ClipboardList,
  Cloud,
  CloudCog,
  Code,
  Database,
  Eye,
  Gauge,
  GitBranch,
  Globe,
  KeyRound,
  Layers,
  Lightbulb,
  Link2,
  Lock,
  Radar,
  Radio,
  RefreshCw,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Target,
  Terminal,
  TrendingUp,
  Users,
  Zap,
  Workflow as WorkflowIcon,
} from "lucide-react";
import type { FeatureCardProps } from "@/components/public/features";
import type { ProductCardProps } from "@/components/public/cards";
import type { IntegrationCardProps } from "@/components/public/cards/integration-card";
import type { LucideIcon } from "lucide-react";

/**
 * WM-005R Enterprise Platform Page copy/data. Same pattern as WM-004R's
 * `content.ts` — page composes existing design-system components, data
 * lives here so `page.tsx` stays a thin composition.
 */

export const platformHero = {
  eyebrow: "Enterprise Platform",
  badge: "Institutional-grade enterprise architecture",
  title: "Enterprise Trading Intelligence Platform",
  subtitle: "An integrated, AI-powered investment and trading platform built for institutional scale.",
  description:
    "RMSM unifies market intelligence, strategy, portfolio, risk, and execution into a single modular platform — architected for the operational, security, and compliance requirements of enterprise trading desks, hedge funds, and financial institutions.",
  primaryCta: { label: "Request Enterprise Demo", href: "/contact" },
  secondaryCta: { label: "View Architecture", href: "#architecture" },
} as const;

export const platformOverviewDomains: FeatureCardProps[] = [
  { icon: Radar, title: "Market Intelligence", description: "Real-time market data, scanning, and analytics across every connected venue and asset class." },
  { icon: WorkflowIcon, title: "Strategy Intelligence", description: "Rules-based and AI-assisted strategy composition, backtesting, and deployment." },
  { icon: Bot, title: "AI Agents", description: "Autonomous and human-in-the-loop AI agents for research, analysis, and decision support." },
  { icon: TrendingUp, title: "Portfolio Intelligence", description: "Real-time portfolio state, exposure, performance, and allocation analytics." },
  { icon: ShieldCheck, title: "Risk Intelligence", description: "Continuous exposure, margin, and limit monitoring across every position and order." },
  { icon: Zap, title: "Execution", description: "Order routing and execution management with full audit trails from signal to fill." },
  { icon: Eye, title: "Decision Engine", description: "Structured, explainable decision support grounded in live market and portfolio context." },
  { icon: RefreshCw, title: "Workflow Automation", description: "Configurable automation for recurring analysis, alerts, and operational workflows." },
];

export interface ArchitectureLayer {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const architectureLayers: ArchitectureLayer[] = [
  { icon: Layers, title: "Presentation", description: "Web and admin applications — the enterprise UI layer trading desks and operators interact with directly." },
  { icon: Code, title: "Application", description: "Application services, orchestration, and API composition across every platform domain." },
  { icon: Sparkles, title: "AI Services", description: "AI agents, signal generation, research, and decision-support services built on the domain layer." },
  { icon: GitBranch, title: "Domain Services", description: "Market, portfolio, strategy, risk, execution, and decision domain logic, modeled with DDD and CQRS." },
  { icon: Server, title: "Infrastructure", description: "Messaging, caching, observability, and cross-cutting platform infrastructure." },
  { icon: Database, title: "Data Layer", description: "PostgreSQL, Redis, and durable storage underpinning every domain service." },
];

export const platformDomains: ProductCardProps[] = [
  { icon: TrendingUp, name: "Market", description: "Real-time market data, instruments, and coverage across every connected venue.", status: "Domain" },
  { icon: Gauge, name: "Portfolio", description: "Positions, exposure, cash, and performance across every account.", status: "Domain" },
  { icon: WorkflowIcon, name: "Strategy", description: "Strategy composition, backtesting, and deployment.", status: "Domain" },
  { icon: Shield, name: "Risk", description: "Exposure, margin, and limit monitoring enforced automatically.", status: "Domain" },
  { icon: Zap, name: "Execution", description: "Order routing, execution management, and audit trails.", status: "Domain" },
  { icon: Target, name: "Opportunity", description: "Opportunity scoring and prioritization across markets and strategies.", status: "Domain" },
  { icon: Eye, name: "Decision", description: "Explainable, structured decision support grounded in live context.", status: "Domain" },
  { icon: Sparkles, name: "AI Platform", description: "The AI agents, memory, and orchestration layer underpinning every domain.", status: "Domain" },
  { icon: Settings, name: "Administration", description: "Tenant, user, role, and platform configuration management.", status: "Domain" },
];

export const enterpriseFeatures: FeatureCardProps[] = [
  { icon: Users, title: "Multi-Tenant", description: "Organization-scoped data and configuration across every domain, by design." },
  { icon: Lock, title: "RBAC", description: "Granular role-based access control scoped to desks, teams, and individual roles." },
  { icon: KeyRound, title: "SSO Ready", description: "Enterprise identity integration for centralized authentication." },
  { icon: Terminal, title: "API First", description: "Every capability is available as a first-class, documented API." },
  { icon: GitBranch, title: "CQRS", description: "Command/query separation across domain services for clarity and scale." },
  { icon: Layers, title: "DDD", description: "Domain-driven design boundaries across market, portfolio, strategy, risk, and execution." },
  { icon: Radio, title: "Event Driven", description: "Asynchronous, event-driven communication between domain and AI services." },
  { icon: Activity, title: "Observability", description: "Structured logging, metrics, and tracing across every service." },
  { icon: ClipboardList, title: "Audit Logging", description: "Every decision, order, and configuration change is logged and reviewable." },
  { icon: WorkflowIcon, title: "Workflow Engine", description: "Configurable workflows for recurring operational and compliance processes." },
];

export const technologyStack: IntegrationCardProps[] = [
  { name: "Next.js", description: "Web application framework" },
  { name: "NestJS", description: "API application framework" },
  { name: "TypeScript", description: "End-to-end type safety" },
  { name: "Prisma", description: "Type-safe data access" },
  { name: "PostgreSQL", description: "Primary data store" },
  { name: "Redis", description: "Caching and messaging" },
  { name: "Docker", description: "Containerized deployment" },
  { name: "TurboRepo", description: "Monorepo build orchestration" },
];

export const deploymentModels: FeatureCardProps[] = [
  { icon: Cloud, title: "Cloud", description: "Fully managed deployment on your cloud provider of choice." },
  { icon: CloudCog, title: "Private Cloud", description: "Dedicated cloud infrastructure isolated to your organization." },
  { icon: Server, title: "On-Premises", description: "Deployed entirely within your own data center infrastructure." },
  { icon: Shuffle, title: "Hybrid", description: "A mix of cloud and on-premises components to fit existing infrastructure." },
];

export const securityCompliance: FeatureCardProps[] = [
  { icon: Lock, title: "Encryption", description: "Data encrypted at rest and in transit across every service." },
  { icon: ShieldCheck, title: "RBAC", description: "Role-based access enforced across every domain and API." },
  { icon: ClipboardList, title: "Audit Trails", description: "Full, reviewable audit trails across decisions, orders, and configuration changes." },
  { icon: KeyRound, title: "Secrets Management", description: "Centralized, access-controlled management of credentials and keys." },
  { icon: BadgeCheck, title: "Compliance Ready", description: "Architected to support institutional compliance and regulatory requirements." },
];

export const integrationCapabilities: FeatureCardProps[] = [
  { icon: Terminal, title: "APIs", description: "First-class, documented APIs across every platform domain." },
  { icon: Radio, title: "Event Bus", description: "Asynchronous integration via a platform-wide event bus." },
  { icon: Globe, title: "External Data Providers", description: "Integrations with external market and reference data providers." },
  { icon: Link2, title: "Broker Integrations", description: "Connectivity to brokerage and execution venues." },
  { icon: Database, title: "Market Data", description: "Real-time and historical market data across every connected venue." },
];

export const enterpriseBenefits: FeatureCardProps[] = [
  { icon: Gauge, title: "Operational Efficiency", description: "A unified platform replaces the disconnected tools most enterprise desks stitch together today." },
  { icon: Bot, title: "AI Automation", description: "AI agents automate recurring research, analysis, and monitoring work." },
  { icon: ShieldCheck, title: "Risk Reduction", description: "Continuous, automated risk and exposure monitoring across the entire portfolio." },
  { icon: Lightbulb, title: "Decision Support", description: "Explainable, context-grounded decision support at every step of the workflow." },
];
