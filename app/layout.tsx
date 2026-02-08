import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${oswald.variable}`}>
      <body className="antialiased h-dvh flex flex-col items-center overflow-hidden">
        {/* Main Wrapper to keep mobile feel on desktop */}
        <div className="relative h-[100dvh] w-full bg-v-navy/50 shadow-2xl shadow-black/50 overflow-hidden sm:border-x sm:border-white/5 flex flex-col">
          <Sidebar />

          {/* ÚNICO scroll container: necesita altura acotada => flex-1 */}
          <main className="flex-1 overflow-y-auto overscroll-contain pb-24">
            <div className="mx-auto w-full max-w-md sm:max-w-lg lg:max-w-4xl px-4 sm:px-6 lg:px-10 py-4">
              {children}
            </div>
          </main>

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
