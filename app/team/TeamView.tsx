"use client";

import { useState, useMemo, useEffect } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { setStarterStatus, getUserFullRoster } from "@/lib/actions/roster";
import Link from "next/link";
import { haptic } from "@/lib/utils/haptics";
import { useRouter } from "next/navigation";
import { FeedbackBanner } from "@/components/FeedbackBanner";

interface TeamViewProps {
  initialRoster: any[];
  initialLeagues: any[];
  profileId: string;
  initialInventory: any[];
  initialActivePowerUps: any[];
  activeGameweekId?: any;
  hasScoutActive?: boolean;
  casters?: any[];
  initialActiveCasters?: any[];
}

export default function TeamView({ 
  initialRoster, 
  initialLeagues, 
  profileId, 
  initialInventory, 
  initialActivePowerUps, 
  activeGameweekId,
  hasScoutActive = false,
  casters = [],
  initialActiveCasters = [],
}: TeamViewProps) {
  const [roster, setRoster] = useState(initialRoster);
  const [activeLeagueId, setActiveLeagueId] = useState(initialLeagues[0]?.leagues.id || "");
  const [leagues, setLeagues] = useState(initialLeagues);
  const router = useRouter();
  const [inventory, setInventory] = useState(initialInventory);
  const [activePowerUps, setActivePowerUps] = useState(initialActivePowerUps);
  const [activeCasters, setActiveCasters] = useState(initialActiveCasters);
  const [availableCasters, setAvailableCasters] = useState(casters);
  const [status, setStatus] = useState<{ type: string; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [selectedPowerUp, setSelectedPowerUp] = useState<any>(null);
  const [selectedCaster, setSelectedCaster] = useState<any>(null);
  
  const [auctionDialog, setAuctionDialog] = useState<{ show: boolean; player: any | null; price: string }>({
    show: false,
    player: null,
    price: ""
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; title: string; message: string; onConfirm: (() => void) | null }>({
    show: false,
    title: "",
    message: "",
    onConfirm: null
  });

  const activeParticipation = useMemo(() => 
    leagues.find(l => l.leagues.id === activeLeagueId), 
    [activeLeagueId, leagues]
  );
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { getUserFullRoster } = await import("@/lib/actions/roster");
      const { fetchActiveAuctions } = await import("@/lib/actions/market");
      const { getUserInventory, getActivePowerUps } = await import("@/lib/actions/inventory");
      const { getActiveCasters, getCasters } = await import("@/lib/actions/casters");
      
      const [rosterData, auctionsData, inventoryData, powerUpsData, activeCasterData, casterList] = await Promise.all([
        getUserFullRoster(activeLeagueId, profileId),
        fetchActiveAuctions(activeLeagueId),
        getUserInventory(activeLeagueId, profileId),
        getActivePowerUps(activeLeagueId, profileId),
        activeGameweekId ? getActiveCasters(activeLeagueId, profileId, activeGameweekId) : Promise.resolve([]),
        getCasters()
      ]);
      
      setRoster(rosterData);
      setAuctions(auctionsData);
      setInventory(inventoryData);
      setActivePowerUps(powerUpsData);
      setActiveCasters(activeCasterData);
      setAvailableCasters(casterList);
      setLoading(false);
    }
    if (activeLeagueId) loadData();
  }, [activeLeagueId, profileId, activeGameweekId, refreshTrigger]);

  async function handleHireCaster(casterId: string, nickname: string) {
    setConfirmDialog({
      show: true,
      title: "Contratar Analista",
      message: `¿Deseas contratar a ${nickname} para tu mesa de análisis por esta jornada?`,
      onConfirm: async () => {
        haptic.medium();
        setLoading(true);
        const { hireCaster } = await import("@/lib/actions/casters");
        const res = await hireCaster(activeLeagueId, profileId, activeGameweekId, casterId);

        if (res.success) {
          haptic.success();
          setStatus({ type: "success", message: `Contrato firmado con ${nickname}` });
          setSelectedCaster(null);
          setRefreshTrigger(prev => prev + 1);
          router.refresh(); // Replace reload with refresh
        } else {
          haptic.error();
          setStatus({ type: "error", message: res.error as string });
        }
        setLoading(false);
      }
    });
  }

  // Grouping by slot type
  const starters = useMemo(() => roster.filter(r => r.slot_type === 'starter'), [roster]);
  const substitutes = useMemo(() => roster.filter(r => r.slot_type === 'substitute'), [roster]);

  const isLocked = (playerId: string) => {
    return activePowerUps.some(ap => ap.target_player_id === playerId && ap.powerup_types?.code === 'LOCK');
  };

  const isCaptain = (playerId: string) => {
    return activePowerUps.some(ap => ap.target_player_id === playerId && ap.powerup_types?.code === 'CAPTAIN');
  };

  const getBoostedRoles = useMemo(() => {
    return activeCasters.map(ac => {
      const code = ac.casters.buff_code;
      if (code === 'KAQUKA_TACTICS') return 'Iniciador';
      if (code === 'URI_CONTROL') return 'Centinela';
      if (code === 'IKER_HEROIC') return 'Duelista';
      if (code === 'LUIGI_STATS') return 'Controlador';
      return null;
    }).filter(Boolean);
  }, [activeCasters]);

  const hasUlisesBoost = useMemo(() => activeCasters.some(ac => ac.casters.buff_code === 'ULISES_HYPE'), [activeCasters]);

  async function handleActivate(powerUpTypeId: string, targetPlayerId?: string) {
    setConfirmDialog({
      show: true,
      title: "Activar Carta",
      message: "¿Confirmar activación de carta de poder?",
      onConfirm: async () => {
        haptic.medium();
        setLoading(true);
        const { activatePowerUp } = await import("@/lib/actions/inventory");
        const res = await activatePowerUp(activeLeagueId, profileId, powerUpTypeId, targetPlayerId);

        if (res.success) {
          haptic.success();
          setStatus({ type: "success", message: res.message || "Carta activada" });
          setRefreshTrigger(prev => prev + 1);
          router.refresh();
        } else {
          haptic.error();
          setStatus({ type: "error", message: res.error as string });
        }
        setSelectedPowerUp(null);
        setLoading(false);
      }
    });
  }

  async function handleSlotChange(player_id: string, nickname: string, newSlot: 'starter' | 'substitute') {
    const actionText = newSlot === 'starter' ? 'Ascender a Titular' : 'Mover a Suplentes';
    
    setConfirmDialog({
      show: true,
      title: actionText,
      message: `¿Deseas mover a ${nickname} a ${newSlot === 'starter' ? 'Titulares' : 'Suplentes'}?`,
      onConfirm: async () => {
        haptic.medium();
        setLoading(true);
        // Check limits
        if (newSlot === 'starter' && starters.length >= 5) {
            setStatus({ type: "error", message: "Máximo 5 titulares." });
            setLoading(false);
            return;
        }
        if (newSlot === 'substitute' && substitutes.length >= 5) {
            setStatus({ type: "error", message: "Máximo 5 suplentes." });
            setLoading(false);
            return;
        }

        const { setStarterStatus } = await import("@/lib/actions/roster");
        const res = await setStarterStatus(activeLeagueId, profileId, player_id, newSlot);
        
        if (res.success) {
          haptic.success();
          setRoster(prev => prev.map(r => 
            r.player_id === player_id ? { ...r, slot_type: newSlot, is_starter: newSlot === 'starter' } : r
          ));
          setRefreshTrigger(prev => prev + 1);
          router.refresh(); // Sync potential swaps
          setStatus({ 
            type: "success", 
            message: `${nickname} movido a ${newSlot === 'starter' ? 'Titulares' : 'Suplentes'}` 
          });
        } else {
          haptic.error();
          setStatus({ type: "error", message: res.error as string });
        }
        setLoading(false);
      }
    });
  }

  async function handleSell(player: any) {
    haptic.warning();
    setAuctionDialog({
      show: true,
      player: player,
      price: (player.market_value / 1000000).toFixed(1)
    });
  }

  async function confirmAuction() {
    if (!auctionDialog.player) return;

    const player = auctionDialog.player;
    const minPrice = Math.floor(player.market_value * 0.8);
    const maxPrice = Math.floor(player.market_value * 1.15);
    const startingPrice = Math.floor(parseFloat(auctionDialog.price) * 1000000);
    
    if (isNaN(startingPrice) || startingPrice <= 0) {
      haptic.error();
      setStatus({ type: "error", message: "Precio inválido" });
      return;
    }

    if (startingPrice < minPrice) {
      haptic.error();
      setStatus({ type: "error", message: `Precio mínimo: ${(minPrice / 1000000).toFixed(2)}M VP (valor base - 20%)` });
      return;
    }

    if (startingPrice > maxPrice) {
      haptic.error();
      setStatus({ type: "error", message: `Precio máximo: ${(maxPrice / 1000000).toFixed(2)}M VP (valor base + 15%)` });
      return;
    }

    setAuctionDialog({ show: false, player: null, price: "" });
    haptic.heavy();
    setLoading(true);
    
    const { createAuction } = await import("@/lib/actions/market");
    const res = await createAuction(activeLeagueId, profileId, player.id, startingPrice);

    if (res.success) {
      haptic.success();
      setStatus({ type: "success", message: `Subasta de ${player.nickname} creada. Duración: 24h` });
      setRefreshTrigger(prev => prev + 1);
      router.refresh();
    } else {
      haptic.error();
      setStatus({ type: "error", message: res.error as string });
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Selector de Liga */}
      <div className="v-panel bg-v-navy/20 border-white/5 p-5 space-y-6">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black uppercase text-v-red tracking-[0.3em] ml-1">Elige tu liga</label>
          <div className="relative group">
            <select 
              value={activeLeagueId}
              onChange={(e) => setActiveLeagueId(e.target.value)}
              className="w-full bg-v-navy/80 border border-white/10 rounded-sm px-4 py-3 text-sm font-black italic uppercase focus:border-v-red outline-none transition-all appearance-none cursor-pointer"
            >
              {leagues.map(l => (
                <option key={l.leagues.id} value={l.leagues.id}>{l.leagues.name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-v-red">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {activeParticipation && (
          <div className="grid grid-cols-2 gap-4 relative">
            <div className="bg-black/40 backdrop-blur-md p-4 rounded-sm border border-white/5 hover:border-v-red/30 transition-colors group">
               <p className="text-[8px] font-black uppercase text-white/40 mb-1 cursor-default group-hover:text-v-red/60">Presupuesto</p>
               <p className="text-2xl max-sm:text-xl font-black italic tracking-wider cursor-default text-white group-hover:scale-105 origin-left transition-transform">{(activeParticipation.current_budget / 1000000).toFixed(1)}M VP</p>
            </div>
            <div className="bg-black/40 backdrop-blur-md p-4 rounded-sm border border-white/5 hover:border-white/20 transition-colors group">
               <p className="text-[8px] font-black uppercase text-white/40 mb-1 cursor-default group-hover:text-white/60">Agentes</p>
               <p className="text-2xl font-black italic tracking-wider cursor-default text-white group-hover:scale-105 origin-left transition-transform">{roster.length} / 10</p>
            </div>
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-v-red shadow-[0_0_10px_rgba(255,70,85,0.5)]" />
          </div>
        )}
      </div>

      <FeedbackBanner status={status} />

      {/* Inventario de Cartas */}
      <div className="v-panel p-4 space-y-4">
        <div className="flex justify-between items-end border-b border-white/5 pb-2">
            <div>
                <h2 className="text-2xl italic uppercase text-white tracking-widest leading-none">Inventario</h2>
                <p className="text-[9px] uppercase tracking-[0.2em] text-v-red font-black mt-1">Suministros Tácticos</p>
            </div>
            <Link href="/shop" className="group flex items-center gap-2 text-[10px] font-black uppercase bg-v-navy/80 border border-white/10 px-3 py-1.5 hover:bg-v-red hover:text-white transition-all">
               <span>Tienda</span>
               <svg className="w-3 h-3 translate-x-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </Link>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {inventory.length > 0 ? inventory.map((item: any) => {
                const isActive = activePowerUps.some(ap => ap.powerup_type_id === item.powerup_types.id);
                return (
                    <button 
                        key={item.id}
                        onClick={() => {
                            haptic.light();
                            setSelectedPowerUp(selectedPowerUp?.id === item.id ? null : item);
                        }}
                        className={`shrink-0 relative w-24 h-32 v-panel flex flex-col items-center justify-center gap-2 transition-all border-2 snap-center
                            ${selectedPowerUp?.id === item.id ? 'border-v-red bg-v-red/20 shadow-red scale-105' : 
                              isActive ? 'border-green-500/50 bg-green-500/10' : 'border-white/5 bg-black/40 hover:border-white/20'}`}
                    >
                        <span className="text-4xl drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{item.powerup_types.icon}</span>
                        <span className={`text-[8px] font-black uppercase text-center px-1 leading-tight tracking-wider ${isActive ? 'text-green-500' : ''}`}>
                            {item.powerup_types.name}
                        </span>
                        {isActive && (
                            <div className="absolute top-1 left-1 flex gap-0.5">
                               <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                            </div>
                        )}
                        <span className="absolute top-2 right-2 bg-v-red text-white text-[8px] font-black px-1.5 py-0.5 rounded-sm shadow-xl">x{item.quantity}</span>
                    </button>
                );
            }) : (
                <div className="w-full py-8 text-center border-2 border-dashed border-white/5 opacity-30 rounded-lg">
                   <p className="text-[10px] font-black uppercase tracking-widest italic">Suministros Agotados</p>
                </div>
            )}
        </div>

        {selectedPowerUp && (
            <div className="bg-v-red/10 border border-v-red/30 p-3 animate-in slide-in-from-left duration-200">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase text-v-red tracking-widest mb-1">
                            {selectedPowerUp.powerup_types.code === 'MONEY' ? '💡 ACCIÓN DIRECTA' : 
                             selectedPowerUp.powerup_types.code === 'SPY' ? '🛒 USO EN MERCADO' : 
                             '🎯 SELECCIONA OBJETIVO'}
                        </p>
                        <p className="text-xs text-v-white/80 leading-tight">
                            {activePowerUps.some(ap => ap.powerup_type_id === selectedPowerUp.powerup_types.id) 
                              ? `Ya has activado esta carta en esta jornada. Solo se permite una por tipo.` :
                             selectedPowerUp.powerup_types.code === 'MONEY' ? `¿Activar "${selectedPowerUp.powerup_types.name}" para recibir 5M VP extra ahora?` :
                             selectedPowerUp.powerup_types.code === 'SPY' ? `El "${selectedPowerUp.powerup_types.name}" se utiliza directamente en el Mercado sobre las subastas.` :
                             `Selecciona un agente de tu equipo para aplicar "${selectedPowerUp.powerup_types.name}".`}
                        </p>
                    </div>
                    {selectedPowerUp.powerup_types.code === 'MONEY' && (
                        <button 
                            onClick={() => handleActivate(selectedPowerUp.powerup_types.id)}
                            disabled={activePowerUps.some(ap => ap.powerup_type_id === selectedPowerUp.powerup_types.id)}
                            className="bg-v-red text-v-white px-4 py-2 text-[10px] font-black uppercase italic hover:brightness-110 transition-all shadow-lg shadow-v-red/20 disabled:opacity-50 disabled:grayscale"
                        >
                            {activePowerUps.some(ap => ap.powerup_type_id === selectedPowerUp.powerup_types.id) ? 'LÍMITE ALCANZADO' : 'ACTIVAR YA'}
                        </button>
                    )}
                    {selectedPowerUp.powerup_types.code === 'SPY' && (
                         <Link 
                            href="/market"
                            className="bg-v-white text-v-navy px-4 py-2 text-[10px] font-black uppercase italic hover:bg-v-red hover:text-v-white transition-all"
                        >
                            IR AL MERCADO
                        </Link>
                    )}
                </div>
                <button 
                    onClick={() => setSelectedPowerUp(null)}
                    className="w-full mt-3 pt-2 border-t border-v-red/20 text-[7px] font-black uppercase text-v-white/40 hover:text-v-white transition-colors"
                >
                    [ CANCELAR ]
                </button>
            </div>
        )}
      </div>

      {/* Mesa de Análisis (Casters) */}
      <div className="v-panel p-4 space-y-4">
        <div className="flex justify-between items-end">
            <div>
                <h2 className="text-xl italic uppercase text-v-white/80 leading-none">Mesa de Análisis</h2>
                <p className="text-[7px] uppercase tracking-[0.2em] text-amber-500 font-black">Broadcast Boosts Disponibles</p>
            </div>
            {activeCasters.length > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2 py-1">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                    <span className="text-[8px] font-black uppercase text-amber-500">LIVE ({activeCasters.length}/2)</span>
                </div>
            )}
        </div>

        <div className="flex gap-4 overflow-x-auto p-2 scrollbar-hide">
            {availableCasters?.length > 0 ? availableCasters.map((caster) => {
                const isActive = activeCasters.some(ac => ac.caster_id === caster.id);
                return (
                    <button 
                        key={caster.id}
                        onClick={() => {
                            haptic.light();
                            setSelectedCaster(selectedCaster?.id === caster.id ? null : caster);
                        }}
                        className={`shrink-0 relative w-16 h-16 rounded-full v-panel flex items-center justify-center p-0.5 transition-all border-2 overflow-hidden
                            ${selectedCaster?.id === caster.id ? 'border-amber-500 scale-110 ring-4 ring-amber-500/10' : 
                              isActive ? 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-white/5 opacity-60 hover:opacity-100'}`}
                    >
                        {caster.photo_url ? (
                            <img src={caster.photo_url} alt={caster.nickname} className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <div className="w-full h-full rounded-full bg-v-navy flex items-center justify-center text-v-white font-black italic text-xs cursor-pointer">
                                {caster.nickname.substring(0, 2).toUpperCase()}
                            </div>
                        )}
                        {isActive && (
                            <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                                <span className="text-[14px]">🎙️</span>
                            </div>
                        )}
                    </button>
                );
            }) : (
                <div className="w-full py-6 text-center border-2 border-dashed border-white/5 opacity-20 rounded-lg">
                    <p className="text-[10px] font-black uppercase tracking-widest italic">No hay analistas disponibles</p>
                </div>
            )}
        </div>

        {(selectedCaster || activeCasters.length > 0) && (
            <div className={`border p-4 animate-in slide-in-from-bottom duration-300 relative overflow-hidden group 
                ${activeCasters.length > 0 && !selectedCaster ? 'border-amber-500/30 bg-amber-500/5' : 'border-v-white/10 bg-v-white/5'}`}>
                
                <div className="absolute top-0 right-0 w-32 h-full bg-linear-to-l from-amber-500/5 to-transparent pointer-events-none" />
                
                <div className="flex justify-between items-start relative z-10">
                    <div>
                        <h3 className="text-2xl font-black italic uppercase text-v-white leading-none">
                            {(selectedCaster || activeCasters[0].casters).nickname}
                        </h3>
                        <p className="text-[8px] font-black uppercase text-amber-500 tracking-[0.3em] mt-1">{(selectedCaster || activeCasters[0].casters).name}</p>
                    </div>
                    {selectedCaster && !activeCasters.some(ac => ac.caster_id === selectedCaster.id) && (
                        <div className="text-right">
                             <p className="text-[7px] font-black uppercase text-v-white/40 mb-1">Coste del Contrato</p>
                             <p className="text-lg font-black italic text-v-white leading-none">{(selectedCaster.base_price / 1000000).toFixed(1)}M VP</p>
                        </div>
                    )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 relative z-10">
                    <div className="space-y-1">
                        <p className="text-[7px] font-black uppercase text-v-white/30 tracking-widest">Análisis Operativo:</p>
                        <p className="text-[10px] text-v-white/70 leading-relaxed italic">{(selectedCaster || activeCasters[0].casters).description}</p>
                    </div>
                    <div className="bg-amber-500/10 border-l-2 border-amber-500 p-2">
                         <p className="text-[7px] font-black uppercase text-amber-500 tracking-widest mb-1">Broadcast Boost:</p>
                         <p className="text-[11px] font-black uppercase italic text-amber-500 leading-tight">{(selectedCaster || activeCasters[0].casters).buff_description}</p>
                    </div>
                </div>

                {selectedCaster && !activeCasters.some(ac => ac.caster_id === selectedCaster.id) && (
                    <button 
                        onClick={() => handleHireCaster(selectedCaster.id, selectedCaster.nickname)}
                        disabled={loading || activeCasters.length >= 2}
                        className="w-full mt-4 bg-amber-500 text-v-navy py-3 text-[10px] font-black uppercase cursor-pointer italic hover:bg-v-white transition-all shadow-lg shadow-amber-500/10 disabled:opacity-50"
                    >
                        {activeCasters.length >= 2 ? 'MÁXIMO DE CONTRATOS' : loading ? 'FIRMANDO...' : 'FIRMAR CONTRATO DE JORNADA'}
                    </button>
                )}

                {!selectedCaster && activeCasters.length > 0 && (
                    <div className="mt-4 space-y-2 border-t border-amber-500/20 pt-3">
                        {activeCasters.map((ac, idx) => (
                            <div key={ac.id} className="flex justify-between items-center bg-amber-500/5 p-2 rounded-sm">
                                <span className="text-[9px] font-black uppercase text-amber-500 italic">CONTRATO #{idx+1}: {ac.casters.nickname}</span>
                                <span className="text-[7px] font-black uppercase text-amber-500/60">ACTIVO</span>
                            </div>
                        ))}
                    </div>
                )}
                
                {selectedCaster && activeCasters.some(ac => ac.caster_id === selectedCaster.id) && (
                     <p className="w-full mt-4 border-t border-amber-500/20 pt-2 text-center text-[7px] font-black uppercase text-amber-500/40 italic tracking-widest">
                        ESTE ANALISTA YA ESTÁ EN TU MESA
                    </p>
                )}
            </div>
        )}
      </div>


      {/* Titulares (5) */}
      <div className="space-y-4">
        <h2 className="text-2xl italic tracking-tighter uppercase px-1">Quinteto Titular <span className="text-sm font-black text-v-red ml-2">{starters.length}/5</span></h2>
        <div className="grid gap-3">
          {starters.map((r) => (
            <div key={r.player_id} className="pl-2">
                <PlayerCard 
                  player={{...r.pro_players, releaseClause: r.release_clause}} 
                  onAction={() => {
                      if (selectedPowerUp) {
                          if (activePowerUps.some(ap => ap.powerup_type_id === selectedPowerUp.powerup_types.id)) return;
                          handleActivate(selectedPowerUp.powerup_types.id, r.player_id);
                      } else {
                          handleSlotChange(r.player_id, r.pro_players.nickname, 'substitute');
                      }
                  }}
                  actionLabel={selectedPowerUp ? (activePowerUps.some(ap => ap.powerup_type_id === selectedPowerUp.powerup_types.id) ? "Límite" : `Aplicar ${selectedPowerUp.powerup_types.icon}`) : "A Suplentes"}
                  actionDisabled={!!selectedPowerUp && activePowerUps.some(ap => ap.powerup_type_id === selectedPowerUp.powerup_types.id)}
                  onSecondAction={() => handleSell(r.pro_players)}
                  secondActionLabel="Vender"
                   secondActionClassName="text-v-red hover:bg-v-red/10"
                  isLocked={isLocked(r.player_id)}
                  isCaptain={isCaptain(r.player_id)}
                  inAuction={auctions.some(a => a.player_id === r.player_id && a.seller_id === profileId)}
                  isBoosted={(getBoostedRoles as any).includes(r.pro_players.role) || hasUlisesBoost}
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

      {/* Suplentes (5) */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <h2 className="text-2xl italic tracking-tighter uppercase px-1 text-v-white/70">Suplentes Próx. Jornada <span className="text-sm font-black text-v-red ml-2">{substitutes.length}/5</span></h2>
        <div className="grid gap-3">
          {substitutes.map((r) => (
            <div key={r.player_id} className="border-l-4 border-v-white/50 pl-2">
                <PlayerCard 
                  player={{...r.pro_players, releaseClause: r.release_clause}} 
                  onAction={() => {
                        if (selectedPowerUp) {
                            if (activePowerUps.some(ap => ap.powerup_type_id === selectedPowerUp.powerup_types.id)) return;
                            handleActivate(selectedPowerUp.powerup_types.id, r.player_id);
                        } else {
                            handleSlotChange(r.player_id, r.pro_players.nickname, 'starter');
                        }
                  }}
                  actionLabel={selectedPowerUp ? (activePowerUps.some(ap => ap.powerup_type_id === selectedPowerUp.powerup_types.id) ? "Límite" : `Aplicar ${selectedPowerUp.powerup_types.icon}`) : "Ascender a Titular"}
                  actionDisabled={!!selectedPowerUp && activePowerUps.some(ap => ap.powerup_type_id === selectedPowerUp.powerup_types.id)}
                  onSecondAction={() => handleSell(r.pro_players)}
                  secondActionLabel="Vender"
                   secondActionClassName="text-v-red hover:bg-v-red/10"
                  isLocked={isLocked(r.player_id)}
                  inAuction={auctions.some(a => a.player_id === r.player_id && a.seller_id === profileId)}
                />
            </div>
          ))}
          {substitutes.length < 5 && Array.from({ length: 5 - substitutes.length }).map((_, i) => (
            <div key={`empty-sub-${i}`} className="v-panel border-dashed border-v-white/10 h-24 flex items-center justify-center opacity-20">
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">Espacio Suplente</p>
            </div>
          ))}
        </div>
      </div>
      {/* Auction Dialog */}
      {auctionDialog.show && auctionDialog.player && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-v-navy/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="v-panel w-full max-w-sm p-6 space-y-6 border-t-4 border-v-red animate-in zoom-in-95 duration-200">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-v-white/40 tracking-widest">Crear Subasta</p>
              <h3 className="text-2xl font-black italic uppercase leading-none">{auctionDialog.player.nickname}</h3>
              <p className="text-[10px] font-black uppercase text-v-red tracking-widest">{auctionDialog.player.pro_teams?.name}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-v-white/60">Precio de Salida (M VP)</label>
                <div className="flex gap-2">
                  <input 
                    type="number"
                    step="0.1"
                    value={auctionDialog.price}
                    onChange={(e) => setAuctionDialog(prev => ({ ...prev, price: e.target.value }))}
                    className="flex-1 bg-v-navy/50 border border-white/10 px-4 py-3 text-lg font-black italic focus:border-v-red outline-none transition-colors"
                  />
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => setAuctionDialog(prev => ({ ...prev, price: (auctionDialog.player!.market_value * 0.8 / 1000000).toFixed(1) }))}
                      className="px-3 py-1 bg-v-navy/80 border border-white/5 text-[8px] font-black uppercase hover:bg-v-red/20 transition-colors"
                    >
                      MIN
                    </button>
                    <button 
                      onClick={() => setAuctionDialog(prev => ({ ...prev, price: (auctionDialog.player!.market_value * 1.15 / 1000000).toFixed(1) }))}
                      className="px-3 py-1 bg-v-navy/80 border border-white/5 text-[8px] font-black uppercase hover:bg-v-red/20 transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                </div>
                <div className="flex justify-between text-[8px] font-black uppercase text-v-white/30 px-1">
                  <span>Rango: {(auctionDialog.player.market_value * 0.8 / 1000000).toFixed(1)}M VP - {(auctionDialog.player.market_value * 1.15 / 1000000).toFixed(1)}M VP</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setAuctionDialog({ show: false, player: null, price: "" })}
                  className="flex-1 py-3 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-v-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmAuction}
                  disabled={loading}
                  className="flex-1 py-3 bg-v-red text-v-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                >
                  Confirmar Subasta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Generic Confirmation Dialog */}
      {confirmDialog.show && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-v-navy/95 backdrop-blur-md animate-in fade-in duration-200">
          <div className="v-panel w-full max-w-xs p-6 space-y-6 border-t-4 border-v-white animate-in zoom-in-95 duration-200">
            <div className="space-y-2 text-center">
              <p className="text-[10px] font-black uppercase text-v-red tracking-[0.3em]">Confirmación</p>
              <h3 className="text-xl font-black italic uppercase leading-tight tracking-wider">{confirmDialog.title}</h3>
              <p className="text-xs text-v-white/60 leading-relaxed">{confirmDialog.message}</p>
            </div>

            <div className="flex flex-col gap-2">
              <button 
                onClick={() => {
                  if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                  setConfirmDialog({ show: false, title: "", message: "", onConfirm: null });
                }}
                disabled={loading}
                className="w-full py-4 bg-v-white text-v-navy text-[10px] font-black uppercase tracking-[0.2em] hover:bg-v-red hover:text-v-white transition-all italic shadow-xl shadow-v-red/10"
              >
                Realizar acción
              </button>
              <button 
                onClick={() => setConfirmDialog({ show: false, title: "", message: "", onConfirm: null })}
                className="w-full py-2 text-[8px] font-black uppercase text-v-white/20 hover:text-v-white transition-colors tracking-widest"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




