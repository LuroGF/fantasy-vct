import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import PWAInstaller from "@/components/PWAInstaller";
import PushManager from "@/components/PushManager";
import TopBar from "@/components/TopBar";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";

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
    viewportFit: "cover",
  },
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${oswald.variable}`}>
      <body className="antialiased h-[100dvh] w-full overflow-hidden bg-v-navy text-v-white">
        <PWAInstaller />
        <PushManager />

        {/* FULL WIDTH WRAPPER */}
        <div className="relative h-[100dvh] w-full overflow-hidden bg-v-navy/50 shadow-2xl shadow-black/50">
          {/* Sidebar fixed (desktop) */}
          <Sidebar />

          {/* MAIN FULL WIDTH */}
          <div className="relative h-full w-full">
            {/* TopBar móvil */}
            <div className="lg:hidden sticky top-0 z-40">
              <TopBar />
            </div>

            {/* SCROLL AQUÍ */}
            <main
              className="
              h-full w-full overflow-y-auto overscroll-contain"
            >
              {children}
            </main>

            {/* Navbar móvil */}
            <Navbar />
            <ScrollToTopButton />
          </div>

          {/* Corner accents */}
          {/* <div className="pointer-events-none absolute inset-0 z-0">
            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-v-red/30" />
            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-v-red/30" />
            <div className="absolute bottom-24 left-4 w-4 h-4 border-b-2 border-l-2 border-v-red/30" />
            <div className="absolute bottom-24 right-4 w-4 h-4 border-b-2 border-r-2 border-v-red/30" />
          </div> */}
        </div>
      </body>
    </html>
  );
}
