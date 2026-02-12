"use client";

import { useRouter } from "next/navigation";
import { haptic} from "@/lib/utils/haptics";
import { buyPlayer, buyFromPersonalMarket, payClause, placeBid, createAuction } from "@/lib/actions/market";
import { PlayerCard } from "@/components/PlayerCard";
import { useState, useMemo, useEffect } from "react";

interface MarketViewProps {
  personalMarket: any[];
  auctions: any[];
  initialLeagues: any[];
  profileId: string;
  initialLeagueRosters: any[];
  activePowerUps: any[];
}

export default function MarketView({ 
  personalMarket: initialPersonalMarket, 
  auctions: initialAuctions,
  initialLeagues, 
  profileId,
  initialLeagueRosters,
  activePowerUps: initialActivePowerUps,
}: MarketViewProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'general'>('personal');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [personalMarket, setPersonalMarket] = useState(initialPersonalMarket);
  const [auctions, setAuctions] = useState(initialAuctions);
  const [activePowerUps, setActivePowerUps] = useState(initialActivePowerUps);
  const [bidDialog, setBidDialog] = useState<{ show: boolean; auction: any | null; amount: string }>({
    show: false,
    auction: null,
    amount: ""
  });
  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; title: string; message: string; onConfirm: (() => void) | null }>({
    show: false,
    title: "",
    message: "",
    onConfirm: null
  });
  
  const [activeLeagueId, setActiveLeagueId] = useState(initialLeagues[0]?.league_id || initialLeagues[0]?.leagues?.id);

  const activeParticipation = useMemo(() => 
    initialLeagues.find(l => (l.league_id || l.leagues?.id) === activeLeagueId), 
    [activeLeagueId, initialLeagues]
  );

  const [userBids, setUserBids] = useState<any[]>([]);

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const { getPersonalMarket, getActiveAuctions } = await import("@/lib/actions/market");
      
      const [market, aucts, bidsRes] = await Promise.all([
        getPersonalMarket(activeLeagueId, profileId),
        getActiveAuctions(activeLeagueId, profileId),
        supabase.from('user_bids').select('auction_id, bid_amount').eq('profile_id', profileId)
      ]);
      
      setPersonalMarket(market);
      setAuctions(aucts);
      if (bidsRes.data) setUserBids(bidsRes.data);
      setLoading(false);
    }
    if (activeLeagueId) loadInitialData();

    // Polling for auctions
    const timer = setInterval(async () => {
        const { getActiveAuctions } = await import("@/lib/actions/market");
        const aucts = await getActiveAuctions(activeLeagueId);
        setAuctions(aucts);
    }, 30000);

    return () => clearInterval(timer);
  }, [activeLeagueId, profileId]);





  const handleAction = async (actionFn: () => Promise<any>) => {
    haptic.medium();
    setLoading(true);
    setStatus({ type: "", message: "" }); // Clear status before new action
    try {
      const res = await actionFn();
      if (res.success) {
        haptic.success();
        setStatus({ type: "success", message: res.message || "Operación completada con éxito" }); // Updated message
        router.refresh(); // Refresh Server Components
        // Removed setTimeout(() => window.location.reload(), 1500); for smoother updates
      } else {
        haptic.error();
        setStatus({ type: "error", message: res.error || "Error en la operación" });
        document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (e) {
      haptic.error();
      setStatus({ type: "error", message: "Error inesperado" });
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setLoading(false);
  };

  const confirmBid = async () => {
    if (!bidDialog.auction) return;
    const amount = parseInt(bidDialog.amount);
    if (isNaN(amount) || amount <= bidDialog.auction.current_bid) {
        haptic.error();
        setStatus({ type: "error", message: "Puja no válida" });
        return;
    }
    setBidDialog({ show: false, auction: null, amount: "" });
    handleAction(() => placeBid(bidDialog.auction.id, profileId, amount));
  };

  const roles = ["Duelista", "Iniciador", "Controlador", "Centinela"];

  const filteredAuctions = useMemo(() => {
    return auctions.filter(auction => {
      if (!activeFilter) return true;
      return auction.pro_players?.role === activeFilter;
    });
  }, [auctions, activeFilter]);



  const isPlayerLocked = (playerId: string) => {
    return activePowerUps.some(ap => ap.target_player_id === playerId && ap.powerup_types?.code === 'LOCK');
  };

  const getPlayerOwners = (playerId: string) => {
    return initialLeagueRosters.filter(r => r.player_id === playerId);
  };

  const committedFunds = useMemo(() => {
    return userBids.reduce((sum, b) => sum + Number(b.bid_amount), 0);
  }, [userBids]);

  const availableBudget = (activeParticipation?.current_budget || 0) - committedFunds;

  const handleReveal = async (auctionId: string) => {
    const { revealAuction } = await import("@/lib/actions/market");
    handleAction(() => revealAuction(activeLeagueId, profileId, auctionId));
  };

  const handleWithdraw = async (auctionId: string) => {
    const { withdrawBid } = await import("@/lib/actions/market");
    handleAction(() => withdrawBid(auctionId, profileId));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* League Selector */}
      <div className="v-panel p-4 space-y-2">
        <label className="text-[8px] font-black uppercase text-v-white/40 ml-1 tracking-[0.2em]">Operando en Liga:</label>
        <select 
          value={activeLeagueId}
          onChange={(e) => setActiveLeagueId(e.target.value)}
          className="w-full bg-v-navy/50 border border-white/10 px-4 py-2 text-xs font-black italic focus:border-v-red outline-none transition-colors"
        >
          {initialLeagues.map(l => (
            <option key={l.league_id || l.leagues?.id} value={l.league_id || l.leagues?.id}>
              {l.leagues?.name || l.name}
            </option>
          ))}
        </select>
         {activeParticipation && (
          <div className="flex justify-between items-center pt-2 mt-2 border-t border-white/5">
             <div>
                <p className="text-[7px] font-black uppercase text-v-white/40 mb-0.5">Presupuesto Disponible</p>
                <p className="text-sm font-black italic text-v-white">${(availableBudget / 1000000).toFixed(1)}M</p>
             </div>
             {committedFunds > 0 && (
                <div className="flex-1 px-4 border-l border-white/5 mx-4">
                    <p className="text-[7px] font-black uppercase text-v-red/60 mb-0.5">Bloqueado en Pujas</p>
                    <p className="text-sm font-black italic text-v-red/80">${(committedFunds / 1000000).toFixed(1)}M</p>
                </div>
             )}

          </div>
        )}
      </div>

      {/* Search & Tabs */}
      <div className="v-panel p-4 space-y-4">
        <div className="flex bg-v-navy/50 p-1 border border-white/5">
          <button
            onClick={() => setActiveTab('personal')}
            className={`flex-1 py-2 text-[10px] font-black uppercase italic tracking-widest transition-all ${activeTab === 'personal' ? 'bg-v-red text-v-white' : 'text-v-white/40 hover:text-v-white'}`}
          >
            Mercado Diario
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-2 text-[10px] font-black uppercase italic tracking-widest transition-all ${activeTab === 'general' ? 'bg-v-red text-v-white' : 'text-v-white/40 hover:text-v-white'}`}
          >
            Subastas en Vivo
          </button>
        </div>

        {activeTab === 'general' && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveFilter(null)}
              className={`flex-shrink-0 px-3 py-1 text-[8px] font-black uppercase border transition-all ${!activeFilter ? 'border-v-red bg-v-red/10 text-v-red' : 'border-white/10 text-v-white/40'}`}
            >
              TODOS LOS ROLES
            </button>
            {roles.map(role => (
              <button
                key={role}
                onClick={() => setActiveFilter(role === activeFilter ? null : role)}
                className={`flex-shrink-0 px-3 py-1 text-[8px] font-black uppercase border transition-all ${role === activeFilter ? 'border-v-red bg-v-red/10 text-v-red' : 'border-white/10 text-v-white/40'}`}
              >
                {role}
              </button>
            ))}
          </div>
        )}
      </div>

      {status.message && (
        <div className={`v-panel p-3 text-[10px] font-black uppercase text-center tracking-widest animate-in slide-in-from-top-2 duration-300 ${
          status.type === 'error' ? 'border-v-red text-v-red' : 'border-green-500 text-green-500'
        }`}>
           {status.message}
        </div>
      )}

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'personal' ? (
          <div className="space-y-4">
            <div className="px-1">
              <h2 className="text-xl italic uppercase text-v-white/80">Ofertas del Día</h2>
              <p className="text-[8px] uppercase tracking-widest text-v-red font-black">5 Agentes disponibles solo hoy</p>
            </div>
            <div className="grid gap-3">
              {personalMarket.map((offer) => (
                <PlayerCard
                  key={offer.id}
                  player={offer.player}
                  inAuction={auctions.some(a => a.player_id === offer.player_id)}
                   onAction={() => {
                      setConfirmDialog({
                        show: true,
                        title: "Confirmar Fichaje",
                        message: `¿Deseas fichar a ${offer.player.nickname} por $${(offer.offer_price / 1000000).toFixed(1)}M?`,
                        onConfirm: () => handleAction(() => buyFromPersonalMarket(activeLeagueId, profileId, offer.player_id, offer.id))
                      });
                  }}
                  actionLabel={offer.is_purchased ? "Adquirido" : `Fichar $${(offer.offer_price / 1000000).toFixed(1)}M`}
                  actionDisabled={offer.is_purchased}
                />
              ))}
              {personalMarket.length === 0 && (
                <div className="py-20 text-center opacity-30 italic text-xs">No hay ofertas disponibles hoy.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">


            {/* Auctions */}
            <div className="space-y-4">
              <div className="px-1">
                <h2 className="text-xl italic uppercase text-v-white/80">Subastas Activas</h2>
                <p className="text-[8px] uppercase tracking-widest text-v-red font-black">Pujas de la comunidad</p>
              </div>
              <div className="grid gap-3">
                {filteredAuctions.map((auction) => {
                  const myBid = userBids.find(b => b.auction_id === auction.id);
                  const isRevealed = auction.is_revealed;

                  return (
                    <div key={auction.id} className="v-panel p-3 border-l-4 border-v-red bg-v-red/5">
                      <div className="flex justify-between items-start mb-2">
                         <div>
                            <p className="text-[10px] font-black uppercase text-v-white/40">Vendedor: {auction.profiles?.username}</p>
                            <h3 className="text-lg font-black italic uppercase">{auction.pro_players.nickname}</h3>
                            {myBid && <span className="text-[8px] font-black uppercase text-v-red tracking-tighter bg-v-red/10 px-1 border border-v-red/20">Tu Puja: ${(myBid.bid_amount / 1000000).toFixed(1)}M</span>}
                         </div>
                         <div className="text-right">
                            <p className="text-[8px] font-black uppercase text-v-white/40">Puja Actual</p>
                            {isRevealed ? (
                                <p className="text-lg font-black italic text-green-500">${(auction.current_bid / 1000000).toFixed(1)}M</p>
                            ) : (
                                <div className="space-y-1">
                                    <p className="text-lg font-black italic text-v-white/20">💰 ???</p>
                                    <button
                                        onClick={() => {
                                            setConfirmDialog({
                                                show: true,
                                                title: "Usar Ojo del Espía",
                                                message: "¿Quieres gastar 1 'Ojo del Espía' para ver la puja más alta actual?",
                                                onConfirm: () => handleReveal(auction.id)
                                            });
                                        }}
                                        className="text-[7px] font-black flex items-center gap-1 uppercase text-v-red hover:text-v-white transition-colors ml-auto"
                                    >
                                        👁️ REVELAR
                                    </button>
                                </div>
                            )}
                         </div>
                      </div>
                       <button
                        onClick={() => {
                          setBidDialog({
                            show: true,
                            auction: auction,
                            amount: (Math.max(auction.current_bid, myBid?.bid_amount || 0) + 500000).toString()
                          });
                        }}
                        className="w-full bg-v-white text-v-navy text-[10px] font-black uppercase py-2 hover:bg-v-red hover:text-v-white transition-all italic"
                      >
                        {myBid ? "Actualizar Puja Blind" : "Pujar Blind"}
                      </button>

                      {myBid && (
                        <button
                            onClick={() => {
                                setConfirmDialog({
                                    show: true,
                                    title: "Retirar Puja",
                                    message: "¿Estás seguro de que quieres retirar tu puja? Liberarás el dinero bloqueado.",
                                    onConfirm: () => handleWithdraw(auction.id)
                                });
                            }}
                            className="w-full mt-2 border border-v-white/10 text-v-white/40 text-[7px] font-black uppercase py-1 hover:border-v-red/40 hover:text-v-red transition-all italic"
                        >
                            Retirar Puja y Liberar Fondos
                        </button>
                      )}

                    </div>
                  );
                })}
                {auctions.length === 0 && (
                  <div className="py-10 text-center opacity-30 italic text-[10px] uppercase font-black">No hay subastas activas</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* League & Budget Info */}
      {activeParticipation && (
        <div className="v-panel p-3 mt-4 flex justify-between items-center border-t-2 border-v-red">
          <div>
            <p className="text-[8px] font-black uppercase text-v-white/40">Créditos de Operación</p>
            <p className="text-xl font-black italic text-v-white">${(activeParticipation.current_budget / 1000000).toFixed(1)}M</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black uppercase text-v-white/40">Liga Operativa</p>
            <p className="text-xs font-black italic text-v-red uppercase">{activeParticipation.leagues?.name || activeParticipation.name}</p>
          </div>
        </div>
      )}

      {/* Bid Dialog */}
      {bidDialog.show && bidDialog.auction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-v-navy/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="v-panel w-full max-w-sm p-6 space-y-6 border-t-4 border-v-red animate-in zoom-in-95 duration-200">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-v-white/40 tracking-widest">Nueva Puja Anónima</p>
              <h3 className="text-2xl font-black italic uppercase leading-none">{bidDialog.auction.pro_players.nickname}</h3>
              <p className="text-[10px] font-black uppercase text-v-red tracking-widest">Puja mínima requerida: ${((bidDialog.auction.current_bid + 1) / 1000000).toFixed(2)}M</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-v-white/60">Importe de la Puja ($)</label>
                <input 
                  type="number"
                  value={bidDialog.amount}
                  onChange={(e) => setBidDialog(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full bg-v-navy/50 border border-white/10 px-4 py-3 text-lg font-black italic focus:border-v-red outline-none transition-colors"
                />
                
                {/* Quick Add Buttons */}
                <div className="flex gap-2 pt-1 overflow-x-auto pb-2 scrollbar-hide">
                    {[500000, 1000000, 2000000, 5000000].map(add => (
                      <button 
                        key={add}
                        onClick={() => setBidDialog(prev => ({ ...prev, amount: (parseInt(prev.amount || "0") + add).toString() }))}
                        className="flex-shrink-0 px-2 py-1 bg-v-white/5 border border-white/10 text-[8px] font-black hover:bg-v-white/10"
                      >
                        +{add / 1000000}M
                      </button>
                    ))}
                </div>
                <p className="text-[7px] text-v-white/30 uppercase italic">El presupuesto se bloqueará hasta que finalice la subasta.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setBidDialog({ show: false, auction: null, amount: "" })}
                  className="flex-1 py-3 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-v-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmBid}
                  disabled={loading}
                  className="flex-1 py-3 bg-v-red text-v-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                >
                  Confirmar Puja
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
