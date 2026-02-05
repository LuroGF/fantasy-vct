"use client";

import { useState, useMemo } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { buyPlayer } from "@/lib/actions/market";
import { StatusBadge } from "@/components/StatusBadge";

const MAX_TRANSFERS = 3;

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
  initialLeagueRosters: any[];
  initialShieldedPlayerIds: string[];
  hasScoutActive?: boolean;
}

export default function MarketView({ 
  initialPlayers, 
  initialLeagues, 
  profileId,
  initialLeagueRosters,
  initialShieldedPlayerIds,
  hasScoutActive = false
}: MarketViewProps) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeLeagueId, setActiveLeagueId] = useState<string>(initialLeagues[0]?.league_id || initialLeagues[0]?.leagues?.id || "");
  const [leagues, setLeagues] = useState(initialLeagues);
  const [leagueRosters, setLeagueRosters] = useState(initialLeagueRosters);
  const [shieldedPlayerIds, setShieldedPlayerIds] = useState(initialShieldedPlayerIds);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  // Dynamic Limit based on SCOUT power-up
  const weeklyLimit = hasScoutActive ? 4 : 3;

  const activeParticipation = useMemo(() => 
    leagues.find(l => l.leagues.id === activeLeagueId), 
    [activeLeagueId, leagues]
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

  const getOwnershipInfo = (playerId: string) => {
    const owner = leagueRosters.find((r: any) => r.player_id === playerId);
    return owner ? {
      ownerName: owner.profiles.username,
      ownerId: owner.profile_id,
      releaseClause: owner.release_clause,
      isShielded: shieldedPlayerIds.includes(playerId)
    } : null;
  };

  async function handlePayClause(player: Player, ownerId: string, clauseAmount: number) {
    if (!window.confirm(`¿Quieres pagar la cláusula de $${(clauseAmount / 1000000).toFixed(1)}M para fichar a ${player.nickname}?`)) {
      return;
    }

    setLoading(true);
    const { payClause } = await import("@/lib/actions/market");
    const res = await payClause(activeLeagueId, profileId, player.id);

    if (res.success) {
      setStatus({ type: "success", message: `¡Has ejecutado la cláusula de ${player.nickname}!` });
      window.location.reload();
    } else {
      setStatus({ type: "error", message: res.error as string });
    }
    setLoading(false);
  }

  async function handleBuy(player: Player) {
    if (!activeLeagueId) {
      setStatus({ type: "error", message: "Selecciona una liga para fichar" });
      return;
    }

    if (activeParticipation && activeParticipation.transfers_made_this_week >= weeklyLimit) {
       setStatus({ type: "error", message: `Has alcanzado el límite de ${weeklyLimit} transferencias esta semana.` });
       return;
    }

    setLoading(true);
    setStatus({ type: "info", message: `Sincronizando contrato de ${player.nickname}...` });

    const res = await buyPlayer(activeLeagueId, profileId, player.id, player.market_value);

    if (res.success) {
      setStatus({ type: "success", message: `¡${player.nickname} se ha unido a tu escuadra!` });
      // Actualizar localmente
      setLeagues(prev => prev.map(l => 
        l.leagues.id === activeLeagueId ? { 
          ...l, 
          current_budget: Number(l.current_budget) - player.market_value,
          transfers_made_this_week: (l.transfers_made_this_week || 0) + 1
        } : l
      ));
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
            {leagues.map(l => (
              <option key={l.leagues.id} value={l.leagues.id}>{l.leagues.name}</option>
            ))}
            {leagues.length === 0 && <option value="">No perteneces a ninguna liga</option>}
          </select>
        </div>

        {activeParticipation && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
            <div className="bg-v-navy/30 p-2 border-l-2 border-v-red">
               <p className="text-[7px] font-black uppercase text-v-white/40 mb-1">Presupuesto</p>
               <p className="text-sm font-black italic">${(activeParticipation.current_budget / 1000000).toFixed(1)}M</p>
            </div>
            <div className="bg-v-navy/30 p-2 border-l-2 border-v-white/20">
               <p className="text-[7px] font-black uppercase text-v-white/40 mb-1">Transferencias Semana</p>
               <p className="text-sm font-black italic">
                 <span className={activeParticipation.transfers_made_this_week >= weeklyLimit ? "text-v-red" : "text-green-500"}>
                   {activeParticipation.transfers_made_this_week || 0}
                 </span>
                 <span className="text-v-white/20 text-[10px] ml-1">/ {weeklyLimit}</span>
               </p>
            </div>
          </div>
        )}

        <div className="relative pt-2">
          <input
            type="text"
            placeholder="BUSCAR AGENTE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-v-navy border border-white/10 px-4 py-3 text-[10px] font-black tracking-widest focus:border-v-red outline-none transition-colors"
          />
          <div className="absolute right-4 top-[calc(50%+4px)] -translate-y-1/2 text-v-white/20">
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
        {filteredPlayers.map((player) => {
          const ownerInfo = getOwnershipInfo(player.id);
          const isOwnPlayer = ownerInfo?.ownerId === profileId;
          
          let actionBtnLabel = "Asignar Contrato";
          let actionFn = () => handleBuy(player);
          let secondLabel = undefined;
          let secondFn = undefined;

          if (isOwnPlayer) {
              actionBtnLabel = "En tu Escuadra";
              actionFn = async () => {};
          } else if (ownerInfo) {
              actionBtnLabel = ownerInfo.isShielded ? "Protegido con Candado" : "Pagar Cláusula";
              actionFn = ownerInfo.isShielded ? async () => {} : async () => handlePayClause(player, ownerInfo.ownerId, ownerInfo.releaseClause);
              secondLabel = `Propiedad de ${ownerInfo.ownerName}`;
          }

          return (
            <PlayerCard 
              key={player.id} 
              player={{
                ...player,
                releaseClause: ownerInfo?.releaseClause
              }} 
              onAction={loading ? undefined : actionFn}
              actionLabel={loading ? "PROCESANDO..." : actionBtnLabel}
              onSecondAction={secondFn}
              secondActionLabel={secondLabel}
              secondActionClassName="text-[8px] opacity-40 italic border-none pointer-events-none"
              isLocked={ownerInfo?.isShielded}
            />
          );
        })}

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
