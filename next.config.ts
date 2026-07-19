import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Prisma (and its native query engine) out of the Turbopack/webpack bundle.
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
