/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@rmsm/ui", "@rmsm/shared", "@rmsm/types"],
  eslint: { dirs: ["src"] },
  // The Docker production image (see apps/web/Dockerfile) copies the whole
  // .next/ + node_modules wholesale rather than using `next start` against
  // a standalone/traced output, so the per-page dependency-trace files
  // output-file-tracing produces are unused here. Disabling it removes an
  // otherwise-pure-overhead "Collecting build traces" pass.
  outputFileTracing: false,
};

export default nextConfig;
