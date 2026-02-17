"use client";

import { useState, useEffect } from "react";
import { getSession } from "@/lib/actions/auth";
import { getUnreadCount } from "@/lib/actions/notifications";
import { getBonusStatus, claimDailyBonus } from "@/lib/actions/bonus";
import { Bell, CheckCircle, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/utils/haptics";

import { useRouter } from "next/navigation";

export default function TopBar() {
    const router = useRouter();
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
            router.refresh();

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
        <header className="sticky top-0 left-0 w-full z-40 bg-black/40 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 h-14 flex items-center justify-between">
            {/* Background design element */}
            <div className="absolute inset-0 bg-linear-to-r from-v-red/5 to-transparent pointer-events-none" />
            
            <div className="flex items-center gap-4 relative z-10">
                 <div className="flex flex-col">
                    <span className="text-[11px] font-black italic text-v-red leading-none tracking-wider sm:text-xs">VCT FANTASY // TERMINAL</span>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
                        <span className="text-[7px] font-black uppercase text-green-500/60 tracking-[0.3em] font-sans">EN LÍNEA</span>
                    </div>
                 </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-6 relative z-10">
                <div className="flex flex-col items-end">
                    <span className="text-[7px] font-black uppercase text-white/30 tracking-widest leading-none">Usuario</span>
                    <span className="text-[11px] font-black uppercase italic text-white leading-tight sm:text-xs">{user.user_metadata?.username || "OPERATOR"}</span>
                </div>
                
                <div className="h-6 w-px bg-white/5 hidden sm:block" />

                <div className="relative">
                    <button 
                        onClick={() => {
                            haptic.light();
                            setShowNotifications(!showNotifications);
                        }}
                        className={`relative p-2 rounded-sm cursor-pointer transition-all outline-none ${showNotifications ? 'bg-v-red text-white' : 'hover:bg-white/5 text-white/60'}`}
                    >
                        <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                        <AnimatePresence>
                            {hasNotifications && (
                                <motion.span 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    className="absolute top-1.5 right-1.5 w-2 h-2 bg-v-red rounded-full border border-v-navy shadow-[0_0_5px_rgba(255,70,85,1)]" 
                                />
                            )}
                        </AnimatePresence>
                    </button>

                    <AnimatePresence>
                        {showNotifications && (
                            <>
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowNotifications(false)}
                                    className="fixed inset-0 z-40 lg:absolute lg:right-0 lg:top-full lg:h-[200vh] lg:w-[200vw]"
                                />
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-3 w-[280px] sm:w-[320px] z-50 origin-top-right"
                                >
                                    <div className="v-panel bg-v-gray/95 border-v-red/20 shadow-2xl p-0 overflow-hidden">
                                        <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-v-red">Notificaciones</h3>
                                            <span className="text-[8px] font-black text-white/20">SYSTEM v2.0</span>
                                        </div>
                                        
                                        <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                            {/* Daily Bonus Item */}
                                            {bonusStatus.canClaim && (
                                                <div className="p-4 border-b border-white/5 bg-v-red/5 hover:bg-v-red/10 transition-colors group">
                                                    <div className="flex gap-4 items-start">
                                                        <div className="w-10 h-10 rounded-sm bg-v-red/20 flex items-center justify-center shrink-0 text-v-red border border-v-red/30 group-hover:border-v-red transition-colors">
                                                            <Gift size={20} />
                                                        </div>
                                                        <div className="flex-1 space-y-3">
                                                            <div>
                                                                <p className="text-[11px] font-black uppercase text-white tracking-wider italic">Recompensa Diaria</p>
                                                                <p className="text-[10px] text-white/50 leading-tight mt-1">Créditos de operación detectados. Procede con el reclamo.</p>
                                                            </div>
                                                            
                                                            {claimMessage ? (
                                                                <div className="flex items-center gap-2 text-green-500 text-[10px] font-black uppercase italic animate-in slide-in-from-left">
                                                                    <div className="w-4 h-4 rounded-full border border-green-500/30 flex items-center justify-center">
                                                                       <CheckCircle size={10} />
                                                                    </div>
                                                                    <span>{claimMessage}</span>
                                                                </div>
                                                            ) : (
                                                                <button 
                                                                    onClick={handleClaim}
                                                                    disabled={claiming}
                                                                    className="w-full v-btn-primary !px-0 !py-2 !text-[9px] italic"
                                                                >
                                                                    {claiming ? "Sincronizando..." : "RECLAMAR CRÉDITOS"}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Empty State */}
                                            {!bonusStatus.canClaim && unreadCount === 0 && (
                                                <div className="p-10 text-center space-y-3">
                                                    <div className="text-3xl opacity-10">📡</div>
                                                    <p className="text-[9px] uppercase text-white/20 font-black tracking-[0.3em] italic">
                                                        Terminal Despejada
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-2 bg-black/20 text-center">
                                            <button 
                                                onClick={() => setShowNotifications(false)}
                                                className="text-[8px] font-black uppercase text-white/20 hover:text-white transition-colors"
                                            >
                                                [ CERRAR ]
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
}

