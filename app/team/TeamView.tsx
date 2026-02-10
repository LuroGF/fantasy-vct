"use client";

import { useState, useMemo, useEffect } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { setStarterStatus, getUserFullRoster } from "@/lib/actions/roster";
import Link from "next/link";
import { haptic } from "@/lib/utils/haptics";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [inventory, setInventory] = useState(initialInventory);
  const [activePowerUps, setActivePowerUps] = useState(initialActivePowerUps);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [selectedPowerUp, setSelectedPowerUp] = useState<any>(null);
  const [auctionDialog, setAuctionDialog] = useState<{ show: boolean; player: any | null; price: string }>({
    show: false,
    player: null,
    price: ""
  });
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
      const { getActiveAuctions } = await import("@/lib/actions/market");
      
      const [rosterData, auctionsData] = await Promise.all([
        getUserFullRoster(activeLeagueId, profileId),
        getActiveAuctions(activeLeagueId)
      ]);
      
      setRoster(rosterData);
      setAuctions(auctionsData);
      setLoading(false);
    }
    if (activeLeagueId) loadData();
  }, [activeLeagueId, profileId]);

  // Grouping by slot type
  const starters = useMemo(() => roster.filter(r => r.slot_type === 'starter'), [roster]);
  const substitutes = useMemo(() => roster.filter(r => r.slot_type === 'substitute'), [roster]);

  const isLocked = (playerId: string) => {
    return activePowerUps.some(ap => ap.target_player_id === playerId && ap.powerup_types?.code === 'LOCK');
  };

  const isCaptain = (playerId: string) => {
    return activePowerUps.some(ap => ap.target_player_id === playerId && ap.powerup_types?.code === 'CAPTAIN');
  };

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
          document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
          window.location.reload(); 
        } else {
          haptic.error();
          setStatus({ type: "error", message: res.error as string });
          document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
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
            document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
            setLoading(false);
            return;
        }
        if (newSlot === 'substitute' && substitutes.length >= 5) {
            setStatus({ type: "error", message: "Máximo 5 suplentes." });
            document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
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
          router.refresh(); // Sync potential swaps
          setStatus({ 
            type: "success", 
            message: `${nickname} movido a ${newSlot === 'starter' ? 'Titulares' : 'Suplentes'}` 
          });
          document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          haptic.error();
          setStatus({ type: "error", message: res.error as string });
          document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
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
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (startingPrice < minPrice) {
      haptic.error();
      setStatus({ type: "error", message: `Precio mínimo: $${(minPrice / 1000000).toFixed(2)}M (valor base - 20%)` });
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (startingPrice > maxPrice) {
      haptic.error();
      setStatus({ type: "error", message: `Precio máximo: $${(maxPrice / 1000000).toFixed(2)}M (valor base + 15%)` });
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
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
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => window.location.reload(), 1500);
    } else {
      haptic.error();
      setStatus({ type: "error", message: res.error as string });
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
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
               <p className="text-sm font-black italic">{roster.length} / 10</p>
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
                  inAuction={auctions.some(a => a.player_id === r.player_id)}
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
                  onAction={selectedPowerUp ? () => handleActivate(selectedPowerUp.powerup_types.id, r.player_id) : () => handleSlotChange(r.player_id, r.pro_players.nickname, 'starter')}
                  actionLabel={selectedPowerUp ? `Aplicar ${selectedPowerUp.powerup_types.icon}` : "Ascender a Titular"}
                  onSecondAction={() => handleSell(r.pro_players)}
                  secondActionLabel="Vender"
                   secondActionClassName="text-v-red hover:bg-v-red/10"
                  isLocked={isLocked(r.player_id)}
                  inAuction={auctions.some(a => a.player_id === r.player_id)}
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
                <label className="text-[10px] font-black uppercase text-v-white/60">Precio de Salida ($M)</label>
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
                  <span>Rango: ${(auctionDialog.player.market_value * 0.8 / 1000000).toFixed(1)}M - ${(auctionDialog.player.market_value * 1.15 / 1000000).toFixed(1)}M</span>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-v-navy/95 backdrop-blur-md animate-in fade-in duration-200">
          <div className="v-panel w-full max-w-xs p-6 space-y-6 border-t-4 border-v-white animate-in zoom-in-95 duration-200">
            <div className="space-y-2 text-center">
              <p className="text-[10px] font-black uppercase text-v-red tracking-[0.3em]">Confirmación</p>
              <h3 className="text-xl font-black italic uppercase leading-tight">{confirmDialog.title}</h3>
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
                Ejecutar Operación
              </button>
              <button 
                onClick={() => setConfirmDialog({ show: false, title: "", message: "", onConfirm: null })}
                className="w-full py-2 text-[8px] font-black uppercase text-v-white/20 hover:text-v-white transition-colors tracking-widest"
              >
                Abortar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




