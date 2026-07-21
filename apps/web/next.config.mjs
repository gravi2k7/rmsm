/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["@rmsm/ui", "@rmsm/shared", "@rmsm/types"],
  eslint: { dirs: ["src"] },
};

export default nextConfig;
