import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import PWAInstaller from "@/components/PWAInstaller";
import PushManager from "@/components/PushManager";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Valorant Fantasy VCT",
  description: "Compite con tus amigos en la mejor liga fantasy de Valorant",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VCT Fantasy",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#FF4655",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${oswald.variable}`}>
      <body className="antialiased h-dvh w-full overflow-hidden bg-v-navy text-v-white">
        <PWAInstaller />
        <PushManager />

        <LayoutShell>
          {children}
        </LayoutShell>
      </body>
    </html>
  );
}
