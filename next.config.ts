import type { NextConfig } from "next";

const appBuildId =
  process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
  process.env.NEXT_PUBLIC_APP_BUILD_ID?.trim() ||
  "development";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_BUILD_ID: appBuildId,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
