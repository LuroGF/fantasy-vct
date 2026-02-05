"use client";

import { useState, useEffect } from "react";
import { getLeagueClassification } from "@/lib/actions/leagues";

interface LeagueDetailsProps {
    leagueId: string;
    onBack: () => void;
}

export default function LeagueDetails({ leagueId, onBack }: LeagueDetailsProps) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const classification = await getLeagueClassification(leagueId);
                setData(classification);
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        }
        load();
    }, [leagueId]);

    return (
        <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-500">
            <button 
                onClick={onBack}
                className="flex items-center gap-2 text-[10px] font-black uppercase text-v-white/40 hover:text-v-red transition-colors w-fit"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                Volver a la selección de división
            </button>

            <div className="v-panel p-6 space-y-8">
                <div className="space-y-4">
                    <h2 className="text-2xl italic uppercase tracking-tighter">Clasificación Operativa</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5 text-[8px] font-black uppercase text-v-white/20">
                                    <th className="py-2 px-2">Pos</th>
                                    <th className="py-2 px-2">Manager</th>
                                    <th className="py-2 px-2 text-right">Puntos Combat</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data.map((p, i) => (
                                    <tr key={p.profiles.id} className="group hover:bg-v-white/5 transition-colors">
                                        <td className="py-3 px-2 text-xs font-black italic text-v-red">{i + 1}</td>
                                        <td className="py-3 px-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 bg-v-navy border border-white/10 flex items-center justify-center text-[10px] font-black">
                                                    {p.profiles.username?.[0] || "?"}
                                                </div>
                                                <span className="text-xs font-black uppercase tracking-widest">{p.profiles.username}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 text-right text-sm font-black italic">{p.total_points.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6 pt-4 border-t border-white/5">
                    <h2 className="text-2xl italic uppercase tracking-tighter">Escuadras Desplegadas</h2>
                    <div className="grid gap-6">
                        {data.map((p) => (
                            <div key={p.profiles.id} className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase text-v-white/30 tracking-widest">Escuadrón de</span>
                                    <span className="text-xs font-black italic text-v-red">{p.profiles.username}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {p.roster.map((player: any) => (
                                        <div key={player.id} className="bg-v-navy/50 border border-white/5 px-3 py-2 flex flex-col min-w-[100px]">
                                            <span className="text-[8px] font-black text-v-red uppercase">{player.pro_teams?.tag || "N/A"}</span>
                                            <span className="text-[10px] font-black uppercase italic">{player.nickname}</span>
                                        </div>
                                    ))}
                                    {p.roster.length === 0 && (
                                        <p className="text-[10px] italic text-v-white/20">Sin agentes asignados todavía.</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {loading && (
                <div className="fixed inset-0 bg-v-navy/80 backdrop-blur-sm z-50 flex items-center justify-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Analizando Datos de Combate...</p>
                </div>
            )}
        </div>
    );
}
