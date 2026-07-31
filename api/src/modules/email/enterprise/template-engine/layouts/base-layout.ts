/**
 * EM-001's own "Shared Layouts" requirement — every rendered template
 * body is wrapped in this one layout so RMSM's emails share a consistent
 * header/footer/typography regardless of which of the 26 templates
 * produced the body. `{{content}}` is substituted by `TemplateRenderer`
 * after the template's own body has already been rendered — i.e. this
 * layout is applied OUTSIDE `TemplateEngine.render()`, not as a nested
 * template pass.
 */
export const BASE_LAYOUT = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>{{subject}}</title></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:24px 32px;background-color:#0f172a;">
          <span style="color:#ffffff;font-size:20px;font-weight:bold;">RMSM</span>
        </td></tr>
        <tr><td style="padding:32px;">
          {{content}}
        </td></tr>
        <tr><td style="padding:24px 32px;background-color:#f9fafb;font-size:12px;color:#6b7280;">
          {{footer}}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
