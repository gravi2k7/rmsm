/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  output: "standalone",

  transpilePackages: ["@rmsm/ui"],

  async redirects() {
    return [
      {
        source: "/market/:instrumentId",
        destination: "/trading?instrument=:instrumentId",
        permanent: false,
      },
    ];
  },

  eslint: {
    dirs: ["src"],
  },
};

export default nextConfig;