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
      <body className="antialiased h-dvh w-full overflow-hidden bg-v-navy text-v-white">
        <PWAInstaller />
        <PushManager />

        {/* FULL WIDTH WRAPPER */}
        <div className="relative h-dvh w-full overflow-hidden bg-background shadow-2xl">
          {/* Sidebar fixed (desktop) */}
          <Sidebar />

          {/* MAIN FULL WIDTH */}
          <div className="relative h-full w-full lg:pl-72">
            {/* TopBar móvil */}
            <TopBar />

            {/* SCROLL AQUÍ */}
            <main
              id="main-content"
              className="h-[calc(100%-3.5rem)] w-full overflow-y-auto overscroll-contain pb-24 lg:pb-8 custom-scrollbar relative z-10"
            >
              {children}
            </main>

            {/* Navbar móvil */}
            <Navbar />
            <ScrollToTopButton />

            {/* Corner Decorative Accents */}
            <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
               {/* Top left */}
               <div className="absolute top-0 left-0 w-8 h-8 lg:left-72">
                  <div className="absolute top-4 left-4 w-4 h-px bg-v-red/40" />
                  <div className="absolute top-4 left-4 w-px h-4 bg-v-red/40" />
               </div>
               {/* Top right */}
               <div className="absolute top-0 right-0 w-8 h-8">
                  <div className="absolute top-4 right-4 w-4 h-px bg-v-red/40" />
                  <div className="absolute top-4 right-4 w-px h-4 bg-v-red/40" />
               </div>
               {/* Bottom accents for mobile nav area are handled inside Navbar for better alignment */}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
