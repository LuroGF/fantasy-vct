"use client";

import { useState, useMemo, useEffect } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { buyPlayer, buyFromPersonalMarket, payClause, placeBid, createAuction } from "@/lib/actions/market";
import { haptic } from "@/lib/utils/haptics";

interface MarketViewProps {
  personalMarket: any[];
  auctions: any[];
  initialLeagues: any[];
  profileId: string;
  initialLeagueRosters: any[];
}

export default function MarketView({ 
  personalMarket: initialPersonalMarket, 
  auctions: initialAuctions,
  initialLeagues, 
  profileId,
  initialLeagueRosters,
}: MarketViewProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'general'>('personal');
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [personalMarket, setPersonalMarket] = useState(initialPersonalMarket);
  const [auctions, setAuctions] = useState(initialAuctions);
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

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      const { getPersonalMarket, getActiveAuctions } = await import("@/lib/actions/market");
      const [market, aucts] = await Promise.all([
        getPersonalMarket(activeLeagueId, profileId),
        getActiveAuctions(activeLeagueId)
      ]);
      setPersonalMarket(market);
      setAuctions(aucts);
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

  useEffect(() => {
    async function fetchPlayers() {
        if (activeTab !== 'general' || allPlayers.length > 0) return;
        
        const { createClient } = await import("@/utils/supabase/client");
        const supabase = createClient();
        // Select only necessary fields for optimization
        const { data } = await supabase
            .from('pro_players')
            .select('id, nickname, role, market_value, image_url, pro_teams(tag, name)');
            
        if (data) setAllPlayers(data);
    }
    fetchPlayers();
  }, [activeTab, allPlayers.length]);



  const handleAction = async (actionFn: () => Promise<any>) => {
    haptic.medium();
    setLoading(true);
    try {
      const res = await actionFn();
      if (res.success) {
        haptic.success();
        setStatus({ type: "success", message: res.message || "Operación completada" });
        // Scroll to top to see message
        document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => window.location.reload(), 1500);
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

  const filteredPlayers = useMemo(() => {
    if (activeTab === 'personal') return [];
    return allPlayers.filter((player) => {
      const matchesSearch = player.nickname.toLowerCase().includes(search.toLowerCase()) ||
                           player.pro_teams?.tag.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = !activeFilter || player.role === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [allPlayers, search, activeFilter, activeTab]);

  const getPlayerOwners = (playerId: string) => {
    return initialLeagueRosters.filter(r => r.player_id === playerId);
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
                <p className="text-[7px] font-black uppercase text-v-white/40 mb-0.5">Presupuesto</p>
                <p className="text-sm font-black italic text-v-white">${(activeParticipation.current_budget / 1000000).toFixed(1)}M</p>
             </div>
             <div className="flex-1 px-4 border-l border-white/5 mx-4">
                <p className="text-[7px] font-black uppercase text-v-white/40 mb-0.5">Fichajes Semana</p>
                <p className="text-sm font-black italic text-v-white">{activeParticipation.transfers_made_this_week || 0}</p>
             </div>
             <div className="text-right">
                <p className="text-[7px] font-black uppercase text-v-white/40 mb-0.5">Subastas Activas</p>
                <span className="text-xs font-black italic text-v-red">{auctions.length}</span>
             </div>
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
            Mercado General
          </button>
        </div>

        {activeTab === 'general' && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="BUSCAR AGENTE O EQUIPO..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-v-navy/50 border border-white/10 px-4 py-3 text-xs font-black italic focus:border-v-red outline-none transition-colors"
            />
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button 
                onClick={() => setActiveFilter(null)}
                className={`flex-shrink-0 px-3 py-1 text-[8px] font-black uppercase border transition-all ${!activeFilter ? 'border-v-red bg-v-red/10 text-v-red' : 'border-white/10 text-v-white/40'}`}
              >
                TODOS
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
                {auctions.map((auction) => (
                  <div key={auction.id} className="v-panel p-3 border-l-4 border-v-red bg-v-red/5">
                    <div className="flex justify-between items-start mb-2">
                       <div>
                          <p className="text-[10px] font-black uppercase text-v-white/40">Vendedor: {auction.profiles?.username}</p>
                          <h3 className="text-lg font-black italic uppercase">{auction.pro_players.nickname}</h3>
                       </div>
                       <div className="text-right">
                          <p className="text-[8px] font-black uppercase text-v-white/40">Puja Actual</p>
                          <p className="text-lg font-black italic text-v-red">${(auction.current_bid / 1000000).toFixed(1)}M</p>
                       </div>
                    </div>
                     <button 
                      onClick={() => {
                        setBidDialog({
                          show: true,
                          auction: auction,
                          amount: (auction.current_bid + 500000).toString()
                        });
                      }}
                      className="w-full bg-v-white text-v-navy text-[10px] font-black uppercase py-2 hover:bg-v-red hover:text-v-white transition-all italic"
                    >
                      Pujar Ahora
                    </button>

                  </div>
                ))}
                {auctions.length === 0 && (
                  <div className="py-10 text-center opacity-30 italic text-[10px] uppercase font-black">No hay subastas activas</div>
                )}
              </div>
            </div>

            {/* General Search (Exclusive Clause or Direct search) */}
            <div className="space-y-4">
               <div className="px-1">
                <h2 className="text-xl italic uppercase text-v-white/80">Buscador Operativo</h2>
                <p className="text-[8px] uppercase tracking-widest text-v-white/40 font-black">Localización de talento y activaciones de cláusula</p>
              </div>
              
              <div className="grid gap-3">
                {search.length > 2 && filteredPlayers.map((player) => {
                    const owners = getPlayerOwners(player.id);
                    const iamOwner = owners.some(o => o.profile_id === profileId);
                    const otherOwners = owners.filter(o => o.profile_id !== profileId);
                    
                    return (
                        <div key={player.id} className="space-y-1">
                            <PlayerCard 
                                player={player}
                                actionLabel={iamOwner ? "Ya en escuadra" : (otherOwners.length > 0 ? `Pagar Cláusula a ${otherOwners[0].profiles.username}` : "No disponible (Tienda)")}
                                actionDisabled={iamOwner || otherOwners.length === 0}
                                inAuction={auctions.some(a => a.player_id === player.id)}
                                 onAction={() => {
                                    if (otherOwners.length > 0) {
                                        const target = otherOwners[0];
                                        setConfirmDialog({
                                          show: true,
                                          title: "Ejecutar Cláusula",
                                          message: `¿Ejecutar cláusula de $${(target.release_clause / 1000000).toFixed(1)}M a la escuadra de ${target.profiles.username}?`,
                                          onConfirm: () => handleAction(() => payClause(activeLeagueId, profileId, player.id, target.profile_id))
                                        });
                                    }
                                }}
                            />
                            {otherOwners.length > 1 && (
                                <p className="text-[7px] text-v-white/20 uppercase font-black px-2 italic">Otros {(otherOwners.length - 1)} mánagers también poseen este agente</p>
                            )}
                        </div>
                    );
                })}
                {search.length > 0 && search.length <= 2 && (
                    <p className="text-center py-10 opacity-30 text-[10px] uppercase font-black italic">Escribe al menos 3 caracteres...</p>
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
              <p className="text-[10px] font-black uppercase text-v-white/40 tracking-widest">Nueva Puja</p>
              <h3 className="text-2xl font-black italic uppercase leading-none">{bidDialog.auction.pro_players.nickname}</h3>
              <p className="text-[10px] font-black uppercase text-v-red tracking-widest">Puja actual: ${(bidDialog.auction.current_bid / 1000000).toFixed(2)}M</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-v-white/60">Tu Puja ($)</label>
                <input 
                  type="number"
                  value={bidDialog.amount}
                  onChange={(e) => setBidDialog(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full bg-v-navy/50 border border-white/10 px-4 py-3 text-lg font-black italic focus:border-v-red outline-none transition-colors"
                />
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
