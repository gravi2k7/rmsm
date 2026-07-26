import { ImageResponse } from "next/og";
import { siteConfig } from "@/config";

/**
 * WM-015R Part 1/6 — generated favicon via Next's `icon.tsx` file
 * convention (built on `next/og`'s `ImageResponse`). There was no icon or
 * `public/` asset anywhere in the repo before this; rather than inventing
 * a logo/brand mark that doesn't exist, this renders the site's own short
 * name (`siteConfig.shortName`, already "RMSM" everywhere else) on the
 * exact theme color already established in `manifest.ts`/`layout.tsx`'s
 * `viewport` — a monogram derived entirely from existing config, not a new
 * design decision.
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

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: siteConfig.themeColor,
          color: "#ffffff",
          fontSize: 20,
          fontWeight: 700,
          borderRadius: 6,
        }}
      >
        {siteConfig.shortName[0]}
      </div>
    ),
    { ...size },
  );
}
