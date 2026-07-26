import {
  Activity,
  BadgeCheck,
  BookOpen,
  Bot,
  Brain,
  Briefcase,
  ClipboardList,
  Database,
  FileSearch,
  FileText,
  GitBranch,
  Gauge,
  Languages,
  Layers,
  Lock,
  Newspaper,
  Radar,
  Radio,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Zap,
  Workflow as WorkflowIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AIFeatureCardProps } from "@/components/public/ai";
import type { FeatureCardProps } from "@/components/public/features";
import type { ProductCardProps } from "@/components/public/cards";
import type { IntegrationCardProps } from "@/components/public/cards/integration-card";
import type { AIWorkflowStep } from "@/components/public/ai";

/**
 * WM-006R Enterprise AI Solutions Page copy/data. Same pattern as WM-004R's
 * and WM-005R's `content.ts` — page composes existing design-system
 * components (including the AI-specific `ai/` library), data lives here so
 * `page.tsx` stays a thin composition.
 */

export const aiHero = {
  eyebrow: "Enterprise AI",
  badge: "AI-powered decision intelligence",
  title: "Enterprise AI Platform",
  subtitle: "An AI-powered decision intelligence platform built for institutional trading and investment teams.",
  description:
    "RMSM applies AI agents, retrieval, and orchestration across market, portfolio, risk, and research workflows — architected with the governance, auditability, and security enterprise financial institutions require.",
  primaryCta: { label: "Request AI Demo", href: "/contact" },
  secondaryCta: { label: "Explore AI Architecture", href: "#architecture" },
} as const;

export const aiPlatformOverview: AIFeatureCardProps[] = [
  { icon: Bot, title: "AI Agents", description: "Autonomous and human-in-the-loop agents that assist research, analysis, and decision workflows." },
  { icon: RefreshCw, title: "Trading Intelligence", description: "AI-assisted signal generation and strategy support across every connected venue." },
  { icon: Radar, title: "Market Intelligence", description: "Continuous AI-driven analysis of market data, news, and conditions." },
  { icon: Gauge, title: "Portfolio Intelligence", description: "AI-assisted portfolio analytics, exposure, and performance insight." },
  { icon: ShieldCheck, title: "Risk Intelligence", description: "AI-assisted monitoring of exposure, margin, and limit conditions." },
  { icon: Search, title: "Research Intelligence", description: "AI-assisted research synthesis across market, company, and macro data." },
  { icon: Briefcase, title: "Executive Intelligence", description: "AI-assisted summaries and insight for executive and desk-level oversight." },
  { icon: WorkflowIcon, title: "Workflow Automation", description: "AI-assisted automation for recurring analysis, monitoring, and reporting tasks." },
];

export const aiCapabilityMatrix: FeatureCardProps[] = [
  { icon: Briefcase, title: "Decision Intelligence", description: "Structured, explainable decision support grounded in live context." },
  { icon: Activity, title: "Prediction", description: "Forecasting and scoring support across market and portfolio signals." },
  { icon: FileText, title: "Summarization", description: "Condenses long-form research, filings, and reports into structured summaries." },
  { icon: Languages, title: "Translation", description: "Cross-language understanding for global market and research content." },
  { icon: FileSearch, title: "Document Intelligence", description: "Extraction and structuring of information from enterprise documents." },
  { icon: Search, title: "Research", description: "AI-assisted synthesis across market, company, and macro research." },
  { icon: BookOpen, title: "Knowledge Management", description: "Organizes and surfaces enterprise knowledge for reuse across teams." },
  { icon: Brain, title: "Reasoning", description: "Multi-step reasoning over structured and unstructured enterprise data." },
  { icon: ClipboardList, title: "Planning", description: "Task and workflow planning support for research and operations." },
  { icon: Zap, title: "Automation", description: "Automates recurring analysis, monitoring, and reporting workflows." },
];

export const aiAgentPlatform: ProductCardProps[] = [
  { icon: Bot, name: "Trading Copilot", description: "Assists trading desks with signal review, context, and workflow support.", status: "Agent" },
  { icon: Search, name: "Research Agent", description: "Synthesizes research across market, company, and macro sources.", status: "Agent" },
  { icon: Radar, name: "Market Analyst", description: "Continuous AI-assisted analysis of market data and conditions.", status: "Agent" },
  { icon: Gauge, name: "Portfolio Assistant", description: "AI-assisted portfolio analytics, exposure, and performance insight.", status: "Agent" },
  { icon: ShieldCheck, name: "Risk Assistant", description: "AI-assisted monitoring of exposure, margin, and limit conditions.", status: "Agent" },
  { icon: Briefcase, name: "Executive Assistant", description: "AI-assisted summaries and insight for executive oversight.", status: "Agent" },
  { icon: Settings, name: "Operations Agent", description: "AI-assisted automation for recurring operational workflows.", status: "Agent" },
];

