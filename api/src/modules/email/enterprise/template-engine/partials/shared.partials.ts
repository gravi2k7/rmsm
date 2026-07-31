/**
 * EM-001's own "Shared Components" requirement — reusable fragments any
 * template's body can pull in via `{{> button}}` / `{{> footer}}`
 * without duplicating the markup. Registered by name in
 * `TemplateRenderer`'s call into `TemplateEngine`, not by file path.
 */
export const BUTTON_PARTIAL = `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:6px;background-color:#2563eb;"><a href="{{actionUrl}}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:bold;">{{actionLabel}}</a></td></tr></table>`;

export const FOOTER_PARTIAL = `<p style="margin:0;">You're receiving this email because you have an RMSM account.</p><p style="margin:8px 0 0;">&copy; {{year}} RMSM. All rights reserved.</p>`;

export const SHARED_PARTIALS: Record<string, string> = {
  button: BUTTON_PARTIAL,
  footer: FOOTER_PARTIAL,
};
