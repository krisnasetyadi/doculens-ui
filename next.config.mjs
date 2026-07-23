/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output — image Docker cuma bawa server.js + node_modules minimal
  // yang bener2 kepakai, bukan seluruh node_modules dev.
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
