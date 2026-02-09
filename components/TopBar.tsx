"use client";

import { useState, useEffect } from "react";
import { getSession } from "@/lib/actions/auth";
import { getUserLeagues } from "@/lib/actions/leagues";
import { getUnreadCount } from "@/lib/actions/notifications";
import { Bell } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function TopBar() {
    const [user, setUser] = useState<any>(null);
    const [activeLeague, setActiveLeague] = useState<any>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        async function load() {
            const session = await getSession();
            if (session) {
                setUser(session.user);
                const leagues = await getUserLeagues(session.user.id);
                if (leagues && leagues.length > 0) {
                    setActiveLeague(leagues[0]);
                }
                const count = await getUnreadCount(session.user.id);
                setUnreadCount(count);
            }
        }
        load();
        
        // Refresh every minute for points/budget updates
        const interval = setInterval(load, 60000);
        return () => clearInterval(interval);
    }, []);

    if (!user) return null;

    return (
        <header className="sticky top-0 left-0 w-full z-40 bg-v-navy/80 backdrop-blur-md border-b border-white/5 px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border border-v-red bg-v-navy overflow-hidden flex items-center justify-center">
                    <span className="text-xs font-black italic">{user.username?.[0] || "U"}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase italic leading-none">{user.username}</span>
                    <span className="text-[8px] font-bold text-v-white/40 uppercase tracking-widest">{activeLeague?.leagues?.name || "Sin Liga"}</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="text-[7px] font-black uppercase text-v-white/20 tracking-widest leading-none mb-0.5">Combat Points</p>
                    <p className="text-xs font-black italic text-v-white leading-none">
                        {activeLeague?.total_points?.toLocaleString() || 0}
                    </p>
                </div>

                <div className="h-6 w-[1px] bg-white/5" />

                <Link href="/more" className="relative p-2 text-v-white/40 hover:text-v-red transition-colors">
                    <Bell className="w-5 h-5" />
                    <AnimatePresence>
                        {unreadCount > 0 && (
                            <motion.span 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute top-1.5 right-1.5 w-2 h-2 bg-v-red rounded-full border border-v-navy" 
                            />
                        )}
                    </AnimatePresence>
                </Link>
            </div>
        </header>
    );
}
