/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  output: "standalone",

  basePath: "/admin",

  transpilePackages: ["@rmsm/ui"],

  eslint: {
    dirs: ["src"],
  },
};

export default nextConfig;