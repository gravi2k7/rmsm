import { ImageResponse } from "next/og";
import { siteConfig } from "@/config";

/**
 * WM-015R Part 1/6 — generated OpenGraph/Twitter preview image via Next's
 * `opengraph-image.tsx` file convention. Applies to every route by default
 * (Next inherits it down the tree unless a segment defines its own), which
 * is exactly what's needed here: one honest, code-generated placeholder
 * card using `siteConfig.name`/`tagline` — real copy that already exists
 * elsewhere on the site — rather than a fabricated screenshot or invented
 * product imagery. `buildMetadata()`'s `openGraph`/`twitter` fields don't
 * need to reference this explicitly; Next wires file-convention images in
 * automatically.
 */
// WM-015R build-fix — `next/og`'s Node.js runtime loads its bundled
// fallback font via `fs.readFileSync(fileURLToPath(join(import.meta.url,
// "../noto-sans-v27-latin-regular.ttf")))`. On Windows, joining a
// `file://` URL string through `path.join` (backslash-based) instead of
// the `URL` API produces a malformed URL, which throws
// `TypeError: Invalid URL` while prerendering this route (see
// vercel/next.js#77164). The Edge runtime's build of `next/og` resolves
// the same bundled font via `fetch(new URL(...))` instead, which is
// platform-safe. Forcing Edge here avoids the bug without touching fonts,
// assets, or the rendered output at all.
export const runtime = "edge";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = siteConfig.name;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          background: siteConfig.themeColor,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>{siteConfig.shortName}</div>
        <div style={{ fontSize: 32, color: "#cbd5e1", maxWidth: 900, textAlign: "center" }}>{siteConfig.tagline}</div>
      </div>
    ),
    { ...size },
  );
}
