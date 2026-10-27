import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://fantasy-vct-ten.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/aviso-legal"],
      disallow: [
        "/api/",
        "/auth/",
        "/dashboard",
        "/forgot-password",
        "/leagues",
        "/login",
        "/market",
        "/more",
        "/players",
        "/ranking",
        "/register",
        "/reset-password",
        "/schedule",
        "/shop",
        "/stats",
        "/team",
      ],
    },
    host: siteUrl,
  };
}