export interface AIArchitectureLayer {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const aiArchitectureLayers: AIArchitectureLayer[] = [
  { icon: Layers, title: "Presentation", description: "Web and admin applications — the enterprise UI layer trading desks interact with directly." },
  { icon: Bot, title: "AI Copilot", description: "The conversational and assistive layer surfacing AI capability directly inside the platform UI." },
  { icon: GitBranch, title: "AI Orchestration", description: "Coordinates agent planning, tool use, and execution across AI services." },
  { icon: Sparkles, title: "AI Services", description: "Model inference, scoring, and generation services underlying every AI capability." },
  { icon: Brain, title: "AI Memory", description: "Session, conversation, and long-term memory supporting contextual AI behavior." },
  { icon: BookOpen, title: "Knowledge Base", description: "Enterprise knowledge, documents, and reference data available to AI services." },
  { icon: Database, title: "Enterprise Data Sources", description: "Market, portfolio, risk, and operational data underpinning every AI service." },
];

export const aiIntelligenceModules: FeatureCardProps[] = [
  { icon: Radar, title: "AI Market Intelligence", description: "AI-driven analysis of market data, conditions, and trends." },
  { icon: RefreshCw, title: "AI Trading Intelligence", description: "AI-assisted signal generation and strategy support." },
  { icon: Gauge, title: "AI Portfolio Intelligence", description: "AI-assisted portfolio analytics and performance insight." },
  { icon: ShieldCheck, title: "AI Risk Intelligence", description: "AI-assisted exposure, margin, and limit monitoring." },
  { icon: Radio, title: "AI Signal Intelligence", description: "AI-assisted evaluation and prioritization of trading signals." },
  { icon: Newspaper, title: "AI News Intelligence", description: "AI-assisted analysis of news and market-moving events." },
  { icon: WorkflowIcon, title: "AI Strategy Intelligence", description: "AI-assisted strategy composition and evaluation support." },
  { icon: Briefcase, title: "AI Executive Dashboard", description: "AI-assisted summaries and insight for executive-level oversight." },
];

export const aiWorkflowSteps: AIWorkflowStep[] = [
  { label: "Planning", icon: ClipboardList },
  { label: "Execution", icon: Zap },
  { label: "Human Approval", icon: UserCheck },
  { label: "Automation", icon: RefreshCw },
  { label: "Audit", icon: FileSearch },
];

export const ragKnowledgeSteps: AIWorkflowStep[] = [
  { label: "Document Ingestion", icon: FileText },
  { label: "Embeddings", icon: Brain },
  { label: "Vector Search", icon: Search },
  { label: "Retrieval", icon: Database },
  { label: "Enterprise Knowledge Base", icon: BookOpen },
];

export const aiSecurityGovernance: FeatureCardProps[] = [
  { icon: Lock, title: "RBAC", description: "Granular role-based access control across every AI capability." },
  { icon: UserCheck, title: "Human-in-the-loop", description: "Human review and approval built into AI-assisted workflows where required." },
  { icon: ClipboardList, title: "Audit Logging", description: "Every AI-assisted decision and action is logged and reviewable." },
  { icon: Activity, title: "Observability", description: "Structured logging, metrics, and tracing across every AI service." },
  { icon: ShieldCheck, title: "Prompt Governance", description: "Governance controls over prompts and AI-assisted workflows." },
  { icon: BadgeCheck, title: "Model Governance", description: "Governance and oversight across the models used by the platform." },
  { icon: Shield, title: "Enterprise Security", description: "Enterprise-grade security controls applied consistently across AI services." },
];

export const aiTechnologyStack: IntegrationCardProps[] = [
  { name: "OpenAI", description: "Large language model provider" },
  { name: "Claude", description: "Large language model provider" },
  { name: "Gemini", description: "Large language model provider" },
  { name: "Ollama", description: "Local/self-hosted model runtime" },
  { name: "LangChain", description: "LLM orchestration framework" },
  { name: "Vector Database", description: "Embedding storage and retrieval" },
  { name: "Prisma", description: "Type-safe data access" },
  { name: "PostgreSQL", description: "Primary data store" },
  { name: "Redis", description: "Caching and messaging" },
  { name: "NestJS", description: "API application framework" },
  { name: "Next.js", description: "Web application framework" },
  { name: "Docker", description: "Containerized deployment" },
  { name: "TurboRepo", description: "Monorepo build orchestration" },
];

export const aiBusinessBenefits: FeatureCardProps[] = [
  { icon: Zap, title: "Automation", description: "Automates recurring research, analysis, and monitoring work." },
  { icon: Activity, title: "Faster Decision Making", description: "Context-grounded AI support accelerates every step of the decision workflow." },
  { icon: Gauge, title: "Operational Efficiency", description: "AI-assisted workflows reduce manual, repetitive operational work." },
  { icon: ShieldCheck, title: "Reduced Risk", description: "Continuous AI-assisted monitoring supports earlier risk detection." },
  { icon: Briefcase, title: "Higher Productivity", description: "AI agents free up analyst and desk time for higher-value work." },
];
