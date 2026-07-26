import {
  Activity,
  AlertTriangle,
  BarChart3,
  BellRing,
  Bitcoin,
  Briefcase,
  Brain,
  Building2,
  CalendarClock,
  ClipboardCheck,
  Cpu,
  Database,
  Droplet,
  Eye,
  FileText,
  Gauge,
  GitBranch,
  GitCompare,
  Globe,
  Landmark,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Lightbulb,
  LineChart,
  Package,
  PieChart,
  Radar,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Shuffle,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FeatureCardProps } from "@/components/public/features";
import type { AIWorkflowStep } from "@/components/public/ai";

/**
 * WM-007R Enterprise Markets Page copy/data. Same pattern as WM-004R/005R/
 * 006R's `content.ts` — page composes existing design-system components,
 * data lives here so `page.tsx` stays a thin composition.
 */

export const marketsHero = {
  eyebrow: "Enterprise Markets",
  badge: "Multi-asset market intelligence",
  title: "Enterprise Markets",
  subtitle: "Unified intelligence across global financial markets with enterprise-grade analytics, AI, and decision support.",
  primaryCta: { label: "Explore Markets", href: "#markets" },
  secondaryCta: { label: "Request Enterprise Demo", href: "/contact" },
} as const;

export const marketsOverview: FeatureCardProps[] = [
  { icon: BarChart3, title: "Equities", description: "Coverage across listed equities and equity-related instruments." },
  { icon: CalendarClock, title: "Futures", description: "Coverage across exchange-listed futures contracts." },
  { icon: GitBranch, title: "Options", description: "Coverage across listed options and derivative instruments." },
  { icon: Globe, title: "Forex", description: "Coverage across major and cross-currency pairs." },
  { icon: Package, title: "Commodities", description: "Coverage across physical and financial commodity markets." },
  { icon: Landmark, title: "Fixed Income", description: "Coverage across government and corporate fixed income instruments." },
  { icon: Layers, title: "ETFs", description: "Coverage across exchange-traded funds spanning asset classes and sectors." },
  { icon: Bitcoin, title: "Cryptocurrency", description: "Coverage across major digital asset markets." },
  { icon: LineChart, title: "Indices", description: "Coverage across major global and regional market indices." },
];

export const marketIntelligence: FeatureCardProps[] = [
  { icon: Eye, title: "Market Monitoring", description: "Continuous monitoring of market conditions across covered instruments." },
  { icon: TrendingUp, title: "Trend Analysis", description: "Identification and analysis of directional market trends." },
  { icon: Activity, title: "Volatility Analysis", description: "Analysis of realized and implied volatility across markets." },
  { icon: Droplet, title: "Liquidity Insights", description: "Insight into liquidity conditions across instruments and venues." },
  { icon: Shuffle, title: "Cross-Asset Analysis", description: "Analysis of relationships and dynamics across asset classes." },
  { icon: Gauge, title: "Relative Strength", description: "Comparative strength analysis across instruments and markets." },
  { icon: GitCompare, title: "Correlation Analysis", description: "Analysis of correlation and co-movement across instruments." },
  { icon: Radar, title: "Market Regime Detection", description: "Detection of shifting market regimes and conditions." },
];

export interface AssetClassCoverage {
  icon: LucideIcon;
  name: string;
  overview: string;
  analytics: string;
  decisionSupport: string;
  aiCapabilities: string;
}

export const assetClassCoverage: AssetClassCoverage[] = [
  {
    icon: BarChart3,
    name: "Equities",
    overview: "Coverage across listed equities and equity-related instruments.",
    analytics: "Price, volume, and fundamentals-driven analytics.",
    decisionSupport: "Structured decision support grounded in live equity context.",
    aiCapabilities: "AI-assisted research synthesis and signal review.",
  },
  {
    icon: CalendarClock,
    name: "Futures",
    overview: "Coverage across exchange-listed futures contracts.",
    analytics: "Term structure, curve, and roll analytics.",
    decisionSupport: "Structured decision support for futures positioning.",
    aiCapabilities: "AI-assisted trend and regime analysis.",
  },
  {
    icon: GitBranch,
    name: "Options",
    overview: "Coverage across listed options and derivative instruments.",
    analytics: "Volatility surface and greeks-based analytics.",
    decisionSupport: "Structured decision support for options strategies.",
    aiCapabilities: "AI-assisted volatility and risk analysis.",
  },
  {
    icon: Globe,
    name: "Forex",
    overview: "Coverage across major and cross-currency pairs.",
    analytics: "Rate, carry, and cross-pair analytics.",
    decisionSupport: "Structured decision support for FX exposure.",
    aiCapabilities: "AI-assisted macro and correlation analysis.",
  },
  {
    icon: Package,
    name: "Commodities",
    overview: "Coverage across physical and financial commodity markets.",
    analytics: "Supply/demand and seasonal analytics.",
    decisionSupport: "Structured decision support for commodity exposure.",
    aiCapabilities: "AI-assisted trend and news-driven analysis.",
  },
  {
    icon: Landmark,
    name: "Fixed Income",
    overview: "Coverage across government and corporate fixed income instruments.",
    analytics: "Yield curve and duration-based analytics.",
    decisionSupport: "Structured decision support for fixed income allocation.",
    aiCapabilities: "AI-assisted credit and rate-sensitivity analysis.",
  },
];

