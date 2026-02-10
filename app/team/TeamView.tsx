"use client";

import { useState, useMemo, useEffect } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { setStarterStatus, getUserFullRoster } from "@/lib/actions/roster";
import { sellPlayer } from "@/lib/actions/market";
import Link from "next/link";
import { haptic } from "@/lib/utils/haptics";

interface TeamViewProps {
  initialRoster: any[];
  initialLeagues: any[];
  profileId: string;
  initialInventory: any[];
  initialActivePowerUps: any[];
  activeGameweekId?: any;
  hasScoutActive?: boolean;
}

export default function TeamView({ 
  initialRoster, 
  initialLeagues, 
  profileId, 
  initialInventory, 
  initialActivePowerUps, 
  activeGameweekId,
  hasScoutActive = false
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

  // Grouping by slot type
  const starters = useMemo(() => roster.filter(r => r.slot_type === 'starter'), [roster]);
  const substitutes = useMemo(() => roster.filter(r => r.slot_type === 'substitute'), [roster]);
  const bench = useMemo(() => roster.filter(r => r.slot_type === 'bench'), [roster]);

  const isLocked = (playerId: string) => {
    return activePowerUps.some(ap => ap.target_player_id === playerId && ap.powerup_types?.code === 'LOCK');
  };

  const isCaptain = (playerId: string) => {
    return activePowerUps.some(ap => ap.target_player_id === playerId && ap.powerup_types?.code === 'CAPTAIN');
  };

  async function handleActivate(powerUpTypeId: string, targetPlayerId?: string) {
    haptic.medium();
    setLoading(true);
    const { activatePowerUp } = await import("@/lib/actions/inventory");
    const res = await activatePowerUp(activeLeagueId, profileId, powerUpTypeId, targetPlayerId);

    if (res.success) {
      haptic.success();
      setStatus({ type: "success", message: res.message || "Carta activada" });
      window.location.reload(); 
    } else {
      haptic.error();
      setStatus({ type: "error", message: res.error as string });
    }
    setSelectedPowerUp(null);
    setLoading(false);
  }

  async function handleSlotChange(player_id: string, nickname: string, newSlot: 'starter' | 'substitute' | 'bench') {
    haptic.medium();
    setLoading(true);
    const res = await setStarterStatus(activeLeagueId, profileId, player_id, newSlot);
    
    if (res.success) {
      haptic.success();
      setRoster(prev => prev.map(r => 
        r.player_id === player_id ? { ...r, slot_type: newSlot, is_starter: newSlot === 'starter' } : r
      ));
      setStatus({ 
        type: "success", 
        message: `${nickname} movido a ${newSlot === 'starter' ? 'Titulares' : newSlot === 'substitute' ? 'Suplentes' : 'Banquillo'}` 
      });
    } else {
      haptic.error();
      setStatus({ type: "error", message: res.error as string });
    }
    setLoading(false);
  }

  async function handleSell(player: any) {
    haptic.warning();
    if (!window.confirm(`¿Estás seguro de que quieres vender a ${player.nickname}?`)) {
      return;
    }

    haptic.heavy();
    setLoading(true);
    const res = await sellPlayer(activeLeagueId, profileId, player.id);

    if (res.success) {
      haptic.success();
      setRoster(prev => prev.filter(r => r.player_id !== player.id));
      setLeagues(prev => prev.map(l => 
        l.leagues.id === activeLeagueId ? { 
          ...l, 
          current_budget: Number(l.current_budget) + Math.floor(player.market_value * 0.9)
        } : l
      ));
      setStatus({ type: "success", message: `${player.nickname} ha dejado la escuadra.` });
    } else {
      haptic.error();
      setStatus({ type: "error", message: res.error as string });
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Selector de Liga */}
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
               <p className="text-[7px] font-black uppercase text-v-white/40 mb-1">Agentes Totales</p>
               <p className="text-sm font-black italic">{roster.length} / 15</p>
            </div>
          </div>
        )}
      </div>

      {status.message && (
        <div className={`v-panel p-3 text-[10px] font-black uppercase text-center tracking-widest animate-in slide-in-from-top-2 duration-300 ${
          status.type === 'error' ? 'border-v-red text-v-red' : 
          status.type === 'success' ? 'border-green-500 text-green-500' :
          'border-v-white/20 text-v-white/50'
        }`}>
           {">>>"} {status.message}
        </div>
      )}

      {/* Titulares (5) */}
      <div className="space-y-4">
        <h2 className="text-2xl italic tracking-tighter uppercase px-1">Quinteto Titular <span className="text-sm font-black text-v-red ml-2">{starters.length}/5</span></h2>
        <div className="grid gap-3">
          {starters.map((r) => (
            <div key={r.player_id} className="border-l-4 border-v-red pl-2">
                <PlayerCard 
                  player={{...r.pro_players, releaseClause: r.release_clause}} 
                  onAction={selectedPowerUp ? () => handleActivate(selectedPowerUp.powerup_types.id, r.player_id) : () => handleSlotChange(r.player_id, r.pro_players.nickname, 'substitute')}
                  actionLabel={selectedPowerUp ? `Aplicar ${selectedPowerUp.powerup_types.icon}` : "A Suplentes"}
                  onSecondAction={() => handleSell(r.pro_players)}
                  secondActionLabel="Vender"
                  secondActionClassName="text-v-red hover:bg-v-red/10"
                  isLocked={isLocked(r.player_id)}
                  isCaptain={isCaptain(r.player_id)}
                />
            </div>
          ))}
          {starters.length < 5 && Array.from({ length: 5 - starters.length }).map((_, i) => (
            <div key={`empty-s-${i}`} className="v-panel border-dashed border-v-white/10 h-24 flex items-center justify-center opacity-30">
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">Espacio Titular</p>
            </div>
          ))}
        </div>
      </div>

      {/* Suplentes (4) */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <h2 className="text-2xl italic tracking-tighter uppercase px-1 text-v-white/70">Suplentes Próx. Jornada <span className="text-sm font-black text-v-red ml-2">{substitutes.length}/4</span></h2>
        <div className="grid gap-3">
          {substitutes.map((r) => (
            <div key={r.player_id} className="border-l-4 border-v-white/50 pl-2">
                <PlayerCard 
                  player={{...r.pro_players, releaseClause: r.release_clause}} 
                  onAction={selectedPowerUp ? () => handleActivate(selectedPowerUp.powerup_types.id, r.player_id) : () => handleSlotChange(r.player_id, r.pro_players.nickname, 'starter')}
                  actionLabel={selectedPowerUp ? `Aplicar ${selectedPowerUp.powerup_types.icon}` : "Ascender a Titular"}
                  onSecondAction={() => handleSlotChange(r.player_id, r.pro_players.nickname, 'bench')}
                  secondActionLabel="A Banquillo"
                  isLocked={isLocked(r.player_id)}
                />
            </div>
          ))}
          {substitutes.length < 4 && Array.from({ length: 4 - substitutes.length }).map((_, i) => (
            <div key={`empty-sub-${i}`} className="v-panel border-dashed border-v-white/10 h-24 flex items-center justify-center opacity-20">
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">Espacio Suplente</p>
            </div>
          ))}
        </div>
      </div>

      {/* Banquillo (Resto) */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <h2 className="text-2xl italic tracking-tighter uppercase px-1 opacity-40">Banquillo General</h2>
        <div className="grid gap-4">
          {bench.map((r) => (
            <div key={r.player_id} className="opacity-70 contrast-75 hover:opacity-100 transition-all border-l-4 border-white/20 pl-2">
                <PlayerCard 
                  player={{...r.pro_players, releaseClause: r.release_clause}} 
                  onAction={() => handleSlotChange(r.player_id, r.pro_players.nickname, 'substitute')}
                  actionLabel="A Suplentes"
                  onSecondAction={() => handleSell(r.pro_players)}
                  secondActionLabel="Vender"
                  secondActionClassName="text-v-red hover:bg-v-red/10"
                />
            </div>
          ))}
          {bench.length === 0 && (
             <div className="v-panel border-white/5 py-4 text-center opacity-30 text-[10px] uppercase font-black tracking-widest">
               Banquillo Vacío
             </div>
          )}
        </div>
      </div>
    </div>
  );
}



