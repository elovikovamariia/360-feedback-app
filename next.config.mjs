/** @type {import('next').NextConfig} */
const isGhPages = process.env.GITHUB_PAGES === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  ...(isGhPages
    ? {
        output: "export",
        ...(basePath ? { basePath, assetPrefix: basePath } : {}),
      }
    : {}),
  images: {
    ...(isGhPages ? { unoptimized: true } : {}),
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

export default nextConfig;
