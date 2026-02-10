import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import PWAInstaller from "@/components/PWAInstaller";
import SwipeNavigation from "@/components/SwipeNavigation";
import SwipeIndicator from "@/components/SwipeIndicator";
import PushManager from "@/components/PushManager";
import TopBar from "@/components/TopBar";

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
        
        <div className="relative h-dvh w-full bg-v-navy/50 shadow-2xl shadow-black/50 overflow-hidden sm:border-x sm:border-white/5 flex flex-col">
          <Sidebar />
          
          <div className="flex-1 flex flex-col lg:pl-72 relative overflow-hidden">
            <div className="lg:hidden">
              <TopBar />
            </div>

            <SwipeNavigation>
              <main className="flex-1 overflow-y-auto overscroll-contain pb-24 relative">
                <div className="mx-auto w-full max-w-md sm:max-w-lg lg:max-w-4xl px-4 sm:px-6 lg:px-10 py-4">
                  {children}
                </div>
              </main>
            </SwipeNavigation>
            <SwipeIndicator />
          </div>

          <Navbar />

          {/* Corner accents */}
          <div className="pointer-events-none absolute inset-0">
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

