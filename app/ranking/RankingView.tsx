
"use client";

import { useState } from "react";
import { payClause } from "@/lib/actions/market";
import { haptic } from "@/lib/utils/haptics";
import { useRouter } from "next/navigation";

export function RankingView({ standings, profileId, activeLeagueId }: { standings: any[], profileId: string, activeLeagueId: string }) {
    const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const router = useRouter();

    const handlePayClause = async (player: any) => {
        if (!activeLeagueId || !profileId || !selectedTeam) return;

        const confirm = window.confirm(`¿Seguro que quieres pagar la cláusula de $${(player.release_clause / 1000000).toFixed(1)}M por ${player.nickname}?`);
        if (!confirm) return;

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
                            className={`flex items-center justify-between p-3 border-l-2 ${index === 0 ? "bg-v-red/10 border-v-red" : "bg-v-white/5 border-v-white/10"
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <span className={`text-xl font-black italic ${index === 0 ? "text-v-red" : "text-v-white/40"}`}>
                                    #{(index + 1).toString().padStart(2, '0')}
                                </span>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-black uppercase tracking-tight italic">
                                            {row.profiles.username}
                                        </span>
                                        {row.profile_id !== profileId && (
                                            <button
                                                onClick={() => setSelectedTeam(row)}
                                                className="text-[8px] font-black uppercase text-v-red hover:underline tracking-tighter"
                                            >
                                                [Ver Escuadra]
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-1 mt-1">
                                        {row.roster?.slice(0, 5).map((p: any) => (
                                            <span key={p.id} className="text-[8px] px-1 bg-v-white/5 text-v-white/40 rounded">
                                                {p.nickname}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-black italic">{row.total_points}</span>
                                <span className="text-[10px] font-black uppercase text-v-white/20 ml-1">Pts</span>
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

                        <div className="grid gap-3">
                            {selectedTeam.roster?.map((player: any) => (
                                <div key={player.id} className="flex items-center justify-between p-3 bg-v-white/5 border-l border-v-white/10">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black uppercase italic tracking-tight">{player.nickname}</span>
                                        <span className="text-[9px] text-v-white/40 font-bold uppercase">{player.role}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-[8px] font-black uppercase text-v-white/30 tracking-widest">Cláusula</p>
                                            <p className="text-sm font-black italic text-v-red">${(player.release_clause / 1000000).toFixed(1)}M</p>
                                        </div>
                                        <button 
                                            onClick={() => handlePayClause(player)}
                                            disabled={loading}
                                            className="v-btn-red text-[10px] px-3 py-1.5 font-black uppercase italic tracking-tighter disabled:opacity-50"
                                        >
                                            Pagar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
