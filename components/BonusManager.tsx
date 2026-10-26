"use client";

import { useEffect, useState } from "react";
import { getBonusStatus, claimDailyBonus } from "@/lib/actions/bonus";
import { haptic } from "@/lib/utils/haptics";

export default function BonusManager() {
    const [canClaim, setCanClaim] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [claiming, setClaiming] = useState(false);

    useEffect(() => {
        async function check() {
            const status = await getBonusStatus();
            if (status.canClaim) {
                setCanClaim(true);
            }
        }
        check();
    }, []);

    const handleClaim = async () => {
        setClaiming(true);
        const res = await claimDailyBonus();
        if (res.success) {
            haptic.success();
            setMessage(res.message!);
            setCanClaim(false);
            setTimeout(() => setMessage(null), 5000);
        }
        setClaiming(false);
    };

    if (!canClaim && !message) return null;

    return (
        <div className="fixed top-20 left-4 right-4 z-[100] animate-in slide-in-from-top-4 duration-500">
            {canClaim ? (
                <div className="v-panel p-4 bg-v-navy/95 border-v-red/50 backdrop-blur-xl flex flex-col gap-3 relative overflow-hidden shadow-[0_10px_40px_-15px_rgba(255,70,85,0.4)]">
                    <div className="absolute top-0 left-0 h-[2px] bg-v-red w-full animate-pulse" />
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-v-red flex items-center justify-center shrink-0 shadow-lg shadow-v-red/40 animate-bounce">
                            <span className="text-white text-xl">🎁</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-white tracking-widest">SUMINISTROS DISPONIBLES</p>
                            <p className="text-[12px] font-black italic text-v-white/60 leading-tight">Reclama 500.000 € diarios</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleClaim}
                        disabled={claiming}
                        className="w-full py-2 bg-v-red text-white text-[10px] font-black uppercase tracking-widest hover:bg-v-red/80 transition-all disabled:opacity-50"
                    >
                        {claiming ? "Reclamando..." : "RECLAMAR 500.000 €"}
                    </button>
                </div>
            ) : (
                <div className="v-panel p-4 bg-v-navy/90 border-green-500/50 backdrop-blur-xl flex items-center gap-4 relative overflow-hidden shadow-[0_10px_40px_-15px_rgba(34,197,94,0.3)]">
                    <div className="absolute top-0 left-0 h-full w-[4px] bg-green-500" />
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0 shadow-lg shadow-green-500/40">
                        <span className="text-white text-xl">💰</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-white tracking-widest">TRANSACCIÓN COMPLETADA</p>
                        <p className="text-[12px] font-black italic text-green-500 leading-tight mt-1">{message}</p>
                    </div>
                    <button 
                    onClick={() => setMessage(null)}
                    className="ml-auto text-v-white/20 hover:text-v-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}
        </div>
    );
}
