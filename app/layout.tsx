import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "@/app/globals.css";
import LayoutShell from "@/components/LayoutShell";
import PWAInstaller from "@/components/PWAInstaller";
import PushManager from "@/components/PushManager";
import { Toaster } from "sileo";
import { LocaleProvider } from "@/components/LocaleProvider";
import { getServerLocale } from "@/lib/i18n/server";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const descriptions = {
    es: "Crea tu plantilla con jugadores del VCT, compite en ligas privadas y demuestra quién es el mejor entrenador de Valorant.",
    en: "Build your squad with VCT players, compete in private leagues and prove you are the best Valorant coach.",
    fr: "Créez votre effectif avec des joueurs du VCT, participez à des ligues privées et prouvez que vous êtes le meilleur entraîneur de Valorant.",
  };

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://fantasy-vct-ten.vercel.app"),
    title: { default: "VFantasy", template: "%s | VFantasy" },
    description: descriptions[locale],
    manifest: "/manifest.json",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "VFantasy" },
    icons: {
      icon: [
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    },
  };
}

export const viewport = {
  themeColor: "#FF4655",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();

  return (
    <html lang={locale} className={`${inter.variable} ${oswald.variable}`}>
      <body className="antialiased h-dvh w-full overflow-hidden bg-v-navy text-v-white">
        <PWAInstaller />
        <PushManager />

        <LocaleProvider initialLocale={locale}>
          <LayoutShell>{children}</LayoutShell>
        </LocaleProvider>
        {/* <Toaster richColors closeButton theme="dark" /> */}
        <Toaster
          position="bottom-center"
          theme="dark"
          options={{
            fill: "#0f172a",
            roundness: 16,
            autopilot: {
              expand: 300,
              collapse: 6500,
            },
            styles: {
              title: "text-white!",
              description: "text-white/70!",
              badge: "bg-white/10!",
            },
          }}
        />
      </body>
    </html>
  );
}
