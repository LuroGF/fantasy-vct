"use client";

import { useState, useMemo, useEffect } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { togglePlayerStatus, getUserFullRoster } from "@/lib/actions/roster";
import { sellPlayer } from "@/lib/actions/market";
import { StatusBadge } from "@/components/StatusBadge";
import Link from "next/link";

const MAX_TRANSFERS = 3;

interface TeamViewProps {
  initialRoster: any[];
  initialLeagues: any[];
  profileId: string;
  initialInventory: any[];
  initialActivePowerUps: any[];
  activeGameweekId?: any;
}

export default function TeamView({ 
  initialRoster, 
  initialLeagues, 
  profileId, 
  initialInventory, 
  initialActivePowerUps, 
  activeGameweekId 
}: TeamViewProps) {
  const [roster, setRoster] = useState(initialRoster);
  const [activeLeagueId, setActiveLeagueId] = useState(initialLeagues[0]?.leagues.id || "");
  const [leagues, setLeagues] = useState(initialLeagues);
  const [inventory, setInventory] = useState(initialInventory);
  const [activePowerUps, setActivePowerUps] = useState(initialActivePowerUps);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [selectedPowerUp, setSelectedPowerUp] = useState<any>(null);

  const activeParticipation = useMemo(() => 
    leagues.find(l => l.leagues.id === activeLeagueId), 
    [activeLeagueId, leagues]
  );

  useEffect(() => {
    async function loadRoster() {
      setLoading(true);
      const data = await getUserFullRoster(activeLeagueId, profileId);
      setRoster(data);
      setLoading(false);
    }
    if (activeLeagueId) loadRoster();
  }, [activeLeagueId, profileId]);

  const activePlayers = useMemo(() => roster.filter(r => r.is_active), [roster]);
  const inactivePlayers = useMemo(() => roster.filter(r => !r.is_active), [roster]);

  const isLocked = (playerId: string) => {
    return activePowerUps.some(ap => ap.target_player_id === playerId && ap.powerup_types?.code === 'LOCK');
  };

  const isCaptain = (playerId: string) => {
    return activePowerUps.some(ap => ap.target_player_id === playerId && ap.powerup_types?.code === 'CAPTAIN');
  };

  async function handleActivate(powerUpTypeId: string, targetPlayerId?: string) {
    setLoading(true);
    const { activatePowerUp } = await import("@/lib/actions/inventory");
    const res = await activatePowerUp(activeLeagueId, profileId, powerUpTypeId, targetPlayerId);

    if (res.success) {
      setStatus({ type: "success", message: res.message || "Carta activada" });
      // Refresh local state (this is simplified, ideally refetch)
      window.location.reload(); 
    } else {
      setStatus({ type: "error", message: res.error as string });
    }
    setSelectedPowerUp(null);
    setLoading(false);
  }

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
  }

  async function handleSell(player: any) {
    if (!window.confirm(`¿Estás seguro de que quieres vender a ${player.nickname} por $${(player.market_value / 1000000).toFixed(1)}M?`)) {
      return;
    }

    setLoading(true);
    setStatus({ type: "info", message: `Procesando rescisión de contrato de ${player.nickname}...` });

    const res = await sellPlayer(activeLeagueId, profileId, player.id, player.market_value);

    if (res.success) {
      setRoster(prev => prev.filter(r => r.player_id !== player.id));
      setLeagues(prev => prev.map(l => 
        l.leagues.id === activeLeagueId ? { 
          ...l, 
          current_budget: Number(l.current_budget) + player.market_value,
          transfers_made_this_week: (l.transfers_made_this_week || 0) + 1
        } : l
      ));
      setStatus({ type: "success", message: `${player.nickname} ha dejado la escuadra.` });
    } else {
      setStatus({ type: "error", message: res.error as string });
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Selector de Liga y Status */}
      <div className="v-panel p-4 space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-[8px] font-black uppercase text-v-white/40 ml-1 tracking-[0.2em]">Escuadra Operativa en:</label>
          <select 
            value={activeLeagueId}
            onChange={(e) => setActiveLeagueId(e.target.value)}
            className="w-full bg-v-navy/50 border border-white/10 px-4 py-2 text-xs font-black italic focus:border-v-red outline-none transition-colors"
          >
            {leagues.map(l => (
              <option key={l.leagues.id} value={l.leagues.id}>{l.leagues.name}</option>
            ))}
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
                 <span className={activeParticipation.transfers_made_this_week >= MAX_TRANSFERS ? "text-v-red" : "text-green-500"}>
                   {activeParticipation.transfers_made_this_week || 0}
                 </span>
                 <span className="text-v-white/20 text-[10px] ml-1">/ {MAX_TRANSFERS}</span>
               </p>
            </div>
          </div>
        )}
      </div>

      {/* Inventario de Cartas */}
      {inventory.length > 0 && (
        <div className="space-y-3">
           <h2 className="text-xs font-black uppercase text-v-white/40 tracking-[0.3em] px-1">Artículos Disponibles</h2>
           <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {inventory.map((item) => (
                <button 
                  key={item.id}
                  onClick={() => {
                    if (item.powerup_types.code === 'MONEY') {
                        handleActivate(item.powerup_types.id);
                    } else {
                        setSelectedPowerUp(item);
                    }
                  }}
                  className={`flex-shrink-0 v-panel p-3 flex flex-col items-center gap-1 min-w-[100px] border-v-white/5 hover:border-v-red/50 transition-all ${selectedPowerUp?.id === item.id ? 'border-v-red bg-v-red/5' : ''}`}
                >
                  <span className="text-2xl">{item.powerup_types.icon}</span>
                  <p className="text-[10px] font-black uppercase italic whitespace-nowrap">{item.powerup_types.name}</p>
                  <span className="text-[8px] opacity-50 font-bold">x{item.quantity}</span>
                </button>
              ))}
           </div>
        </div>
      )}

      {selectedPowerUp && (
          <div className="v-panel p-4 bg-v-red/5 border-v-red animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                   <h3 className="text-sm font-black uppercase italic text-v-red">Activando: {selectedPowerUp.powerup_types.name}</h3>
                   <p className="text-[10px] opacity-70">Selecciona un agente de tu escuadra para aplicar el efecto.</p>
                </div>
                <button onClick={() => setSelectedPowerUp(null)} className="text-v-white/50 hover:text-v-white">Cerrar</button>
              </div>
          </div>
      )}

      {status.message && (
        <div className={`v-panel p-3 text-[10px] font-black uppercase text-center tracking-widest animate-in slide-in-from-top-2 duration-300 ${
          status.type === 'error' ? 'border-v-red text-v-red' : 
          status.type === 'success' ? 'border-green-500 text-green-500' :
          'border-v-white/20 text-v-white/50'
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
              player={{
                ...r.pro_players,
                releaseClause: r.release_clause
              }} 
              onAction={selectedPowerUp ? () => handleActivate(selectedPowerUp.powerup_types.id, r.player_id) : () => handleToggle(r.player_id, r.pro_players.nickname)}
              actionLabel={selectedPowerUp ? `Aplicar ${selectedPowerUp.powerup_types.icon}` : "Suplente"}
              onSecondAction={() => handleSell(r.pro_players)}
              secondActionLabel="Vender"
              secondActionClassName="text-v-red hover:bg-v-red/10"
              isLocked={isLocked(r.player_id)}
              isCaptain={isCaptain(r.player_id)}
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
        <div className="grid gap-4">
          {inactivePlayers.map((r) => (
            <div key={r.player_id} className="opacity-70 contrast-75 hover:opacity-100 hover:contrast-100 transition-all">
                <PlayerCard 
                  player={{
                    ...r.pro_players,
                    releaseClause: r.release_clause
                  }} 
                  onAction={selectedPowerUp ? () => handleActivate(selectedPowerUp.powerup_types.id, r.player_id) : () => handleToggle(r.player_id, r.pro_players.nickname)}
                  actionLabel={selectedPowerUp ? `Aplicar ${selectedPowerUp.powerup_types.icon}` : "Titular"}
                  onSecondAction={() => handleSell(r.pro_players)}
                  secondActionLabel="Vender"
                  secondActionClassName="text-v-red hover:bg-v-red/10"
                  isLocked={isLocked(r.player_id)}
                  isCaptain={isCaptain(r.player_id)}
                />
            </div>
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
