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
  personalMarket, 
  auctions,
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
  
  const [activeLeagueId, setActiveLeagueId] = useState(initialLeagues[0]?.league_id || initialLeagues[0]?.leagues?.id);

  const activeParticipation = useMemo(() => 
    initialLeagues.find(l => (l.league_id || l.leagues?.id) === activeLeagueId), 
    [activeLeagueId, initialLeagues]
  );

  useEffect(() => {
    async function fetchPlayers() {
        const { createClient } = await import("@/utils/supabase/client");
        const supabase = createClient();
        const { data } = await supabase.from('pro_players').select('*, pro_teams(tag, name)');
        if (data) setAllPlayers(data);
    }
    fetchPlayers();
  }, []);

  const handleAction = async (actionFn: () => Promise<any>) => {
    haptic.medium();
    setLoading(true);
    try {
      const res = await actionFn();
      if (res.success) {
        haptic.success();
        setStatus({ type: "success", message: res.message || "Operación completada" });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        haptic.error();
        setStatus({ type: "error", message: res.error || "Error en la operación" });
      }
    } catch (e) {
      haptic.error();
      setStatus({ type: "error", message: "Error inesperado" });
    }
    setLoading(false);
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
              <p className="text-[8px] uppercase tracking-widest text-v-red font-black">4 Agentes disponibles solo hoy</p>
            </div>
            <div className="grid gap-3">
              {personalMarket.map((offer) => (
                <PlayerCard 
                  key={offer.id}
                  player={offer.player}
                  onAction={() => handleAction(() => buyFromPersonalMarket(activeLeagueId, profileId, offer.player_id, offer.id))}
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
                        const amount = window.prompt("Introduce tu puja (mayor que puja actual):", (auction.current_bid + 500000).toString());
                        if (amount) handleAction(() => placeBid(auction.id, profileId, parseInt(amount)));
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
                                onAction={() => {
                                    if (otherOwners.length > 0) {
                                        const target = otherOwners[0];
                                        if (window.confirm(`¿Ejecutar cláusula de $${(target.release_clause / 1000000).toFixed(1)}M a la escuadra de ${target.profiles.username}?`)) {
                                            handleAction(() => payClause(activeLeagueId, profileId, player.id, target.profile_id));
                                        }
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
    </div>
  );
}
