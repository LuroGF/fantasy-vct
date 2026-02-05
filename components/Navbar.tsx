"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, ShoppingCart, Trophy, MoreHorizontal, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { NotificationBadge } from "./NotificationBadge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { href: "/dashboard", label: "Inicio", icon: Home },
    { href: "/team", label: "Mi equipo", icon: Users },
    { href: "/market", label: "Mercado", icon: ShoppingCart },
    { href: "/shop", label: "Tienda", icon: ShoppingBag },
    { href: "/leagues", label: "Ligas", icon: Trophy },
    { href: "/more", label: "Más", icon: MoreHorizontal },
];

export default function Navbar() {
    const pathname = usePathname();

    // No mostrar navbar en login o registro
    const hideNavbar = pathname === "/login" || pathname === "/register" || pathname === "/";
    if (hideNavbar) return null;

    return (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 border-t border-white/10 bg-v-navy/95 backdrop-blur-xl">
            <div className="flex items-center justify-between px-2 h-16">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const isMore = item.label === "Más";

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative flex flex-1 flex-col items-center justify-center gap-1 h-full active:scale-90 transition-transform select-none"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="nav-active"
                                    className="absolute inset-0 z-0 bg-v-red/10"
                                    transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                                />
                            )}
                            <div className="relative z-10">
                                <item.icon
                                    className={cn(
                                        "h-5 w-5 transition-colors duration-200",
                                        isActive ? "text-v-red" : "text-v-white/50"
                                    )}
                                />
                                {isMore && <NotificationBadge />}
                            </div>
                            <span
                                className={cn(
                                    "text-[9px] font-black uppercase tracking-widest transition-colors duration-200 z-10 font-oswald",
                                    isActive ? "text-v-white" : "text-v-white/40"
                                )}
                            >
                                {item.label}
                            </span>

                            {isActive && (
                                <motion.div
                                    layoutId="nav-indicator"
                                    className="absolute top-0 h-[3px] w-12 bg-v-red shadow-[0_0_10px_rgba(255,70,85,0.5)]"
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

