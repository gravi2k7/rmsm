import { emailBrand } from "./email-brand";

export interface EmailLayoutOptions {
  preheader?: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  content: string;
  cta?: {
    label: string;
    url: string;
  };
  notice?: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function emailButton(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td
          style="
            border-radius:10px;
            background:#111827;
          "
        >
          <a
            href="${escapeHtml(url)}"
            style="
              display:inline-block;
              padding:14px 24px;
              font-family:Arial,Helvetica,sans-serif;
              font-size:15px;
              font-weight:700;
              line-height:20px;
              color:#ffffff;
              text-decoration:none;
              border-radius:10px;
            "
          >
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  `;
}

export function emailLayout(options: EmailLayoutOptions): string {
  const preheader = options.preheader
    ? escapeHtml(options.preheader)
    : "";

  const eyebrow = options.eyebrow
    ? `
      <p
        style="
          margin:0 0 10px;
          font-family:Arial,Helvetica,sans-serif;
          font-size:12px;
          line-height:18px;
          font-weight:700;
          letter-spacing:1.4px;
          text-transform:uppercase;
          color:#6b7280;
        "
      >
        ${escapeHtml(options.eyebrow)}
      </p>
    `
    : "";

  const intro = options.intro
    ? `
      <p
        style="
          margin:0 0 24px;
          font-family:Arial,Helvetica,sans-serif;
          font-size:16px;
          line-height:26px;
          color:#4b5563;
        "
      >
        ${escapeHtml(options.intro)}
      </p>
    `
    : "";

  const cta = options.cta
    ? `
      <div style="margin:30px 0;">
        ${emailButton(options.cta.label, options.cta.url)}
      </div>

      <p
        style="
          margin:0 0 26px;
          font-family:Arial,Helvetica,sans-serif;
          font-size:13px;
          line-height:21px;
          color:#6b7280;
          word-break:break-all;
        "
      >
        If the button does not work, copy and paste this link into your
        browser:<br />
        <a
          href="${escapeHtml(options.cta.url)}"
          style="color:#374151;text-decoration:underline;"
        >
          ${escapeHtml(options.cta.url)}
        </a>
      </p>
    `
    : "";

  const notice = options.notice
    ? `
      <table
        role="presentation"
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
        style="margin-top:28px;"
      >
        <tr>
          <td
            style="
              padding:16px 18px;
              border:1px solid #e5e7eb;
              border-radius:10px;
              background:#f9fafb;
            "
          >
            <p
              style="
                margin:0;
                font-family:Arial,Helvetica,sans-serif;
                font-size:13px;
                line-height:21px;
                color:#6b7280;
              "
            >
              ${options.notice}
            </p>
          </td>
        </tr>
      </table>
    `
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(options.title)}</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f3f4f6;
    -webkit-text-size-adjust:100%;
    -ms-text-size-adjust:100%;
  "
>
  ${
    preheader
      ? `
      <div
        style="
          display:none;
          max-height:0;
          overflow:hidden;
          opacity:0;
          color:transparent;
        "
      >
        ${preheader}
      </div>
      `
      : ""
  }

  <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background:#f3f4f6;"
  >
    <tr>
      <td align="center" style="padding:40px 16px;">

        <table
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width:620px;
            background:#ffffff;
            border:1px solid #e5e7eb;
            border-radius:16px;
          "
        >

          <!-- HEADER -->
          <tr>
            <td
              style="
                padding:28px 32px;
                border-bottom:1px solid #f0f1f3;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
              >
                <tr>
                  <td>
                    <div
                      style="
                        font-family:Arial,Helvetica,sans-serif;
                        font-size:22px;
                        line-height:28px;
                        font-weight:800;
                        letter-spacing:-0.4px;
                        color:#111827;
                      "
                    >
                      ${emailBrand.name}
                    </div>

                    <div
                      style="
                        margin-top:3px;
                        font-family:Arial,Helvetica,sans-serif;
                        font-size:11px;
                        line-height:16px;
                        font-weight:600;
                        letter-spacing:1.2px;
                        text-transform:uppercase;
                        color:#9ca3af;
                      "
                    >
                      ${emailBrand.product}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 32px 36px;">

              ${eyebrow}

              <h1
                style="
                  margin:0 0 18px;
                  font-family:Arial,Helvetica,sans-serif;
                  font-size:30px;
                  line-height:38px;
                  font-weight:800;
                  letter-spacing:-0.7px;
                  color:#111827;
                "
              >
                ${escapeHtml(options.title)}
              </h1>

              ${intro}

              <div
                style="
                  font-family:Arial,Helvetica,sans-serif;
                  font-size:15px;
                  line-height:25px;
                  color:#374151;
                "
              >
                ${options.content}
              </div>

              ${cta}
              ${notice}

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td
              style="
                padding:24px 32px 28px;
                border-top:1px solid #f0f1f3;
                background:#fafafa;
              "
            >
              <p
                style="
                  margin:0 0 8px;
                  font-family:Arial,Helvetica,sans-serif;
                  font-size:12px;
                  line-height:19px;
                  color:#6b7280;
                "
              >
                ${emailBrand.tagline}
              </p>

              <p
                style="
                  margin:0 0 8px;
                  font-family:Arial,Helvetica,sans-serif;
                  font-size:12px;
                  line-height:19px;
                  color:#9ca3af;
                "
              >
                This is an automated message from ${emailBrand.name}.
                Please do not reply to this email.
              </p>

              <p
                style="
                  margin:0;
                  font-family:Arial,Helvetica,sans-serif;
                  font-size:12px;
                  line-height:19px;
                "
              >
                <a
                  href="${emailBrand.website}"
                  style="color:#6b7280;text-decoration:underline;"
                >
                  cygnex.co
                </a>
              </p>
            </td>
          </tr>

        </table>

        <p
          style="
            margin:18px 0 0;
            font-family:Arial,Helvetica,sans-serif;
            font-size:11px;
            line-height:17px;
            color:#9ca3af;
            text-align:center;
          "
        >
          © ${new Date().getFullYear()} ${emailBrand.name}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
