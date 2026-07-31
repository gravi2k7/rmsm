import type { TemplateDefinition } from "../template-definition";

export const AI_PLATFORM_TEMPLATES: TemplateDefinition[] = [
  {
    id: "ai-report-ready",
    category: "AI Platform",
    format: "html",
    subject: "Your RMSM AI report is ready",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Your report is ready</h1><p>Your <strong>{{reportName}}</strong> report has finished generating.</p><p style="margin:24px 0;">{{> button}}</p>`,
    sampleVariables: { reportName: "Q3 Market Outlook", actionUrl: "https://app.rmsm.ai/reports/123", actionLabel: "View Report" },
  },
  {
    id: "strategy-report",
    category: "AI Platform",
    format: "html",
    subject: "Strategy report: {{strategyName}}",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Strategy report</h1><p>Your <strong>{{strategyName}}</strong> strategy report is ready. Performance: {{performanceSummary}}.</p><p style="margin:24px 0;">{{> button}}</p>`,
    sampleVariables: { strategyName: "Momentum Alpha", performanceSummary: "+4.2% this period", actionUrl: "https://app.rmsm.ai/strategies/123", actionLabel: "View Strategy" },
  },
  {
    id: "backtest-completed",
    category: "AI Platform",
    format: "html",
    subject: "Backtest completed: {{backtestName}}",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Backtest completed</h1><p>Your backtest <strong>{{backtestName}}</strong> has completed. {{#if resultSummary}}Result: {{resultSummary}}.{{/if}}</p><p style="margin:24px 0;">{{> button}}</p>`,
    sampleVariables: { backtestName: "EMA Crossover 2020-2026", resultSummary: "Sharpe 1.8", actionUrl: "https://app.rmsm.ai/backtests/123", actionLabel: "View Results" },
  },
];
