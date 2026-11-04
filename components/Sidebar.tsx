"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LogOut, Users, ShoppingCart, Trophy, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { NotificationBadge } from "./NotificationBadge";
import { signOut } from "@/lib/actions/auth";
import { useLocale } from "./LocaleProvider";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { href: "/dashboard", labelKey: "nav.home" as const, icon: Home },
  { href: "/leagues", labelKey: "nav.leagues" as const, icon: Trophy },
  { href: "/team", labelKey: "nav.team" as const, icon: Users },
  { href: "/market", labelKey: "nav.market" as const, icon: ShoppingCart },
  { href: "/more", labelKey: "nav.more" as const, icon: MoreHorizontal },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLocale();

return (
  <aside className="hidden lg:flex fixed top-0 left-0 h-[100dvh] w-72 z-50
                    border-r border-white/10
                    bg-v-navy/80 backdrop-blur-xl
                    overflow-y-auto pointer-events-auto">
    <div className="flex h-full w-full flex-col p-4">
      {/* Brand / Header */}
      {/* <div className="mb-4 px-2 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-v-red" />
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-v-white font-oswald">
              VCT FANTASY
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-v-white/40">
              Navegación
            </p>
          </div>
        </div>
      </div> */}

      {/* Items */}
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isMore = item.href === "/more";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-3 transition-colors select-none",
                "hover:bg-white/5",
                isActive && "bg-v-red/10"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-0 h-full w-1 bg-v-red"
                />
              )}

              <div className="relative">
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-v-red" : "text-v-white/50"
                  )}
                />
                {isMore && <NotificationBadge />}
              </div>

              <span
                className={cn(
                  "text-[11px] font-black uppercase tracking-widest font-oswald",
                  isActive ? "text-v-white" : "text-v-white/50"
                )}
              >
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </nav>

      <form action={signOut} className="border-t border-white/10 pt-2">
        <button
          type="submit"
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-v-red/70 transition-colors hover:bg-v-red/10 hover:text-v-red"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          <span className="text-[11px] font-black uppercase tracking-widest font-oswald">
            {t("nav.logout")}
          </span>
        </button>
      </form>

      {/* Footer hint */}
      <div className="mt-3 px-2 pb-2 text-[10px] font-black uppercase tracking-[0.3em] text-v-white/20">
        VCT // 2027
      </div>
    </div>
  </aside>
);

}
