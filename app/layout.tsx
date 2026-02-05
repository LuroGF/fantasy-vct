import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

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
        <div className="relative min-h-[100dvh] w-full bg-v-navy/50 shadow-2xl shadow-black/50 overflow-hidden sm:border-x sm:border-white/5">
          <main
            className="mx-auto w-full max-w-md sm:max-w-xl lg:max-w-3xl
                            min-h-[100dvh] overflow-y-auto overscroll-contain
                            pt-4 px-4 sm:px-6 lg:px-10 pb-24"
          >
            {children}
          </main>
          <Navbar />

          {/* App container */}
          <div className="relative min-h-[100dvh] w-full flex flex-col">
            {/* Si quieres "centrado y contenido" en desktop, usa:
              lg:grid lg:place-items-center y un max-w grande.
              Pero tú has pedido full screen en desktop, así que lo dejamos a full width.
          */}
            <div
              className="relative w-full flex-1 bg-v-navy/50 border-white/5 shadow-2xl shadow-black/50 overflow-hidden
                          sm:border-x sm:border-white/5"
            >
              {/* Main scroll area */}
              <main className="h-[100dvh] overflow-y-auto overscroll-contain">
                {children}
              </main>

              <Navbar />

              {/* Corner accents: ahora ocupan toda la pantalla */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-v-red/30" />
                <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-v-red/30" />
                <div className="absolute bottom-24 left-4 w-4 h-4 border-b-2 border-l-2 border-v-red/30" />
                <div className="absolute bottom-24 right-4 w-4 h-4 border-b-2 border-r-2 border-v-red/30" />
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
