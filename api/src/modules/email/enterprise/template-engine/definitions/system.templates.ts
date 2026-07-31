import type { TemplateDefinition } from "../template-definition";

export const SYSTEM_TEMPLATES: TemplateDefinition[] = [
  {
    id: "maintenance",
    category: "System",
    format: "html",
    subject: "Scheduled maintenance — {{maintenanceDate}}",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Scheduled maintenance</h1><p>RMSM will undergo scheduled maintenance on {{maintenanceDate}} from {{startTime}} to {{endTime}}.</p>`,
    sampleVariables: { maintenanceDate: "2026-08-02", startTime: "02:00 UTC", endTime: "04:00 UTC" },
  },
  {
    id: "downtime",
    category: "System",
    format: "html",
    subject: "Service disruption notice",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Service disruption</h1><p>We're currently experiencing an issue affecting {{affectedService}}. {{#if statusUrl}}Follow updates at our status page.{{/if}}</p>`,
    sampleVariables: { affectedService: "Order execution", statusUrl: "https://status.rmsm.ai" },
  },
  {
    id: "general-notification",
    category: "System",
    format: "html",
    subject: "{{subject}}",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">{{title}}</h1><p>{{message}}</p>`,
    sampleVariables: { subject: "Platform update", title: "Platform update", message: "We've made improvements to the RMSM platform." },
  },
];
