import type { TemplateDefinition } from "../template-definition";

export const BILLING_TEMPLATES: TemplateDefinition[] = [
  {
    id: "subscription-created",
    category: "Billing",
    format: "html",
    subject: "Your RMSM {{planName}} subscription is active",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Subscription active</h1><p>Your <strong>{{planName}}</strong> subscription is now active, billed {{billingInterval}} at {{amount}}.</p>`,
    sampleVariables: { planName: "Professional", billingInterval: "monthly", amount: "$99.00" },
  },
  {
    id: "subscription-renewed",
    category: "Billing",
    format: "html",
    subject: "Your RMSM {{planName}} subscription was renewed",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Subscription renewed</h1><p>Your <strong>{{planName}}</strong> subscription renewed on {{renewedAt}} for {{amount}}. Next renewal: {{nextRenewalAt}}.</p>`,
    sampleVariables: { planName: "Professional", renewedAt: "2026-07-31", amount: "$99.00", nextRenewalAt: "2026-08-31" },
  },
  {
    id: "payment-failed",
    category: "Billing",
    format: "html",
    subject: "Payment failed for your RMSM subscription",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Payment failed</h1><p>We were unable to process your payment of {{amount}} for your <strong>{{planName}}</strong> subscription.</p><p style="margin:24px 0;">{{> button}}</p>`,
    sampleVariables: { amount: "$99.00", planName: "Professional", actionUrl: "https://app.rmsm.ai/billing", actionLabel: "Update Payment Method" },
  },
  {
    id: "invoice-ready",
    category: "Billing",
    format: "html",
    subject: "Your RMSM invoice {{invoiceNumber}} is ready",
    body: `<h1 style="margin:0 0 16px;font-size:20px;">Invoice ready</h1><p>Invoice <strong>{{invoiceNumber}}</strong> for {{amount}} is ready.</p><p style="margin:24px 0;">{{> button}}</p>`,
    sampleVariables: { invoiceNumber: "INV-2026-0731", amount: "$99.00", actionUrl: "https://app.rmsm.ai/billing/invoices/INV-2026-0731", actionLabel: "View Invoice" },
  },
];
