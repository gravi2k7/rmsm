/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Only @rmsm/ui stays here: it's a frontend-only React/Tailwind
  // component library, intentionally kept source-based (see the WM-021
  // architecture report) so Next's own SWC pipeline compiles it directly
  // -- proper Tailwind class extraction, no duplicate React instance, fast
  // HMR. @rmsm/shared and @rmsm/types now ship real dist/ builds (main ->
  // dist/index.js, types -> dist/index.d.ts) like every other runtime
  // package, so Next resolves them as ordinary pre-compiled packages and
  // no longer needs to transpile them from source.
  transpilePackages: ["@rmsm/ui"],
  eslint: { dirs: ["src"] },
};

export default nextConfig;