export const tradingWorkflowSteps: AIWorkflowStep[] = [
  { label: "Research", icon: Search },
  { label: "Signal Generation", icon: Zap },
  { label: "Risk Assessment", icon: ShieldCheck },
  { label: "Portfolio Analysis", icon: Gauge },
  { label: "Execution", icon: Send },
  { label: "Monitoring", icon: Eye },
  { label: "Reporting", icon: FileText },
];

export const enterpriseAnalytics: FeatureCardProps[] = [
  { icon: Gauge, title: "Portfolio Analytics", description: "Real-time portfolio state, exposure, and performance analytics." },
  { icon: PieChart, title: "Performance Attribution", description: "Attribution of performance across positions, sectors, and factors." },
  { icon: ShieldCheck, title: "Risk Metrics", description: "Core risk metrics computed across the portfolio." },
  { icon: AlertTriangle, title: "Exposure Analysis", description: "Analysis of exposure concentration across instruments and sectors." },
  { icon: GitBranch, title: "Scenario Analysis", description: "Modeling of portfolio outcomes under defined market scenarios." },
  { icon: Layers, title: "Factor Analysis", description: "Decomposition of portfolio risk and return across common factors." },
  { icon: BarChart3, title: "Market Breadth", description: "Analysis of participation and breadth across covered markets." },
  { icon: LayoutGrid, title: "Heatmaps", description: "Visual heatmap views across instruments, sectors, and regions." },
];

export interface MarketDataLayer {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const marketDataLayers: MarketDataLayer[] = [
  { icon: Database, title: "External Market Data", description: "Market data ingested from connected external sources." },
  { icon: RefreshCw, title: "Normalization", description: "Normalization of incoming data into a consistent internal model." },
  { icon: Cpu, title: "Analytics Engine", description: "Computation of analytics and metrics across normalized market data." },
  { icon: Sparkles, title: "AI Intelligence", description: "AI-assisted analysis layered on top of computed analytics." },
  { icon: Brain, title: "Decision Engine", description: "Structured, explainable decision support grounded in analytics and AI output." },
  { icon: Briefcase, title: "Portfolio", description: "Decision support surfaced in the context of the live portfolio." },
];

export const enterpriseRisk: FeatureCardProps[] = [
  { icon: TrendingDown, title: "Market Risk", description: "Monitoring of risk arising from market price movements." },
  { icon: ShieldAlert, title: "Portfolio Risk", description: "Aggregate risk monitoring across the entire portfolio." },
  { icon: Eye, title: "Exposure Monitoring", description: "Continuous monitoring of exposure across positions and limits." },
  { icon: Activity, title: "Stress Testing", description: "Modeling of portfolio impact under defined stress scenarios." },
  { icon: TrendingDown, title: "Drawdown Analysis", description: "Analysis of drawdown magnitude and duration over time." },
  { icon: BellRing, title: "Risk Alerts", description: "Configurable alerting on risk, exposure, and limit conditions." },
  { icon: ClipboardCheck, title: "Compliance Monitoring", description: "Monitoring designed to support internal compliance workflows." },
];

export const globalCoverage: FeatureCardProps[] = [
  { icon: Globe, title: "North America", description: "Modular support for North American markets." },
  { icon: Globe, title: "Europe", description: "Modular support for European markets." },
  { icon: Globe, title: "Asia-Pacific", description: "Modular support for Asia-Pacific markets." },
  { icon: Globe, title: "Middle East", description: "Modular support for Middle Eastern markets." },
  { icon: Globe, title: "Latin America", description: "Modular support for Latin American markets." },
  { icon: Globe, title: "Africa", description: "Modular support for African markets." },
];

export const marketsBenefits: FeatureCardProps[] = [
  { icon: Lightbulb, title: "Better Decisions", description: "Context-grounded analytics and AI support better-informed decisions." },
  { icon: LayoutDashboard, title: "Unified Analytics", description: "One platform instead of a patchwork of market-specific tools." },
  { icon: Eye, title: "Cross-Market Visibility", description: "Visibility across asset classes and markets in a single view." },
  { icon: Building2, title: "Institutional Scalability", description: "Architecture designed to scale across desks and institutions." },
  { icon: Zap, title: "AI-Assisted Workflows", description: "AI-assisted support across research, analysis, and monitoring workflows." },
  { icon: Gauge, title: "Operational Efficiency", description: "Reduces manual, repetitive market-monitoring work." },
];
