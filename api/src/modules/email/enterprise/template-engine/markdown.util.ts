/**
 * EM-001's own "Markdown Templates" support — a deliberately small,
 * dependency-free subset (bold, italic, links, paragraphs/line breaks)
 * rather than a full CommonMark implementation. Every shipped template
 * in `definitions/` uses HTML format; this exists so a future template
 * authored in markdown (EM-001's own architecture explicitly asks for
 * the *capability*, not that every template use it) has somewhere to
 * render through without pulling in a markdown library for a handful of
 * transactional emails.
 */
export function markdownToHtml(markdown: string): string {
  const withInline = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  const paragraphs = withInline
    .split(/\n{2,}/)
    .map((block) => `<p>${block.trim().replace(/\n/g, "<br />")}</p>`)
    .join("\n");

  return paragraphs;
}

/** Strips markdown/HTML markup down to plain text — used when a template has no explicit `textBody` to derive the plain-text alternative from its markdown/HTML body. */
export function toPlainText(source: string): string {
  return source
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
