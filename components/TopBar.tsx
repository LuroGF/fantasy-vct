"use client";

import { useState, useEffect } from "react";
import { getSession } from "@/lib/actions/auth";
import { getUnreadCount } from "@/lib/actions/notifications";
import { getBonusStatus, claimDailyBonus } from "@/lib/actions/bonus";
import { Bell, CheckCircle, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/utils/haptics";

export default function TopBar() {
    const [user, setUser] = useState<any>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [bonusStatus, setBonusStatus] = useState<{ canClaim: boolean }>({ canClaim: false });
    const [showNotifications, setShowNotifications] = useState(false);
    const [claiming, setClaiming] = useState(false);
    const [claimMessage, setClaimMessage] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            const session = await getSession();
            if (session) {
                setUser(session.user);
                const count = await getUnreadCount(session.user.id);
                setUnreadCount(count);
                const bonus = await getBonusStatus(session.user.id);
                setBonusStatus(bonus);
            }
        }
        load();
        const interval = setInterval(load, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleClaim = async () => {
        if (!user) return;
        setClaiming(true);
        haptic.medium();
        
        const res = await claimDailyBonus(user.id);
        
        if (res.success) {
            haptic.success();
            setClaimMessage(res.message || "Claimed!");

            // Hide after 2 seconds
            setTimeout(() => {
                setClaimMessage(null);
                setBonusStatus({ canClaim: false });
                setShowNotifications(false);
            }, 2000);
        } else {
            haptic.error();
            setClaimMessage(res.error || "Error");
            setTimeout(() => setClaimMessage(null), 2000);
        }
        setClaiming(false);
    };

    if (!user) return null;

    const hasNotifications = unreadCount > 0 || bonusStatus.canClaim;

    return (
        <header className="sticky top-0 left-0 w-full z-50 bg-v-navy/80 backdrop-blur-md border-b border-white/5 px-4 h-14 flex items-center justify-end">
            <div className="relative">
                <button 
                    onClick={() => {
                        haptic.light();
                        setShowNotifications(!showNotifications);
                    }}
                    className="relative p-2 text-v-white/60 hover:text-v-red transition-colors outline-none"
                >
                    <Bell className="w-6 h-6" />
                    <AnimatePresence>
                        {hasNotifications && (
                            <motion.span 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-v-red rounded-full border-2 border-v-navy" 
                            />
                        )}
                    </AnimatePresence>
                </button>

                {/* Notifications Dropdown */}
                <AnimatePresence>
                    {showNotifications && (
                        <>
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowNotifications(false)}
                                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
                            />
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                className="absolute right-0 top-full mt-2 w-72 z-50 origin-top-right"
                            >
                                <div className="bg-v-navy border border-white/10 shadow-2xl shadow-black/50 overflow-hidden flex flex-col">
                                    <div className="p-3 border-b border-white/5 bg-white/5">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-v-white/60">Notificaciones</h3>
                                    </div>
                                    
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {/* Daily Bonus Item */}
                                        {bonusStatus.canClaim && (
                                            <div className="p-3 border-b border-white/5 bg-v-red/5 hover:bg-v-red/10 transition-colors">
                                                <div className="flex gap-3 items-start">
                                                    <div className="w-8 h-8 rounded bg-v-red/20 flex items-center justify-center shrink-0 text-v-red">
                                                        <Gift size={16} />
                                                    </div>
                                                    <div className="flex-1 space-y-2">
                                                        <div>
                                                            <p className="text-xs font-bold text-v-white">Bonus Diario Disponible</p>
                                                            <p className="text-[10px] text-v-white/60 leading-tight">Reclama tus $2M para fichajes hoy.</p>
                                                        </div>
                                                        
                                                        {claimMessage ? (
                                                            <div className="flex items-center gap-2 text-green-400 text-[10px] font-bold animate-in fade-in">
                                                                <CheckCircle size={12} />
                                                                <span>{claimMessage}</span>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={handleClaim}
                                                                disabled={claiming}
                                                                className="w-full bg-v-red text-white text-[10px] font-black uppercase py-1.5 hover:bg-v-red/80 transition-colors disabled:opacity-50"
                                                            >
                                                                {claiming ? "Procesando..." : "RECLAMAR AHORA"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Empty State */}
                                        {!bonusStatus.canClaim && unreadCount === 0 && (
                                            <div className="p-6 text-center">
                                                <p className="text-[10px] uppercase text-v-white/20 font-black tracking-widest">
                                                    Sin nuevas notificaciones
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </header>
    );
}

