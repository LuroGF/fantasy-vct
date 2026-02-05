"use client";

import { useState, useMemo } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { buyPlayer } from "@/lib/actions/market";
import { StatusBadge } from "@/components/StatusBadge";

interface Player {
  id: string;
  nickname: string;
  role: string;
  market_value: number;
  pro_teams: {
    tag: string;
    name: string;
  } | null;
}

interface MarketViewProps {
  initialPlayers: Player[];
  initialLeagues: any[];
  profileId: string;
}

export default function MarketView({ initialPlayers, initialLeagues, profileId }: MarketViewProps) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeLeagueId, setActiveLeagueId] = useState<string>(initialLeagues[0]?.leagues.id || "");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const activeLeague = useMemo(() => 
    initialLeagues.find(l => l.leagues.id === activeLeagueId), 
    [activeLeagueId, initialLeagues]
  );

  const filteredPlayers = useMemo(() => {
    return initialPlayers.filter((player) => {
      const matchesSearch = player.nickname.toLowerCase().includes(search.toLowerCase()) ||
                           player.pro_teams?.tag.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = !activeFilter || player.role.toUpperCase() === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [initialPlayers, search, activeFilter]);

  const roles = ["DUELISTA", "INICIADOR", "CONTROLADOR", "CENTINELA"];

  async function handleBuy(player: Player) {
    if (!activeLeagueId) {
      setStatus({ type: "error", message: "Selecciona una liga para fichar" });
      return;
    }

    setLoading(true);
    setStatus({ type: "info", message: `Sincronizando contrato de ${player.nickname}...` });

    const res = await buyPlayer(activeLeagueId, profileId, player.id, player.market_value);

    if (res.success) {
      setStatus({ type: "success", message: `¡${player.nickname} se ha unido a tu escuadra!` });
    } else {
      setStatus({ type: "error", message: res.error as string });
    }
    setLoading(false);
    setTimeout(() => setStatus({ type: "", message: "" }), 3000);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* League & Search Selector */}
      <div className="v-panel p-4 space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-[8px] font-black uppercase text-v-white/40 ml-1 tracking-[0.2em]">Operando en Liga:</label>
          <select 
            value={activeLeagueId}
            onChange={(e) => setActiveLeagueId(e.target.value)}
            className="w-full bg-v-navy/50 border border-white/10 px-4 py-2 text-xs font-black italic focus:border-v-red outline-none transition-colors"
          >
            {initialLeagues.map(l => (
              <option key={l.leagues.id} value={l.leagues.id}>{l.leagues.name} - ${ (l.current_budget / 1000000).toFixed(1) }M</option>
            ))}
            {initialLeagues.length === 0 && <option value="">No perteneces a ninguna liga</option>}
          </select>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="BUSCAR AGENTE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-v-navy border border-white/10 px-4 py-3 text-[10px] font-black tracking-widest focus:border-v-red outline-none transition-colors"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-v-white/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setActiveFilter(null)}
            className={`flex-none px-4 h-8 border text-[8px] font-black tracking-widest transition-colors ${
              !activeFilter ? "border-v-red bg-v-red text-white" : "border-white/5 bg-v-navy text-v-white/50"
            }`}
          >
            TODOS
          </button>
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setActiveFilter(activeFilter === role ? null : role)}
              className={`flex-none px-4 h-8 border text-[8px] font-black tracking-widest transition-colors ${
                activeFilter === role ? "border-v-red bg-v-red text-white" : "border-white/5 bg-v-navy text-v-white/50"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {status.message && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md animate-in slide-in-from-top-4 duration-500">
          <div className={`v-panel p-4 shadow-2xl flex items-center justify-between border-b-4 ${
            status.type === 'error' ? 'border-v-red' : 
            status.type === 'success' ? 'border-green-500' : 
            'border-v-white/20'
          }`}>
             <div className="flex items-center gap-3">
               <div className={`w-2 h-2 animate-pulse ${status.type === 'success' ? 'bg-green-500' : 'bg-v-red'}`} />
               <p className="text-[10px] font-black uppercase tracking-widest leading-tight">
                 {status.message}
               </p>
             </div>
             <button onClick={() => setStatus({ type: "", message: "" })} className="text-v-white/20 hover:text-v-white">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {filteredPlayers.map((player) => (
          <PlayerCard 
            key={player.id} 
            player={player} 
            onAction={() => handleBuy(player)}
            actionLabel={loading ? "PROCESANDO..." : "Asignar Contrato"}
          />
        ))}

        {filteredPlayers.length === 0 && (
          <div className="text-center py-12 v-panel border-v-white/10 opacity-40 italic">
            <p className="text-v-white text-sm">No se encontraron agentes bajo estos filtros.</p>
            <button 
              onClick={() => { setSearch(""); setActiveFilter(null); }}
              className="text-[10px] font-black uppercase text-v-red mt-2 underline not-italic"
            >
              Limpiar Búsqueda
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
