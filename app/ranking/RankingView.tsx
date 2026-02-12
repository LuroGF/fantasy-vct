
"use client";

import { useState } from "react";
import { payClause } from "@/lib/actions/market";
import { haptic } from "@/lib/utils/haptics";
import { useRouter } from "next/navigation";

import { useEffect } from "react";

export function RankingView({ standings, initialLocks, profileId, activeLeagueId }: { standings: any[], initialLocks: string[], profileId: string, activeLeagueId: string }) {
    const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [confirmPay, setConfirmPay] = useState<{ player: any } | null>(null);
    const router = useRouter();

    const isPlayerLocked = (playerId: string) => {
        return initialLocks.includes(playerId);
    };

    const handlePayClause = async (player: any) => {
        if (!activeLeagueId || !profileId || !selectedTeam) return;
        setConfirmPay(null);

        setLoading(true);
        setStatus(null);
        try {
            const res = await payClause(activeLeagueId, profileId, player.id, selectedTeam.profile_id);
            if (res.success) {
                haptic.success();
                setStatus({ type: 'success', message: `${player.nickname} fichado por cláusula!` });
                setSelectedTeam(null);
                router.refresh(); // Real-time update
            } else {
                haptic.error();
                setStatus({ type: 'error', message: res.error || "Error al pagar cláusula" });
            }
        } catch (e) {
            haptic.error();
            setStatus({ type: 'error', message: "Error inesperado" });
        }
        setLoading(false);
    };

    return (
        <div
        className="
  mx-auto
  w-full
  max-w-md sm:max-w-xl lg:max-w-4xl
  px-4 sm:px-6
  flex flex-col gap-8
  animate-in fade-in slide-in-from-bottom-4 duration-700 py-6
"
      >
            {status && (
                <div className={`p-4 rounded-none border-l-2 mb-4 font-black uppercase text-xs ${
                    status.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-v-red/10 border-v-red text-v-red'
                }`}>
                    {status.message}
                </div>
            )}

            <div className="v-panel p-4">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-v-white/50">Standings en Vivo</span>
                    <div className="h-2 w-2 rounded-full bg-v-red animate-pulse" />
                </div>
                <div className="grid gap-2">
                    {standings.map((row: any, index: number) => (
                        <div
                            key={row.profile_id}
                            onClick={() => row.profile_id !== profileId && setSelectedTeam(row)}
                            className={`flex items-center justify-between p-3 border-l-2 transition-all cursor-pointer ${
                                index === 0 ? "bg-v-red/10 border-v-red hover:bg-v-red/20" : "bg-v-white/5 border-v-white/10 hover:bg-v-white/10"
                            } ${row.profile_id === profileId ? "ring-1 ring-inset ring-v-white/20" : ""}`}
                        >
                            <div className="flex items-center gap-4">
                                <span className={`text-xl font-black italic ${index === 0 ? "text-v-red" : "text-v-white/40"}`}>
                                    #{(index + 1).toString().padStart(2, '0')}
                                </span>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-black uppercase tracking-tight italic ${row.profile_id === profileId ? "text-v-red" : "text-v-white"}`}>
                                            {row.profiles.username}
                                            {row.profile_id === profileId && " (Tú)"}
                                        </span>
                                    </div>
                                    <div className="flex gap-1 mt-1 overflow-hidden">
                                        {row.roster?.slice(0, 5).map((p: any) => {
                                            const locked = isPlayerLocked(p.id);
                                            return (
                                                <span key={p.id} className={`text-[7px] px-1.5 py-0.5 font-black uppercase italic border ${
                                                    locked ? "border-v-red/50 bg-v-red/10 text-v-red" : "border-v-white/10 bg-v-white/5 text-v-white/40"
                                                } rounded-sm whitespace-nowrap`}>
                                                    {locked && "🛡️ "}{p.nickname}
                                                </span>
                                            );
                                        })}
                                        {row.roster?.length > 5 && <span className="text-[7px] text-v-white/20 font-black flex items-center">+{row.roster.length - 5}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-black italic">{row.total_points}</span>
                                <span className="text-[10px] font-black uppercase text-v-white/20 ml-1 italic">Pts</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal de Escuadra */}
            {selectedTeam && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="v-panel max-w-lg w-full max-h-[80vh] overflow-y-auto flex flex-col p-6 gap-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black italic uppercase italic">Escuadra de {selectedTeam.profiles.username}</h2>
                                <p className="text-[8px] uppercase tracking-widest text-v-red font-black">Inteligencia de Mercado</p>
                            </div>
                            <button onClick={() => setSelectedTeam(null)} className="text-v-white/40 hover:text-v-white font-black uppercase text-[10px] tracking-widest">Cerrar</button>
                        </div>

                        <div className="grid gap-2">
                            {selectedTeam.roster?.map((player: any) => {
                                const locked = isPlayerLocked(player.id);
                                return (
                                    <div key={player.id} className={`flex items-center justify-between p-3 border-l-2 transition-all ${
                                        locked ? "bg-v-red/5 border-v-red/40" : "bg-v-white/5 border-v-white/10"
                                    }`}>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black uppercase italic tracking-tight flex items-center gap-2">
                                                {player.nickname}
                                                {locked && <span className="text-[8px] bg-v-red text-v-white px-1 leading-tight py-0.5">🛡️ BLINDADO</span>}
                                            </span>
                                            <span className="text-[9px] text-v-white/40 font-bold uppercase tracking-widest">{player.role} // {player.pro_teams?.tag || "FA"}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-[8px] font-black uppercase text-v-white/30 tracking-widest">Rescisión</p>
                                                <p className="text-sm font-black italic text-v-white">${(player.release_clause / 1000000).toFixed(1)}M</p>
                                            </div>
                                            <button 
                                                onClick={() => setConfirmPay({ player })}
                                                disabled={loading || locked}
                                                className={`px-4 py-2 text-[10px] font-black uppercase italic tracking-tighter transition-all ${
                                                    locked ? "bg-v-white/5 text-v-white/20 cursor-not-allowed" : "bg-v-white text-v-navy hover:bg-v-red hover:text-v-white"
                                                }`}
                                            >
                                                {locked ? 'Lock' : 'Fichar'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmación de Pago */}
            {confirmPay && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="v-panel max-w-xs w-full p-6 text-center space-y-6 border-t-4 border-v-red">
                        <div className="space-y-2">
                            <h3 className="text-xl font-black italic uppercase">Confirmar Cláusula</h3>
                            <p className="text-xs text-v-white/60">¿Estás seguro de pagar <span className="text-v-white font-black">${(confirmPay.player.release_clause / 1000000).toFixed(1)}M</span> por <span className="text-v-red font-black uppercase">{confirmPay.player.nickname}</span>?</p>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setConfirmPay(null)}
                                className="flex-1 py-3 text-[10px] font-black uppercase border border-white/10 hover:bg-v-white/5 transition-colors"
                            >
                                Abortar
                            </button>
                            <button 
                                onClick={() => handlePayClause(confirmPay.player)}
                                disabled={loading}
                                className="flex-1 py-3 bg-v-red text-v-white text-[10px] font-black uppercase hover:brightness-110 transition-all shadow-lg shadow-v-red/20 disabled:opacity-50"
                            >
                                CONFIRMAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
