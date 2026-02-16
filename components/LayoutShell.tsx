"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Navbar from "./Navbar";
import { ScrollToTopButton } from "./ScrollToTopButton";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/";

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background shadow-2xl">
      {/* Sidebar fixed (desktop) */}
      <Sidebar />

      {/* MAIN FULL WIDTH */}
      <div 
        className={cn(
          "relative h-full w-full transition-all duration-300",
          !isAuthPage && "lg:pl-72"
        )}
      >
        {/* TopBar móvil (hidden on auth pages if desired, but user mainly complained about displacement) */}
        {!isAuthPage && <TopBar />}

        {/* SCROLL AQUÍ */}
        <main
          id="main-content"
          className={cn(
            "w-full overflow-y-auto overscroll-contain pb-24 lg:pb-8 custom-scrollbar relative z-10",
            !isAuthPage ? "h-[calc(100%-3.5rem)]" : "h-full"
          )}
        >
          {children}
        </main>

        {/* Navbar móvil */}
        {!isAuthPage && <Navbar />}
        {!isAuthPage && <ScrollToTopButton />}

      </div>
    </div>
  );
}
