import type { TemplateDefinition } from "../template-definition";

export const PORTFOLIO_TEMPLATES: TemplateDefinition[] = [
  {
    id: "daily-summary",
    category: "Portfolio",
    format: "html",
    subject: "Your daily portfolio summary — {{date}}",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Daily summary</h1><p>Portfolio value: {{portfolioValue}} ({{dayChange}} today).</p>`,
    sampleVariables: { date: "2026-07-31", portfolioValue: "$102,450.00", dayChange: "+0.8%" },
  },
  {
    id: "weekly-summary",
    category: "Portfolio",
    format: "html",
    subject: "Your weekly portfolio summary — week of {{weekOf}}",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Weekly summary</h1><p>Portfolio value: {{portfolioValue}} ({{weekChange}} this week).</p>`,
    sampleVariables: { weekOf: "2026-07-27", portfolioValue: "$102,450.00", weekChange: "+2.1%" },
  },
  {
    id: "monthly-summary",
    category: "Portfolio",
    format: "html",
    subject: "Your monthly portfolio summary — {{month}}",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Monthly summary</h1><p>Portfolio value: {{portfolioValue}} ({{monthChange}} this month).</p>`,
    sampleVariables: { month: "July 2026", portfolioValue: "$102,450.00", monthChange: "+5.4%" },
  },
];
