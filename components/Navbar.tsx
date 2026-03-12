"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, ShoppingCart, Trophy, MoreHorizontal, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { haptic } from "@/lib/utils/haptics";

import { NotificationBadge } from "./NotificationBadge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { href: "/dashboard", label: "Inicio", icon: Home },
    { href: "/leagues", label: "Ligas", icon: Trophy },
    { href: "/team", label: "Equipo", icon: Users },
    { href: "/market", label: "Mercado", icon: ShoppingCart },
    { href: "/shop", label: "Tienda", icon: ShoppingBag },
    { href: "/more", label: "Más", icon: MoreHorizontal },
];


export default function Navbar() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 w-full lg:hidden z-50 border-t border-white/10 bg-v-navy/95 backdrop-blur-xl v-safe-area-pb">
            <div className="flex items-center justify-between px-2 h-16">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const isMore = item.label === "Más";

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => haptic.light()}
                            className="relative flex flex-1 flex-col items-center justify-center gap-1 h-full active:scale-95 transition-transform select-none"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="nav-active"
                                    className="absolute inset-x-1 inset-y-2 z-0 bg-v-red/10 rounded-sm"
                                    transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                                />
                            )}
                            <div className="relative z-10 flex flex-col items-center">
                                <item.icon
                                    className={cn(
                                        "h-5 w-5 transition-colors duration-200",
                                        isActive ? "text-v-red" : "text-v-white/50"
                                    )}
                                />
                                {isMore && <NotificationBadge />}
                                <span
                                    className={cn(
                                        "text-[8px] font-black uppercase tracking-[0.1em] mt-1 transition-colors duration-200 font-oswald",
                                        isActive ? "text-v-white" : "text-v-white/40"
                                    )}
                                >
                                    {item.label}
                                </span>
                            </div>

                            {isActive && (
                                <motion.div
                                    layoutId="nav-indicator"
                                    className="absolute top-0 h-[2px] w-8 bg-v-red shadow-[0_0_10px_rgba(255,70,85,0.8)]"
                                    transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

