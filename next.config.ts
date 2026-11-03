import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite validar builds locales sin cerrar un servidor dev que bloquee .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "uldoqtlxqnkizcievcqw.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default nextConfig;
