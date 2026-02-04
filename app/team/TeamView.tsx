"use client";

import { useState, useMemo } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { togglePlayerStatus } from "@/lib/actions/roster";
import { StatusBadge } from "@/components/StatusBadge";
import Link from "next/link";

interface TeamViewProps {
  initialRoster: any[];
  initialLeagues: any[];
  profileId: string;
}

export default function TeamView({ initialRoster, initialLeagues, profileId }: TeamViewProps) {
  const [roster, setRoster] = useState(initialRoster);
  const [activeLeagueId, setActiveLeagueId] = useState(initialLeagues[0]?.leagues.id || "");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const activeLeague = useMemo(() => 
    initialLeagues.find(l => l.leagues.id === activeLeagueId), 
    [activeLeagueId, initialLeagues]
  );

  const activePlayers = useMemo(() => roster.filter(r => r.is_active), [roster]);
  const inactivePlayers = useMemo(() => roster.filter(r => !r.is_active), [roster]);

  async function handleToggle(player_id: string, nickname: string) {
    setLoading(true);
    const res = await togglePlayerStatus(activeLeagueId, profileId, player_id);

    if (res.success) {
      setRoster(prev => prev.map(r => 
        r.player_id === player_id ? { ...r, is_active: res.newStatus } : r
      ));
      setStatus({ 
        type: "success", 
        message: res.newStatus ? `${nickname} ahora es titular` : `${nickname} ahora es suplente` 
      });
    } else {
      setStatus({ type: "error", message: res.error as string });
    }
    setLoading(false);
    setTimeout(() => setStatus({ type: "", message: "" }), 4000);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Selector de Liga */}
      <div className="v-panel p-4 flex flex-col gap-2">
        <label className="text-[8px] font-black uppercase text-v-white/40 ml-1 tracking-[0.2em]">Escuadra Operativa en:</label>
        <select 
          value={activeLeagueId}
          onChange={(e) => setActiveLeagueId(e.target.value)}
          className="w-full bg-v-navy/50 border border-white/10 px-4 py-2 text-xs font-black italic focus:border-v-red outline-none transition-colors"
        >
          {initialLeagues.map(l => (
            <option key={l.leagues.id} value={l.leagues.id}>{l.leagues.name}</option>
          ))}
        </select>
      </div>

      {status.message && (
        <div className={`v-panel p-3 text-[10px] font-black uppercase text-center tracking-widest animate-in slide-in-from-top-2 duration-300 ${
          status.type === 'error' ? 'border-v-red text-v-red' : 'border-green-500 text-green-500'
        }`}>
           {">>>"} {status.message}
        </div>
      )}

      {/* Titulares (Max 5) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-2xl italic tracking-tighter uppercase">5 Titulares <span className="text-sm font-black text-v-red ml-2">{activePlayers.length}/5</span></h2>
        </div>
        
        <div className="grid gap-3">
          {activePlayers.map((r) => (
            <PlayerCard 
              key={r.player_id} 
              player={r.pro_players} 
              onAction={() => handleToggle(r.player_id, r.pro_players.nickname)}
              actionLabel="Poner Suplente"
            />
          ))}

          {activePlayers.length < 5 && Array.from({ length: 5 - activePlayers.length }).map((_, i) => (
            <div key={`empty-${i}`} className="v-panel border-dashed border-v-white/10 h-24 flex items-center justify-center opacity-30">
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">Espacio Vacante</p>
            </div>
          ))}
        </div>
      </div>

      {/* Suplentes/Plantilla */}
      <div className="space-y-4 pt-4">
        <h2 className="text-2xl italic tracking-tighter uppercase px-1 opacity-50">Plantilla Disponible</h2>
        <div className="grid gap-4 opacity-70 grayscale hover:grayscale-0 transition-all">
          {inactivePlayers.map((r) => (
            <PlayerCard 
              key={r.player_id} 
              player={r.pro_players} 
              onAction={() => handleToggle(r.player_id, r.pro_players.nickname)}
              actionLabel="Pasar a Titular"
            />
          ))}

          {inactivePlayers.length === 0 && (
             <div className="v-panel border-white/5 py-8 text-center opacity-40">
               <p className="text-xs italic">No tienes más agentes en reserva.</p>
               <Link href="/market" className="text-[10px] font-black text-v-red uppercase mt-2 block underline">Ir al Mercado</Link>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
