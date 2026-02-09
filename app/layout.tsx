import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import PWAInstaller from "@/components/PWAInstaller";
import SwipeNavigation from "@/components/SwipeNavigation";
import SwipeIndicator from "@/components/SwipeIndicator";
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
  themeColor: "#FF4655",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VCT Fantasy"
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" }
    ]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${oswald.variable}`}>
      <body className="antialiased h-dvh flex flex-col items-center overflow-hidden">
        <PWAInstaller />
        <PushManager />
        {/* Main Wrapper to keep mobile feel on desktop */}
        <div className="w-full max-w-md h-full bg-v-navy/50 relative flex flex-col border-x border-white/5 shadow-2xl shadow-black/50 overflow-hidden">
          <SwipeNavigation>
            <main className="flex-1 pb-24 overflow-y-auto pt-4 px-4 overscroll-contain">
              {children}
            </main>
          </SwipeNavigation>
          <SwipeIndicator />
          <Navbar />

          {/* Subtle Valorant-style corner accents */}
          <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-full pointer-events-none">
            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-v-red/30" />
            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-v-red/30" />
            <div className="absolute bottom-24 left-4 w-4 h-4 border-b-2 border-l-2 border-v-red/30" />
            <div className="absolute bottom-24 right-4 w-4 h-4 border-b-2 border-r-2 border-v-red/30" />
          </div>
        </div>
      </body>
    </html>
  );
}

