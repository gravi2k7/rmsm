import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

// WM-015R Part 10/1 — previously had no metadata at all, so it inherited
// the root layout's default "RMSM AI" title/robots. A 404 page should be
// explicitly noindex (search engines shouldn't crawl/rank a "not found"
// URL) and have its own descriptive title, per SEO best practice.
export const metadata = buildMetadata({
  title: "Page Not Found",
  description: "The page you're looking for doesn't exist or has moved.",
  path: "/404",
  noIndex: true,
});

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2">
      <h2 className="text-xl font-semibold">404 — Page not found</h2>
      <Link href="/" className="text-sm underline">
        Back home
      </Link>
    </div>
  );
}
