"use client";

import { useRouter } from "next/navigation";
import { haptic } from "@/lib/utils/haptics";
import {
  buyPlayer,
  buyFromPersonalMarket,
  payClause,
  placeBid,
  createAuction,
  getPersonalMarket,
  fetchActiveAuctions,
  revealAuction,
  withdrawBid,
} from "@/lib/actions/market";
import {
  createTradeOffer,
  getTrades,
  acceptTradeOffer,
  rejectTradeOffer,
  cancelTradeOffer,
} from "@/lib/actions/trades";
import { PlayerCard } from "@/components/PlayerCard";
import { useState, useMemo, useEffect } from "react";
import { FeedbackBanner } from "@/components/FeedbackBanner";
import { getTeamLogo } from "@/lib/vlr-shared";

import { motion, AnimatePresence } from "framer-motion";

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
  const [activeTab, setActiveTab] = useState<
    "personal" | "general" | "rivals" | "legends" | "trades"
  >("personal");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [legends, setLegends] = useState<any[]>([]);
  const [status, setStatus] = useState<{
    type: string;
    message: string;
  } | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [personalMarket, setPersonalMarket] = useState(initialPersonalMarket);
  const [auctions, setAuctions] = useState(initialAuctions);
  const [activePowerUps, setActivePowerUps] = useState(initialActivePowerUps);
  const [bidDialog, setBidDialog] = useState<{
    show: boolean;
    auction: any | null;
    amount: string;
  }>({
    show: false,
    auction: null,
    amount: "",
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: (() => void) | null;
  }>({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [activeLeagueId, setActiveLeagueId] = useState(
    initialLeagues[0]?.league_id || initialLeagues[0]?.leagues?.id,
  );

  const activeParticipation = useMemo(
    () =>
      initialLeagues.find(
        (l) => (l.league_id || l.leagues?.id) === activeLeagueId,
      ),
    [activeLeagueId, initialLeagues],
  );

  const [userBids, setUserBids] = useState<any[]>([]);
  const [rivals, setRivals] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [tradeDialog, setTradeDialog] = useState<{
    show: boolean;
    targetPlayer: any | null;
    receiverId: string;
    myPlayerId: string;
    cashAmount: string;
    direction: "pay" | "receive";
  }>({
    show: false,
    targetPlayer: null,
    receiverId: "",
    myPlayerId: "",
    cashAmount: "",
    direction: "pay",
  });

  useEffect(() => {
    async function loadInitialData() {
      if (!activeLeagueId) return;
      setLoading(true);
      try {
        const { createClient } = await import("@/utils/supabase/client");
        const supabase = createClient();

        const { getLeagueClassification } =
          await import("@/lib/actions/leagues");
        const { getLegendaryPlayers, checkIsFinal } =
          await import("@/lib/actions/market");

        const [
          market,
          aucts,
          bidsRes,
          classification,
          legendsData,
          finalStatus,
        ] = await Promise.all([
          getPersonalMarket(activeLeagueId, profileId),
          fetchActiveAuctions(activeLeagueId, profileId),
          supabase
            .from("user_bids")
            .select("auction_id, bid_amount")
            .eq("profile_id", profileId),
          getLeagueClassification(activeLeagueId),
          getLegendaryPlayers(),
          checkIsFinal(activeLeagueId),
        ]);

        setPersonalMarket(market);
        setAuctions(aucts);
        setRivals(
          classification.standings.filter(
            (p: any) => p.profile_id !== profileId,
          ),
        );
        setLegends(legendsData);
        setIsFinal(finalStatus);
        if (bidsRes.data) setUserBids(bidsRes.data);
      } catch (err) {
        console.error("Error loading market data:", err);
      }
      setLoading(false);
    }
    loadInitialData();

    const timer = setInterval(async () => {
      if (!activeLeagueId) return;
      try {
        const aucts = await fetchActiveAuctions(activeLeagueId);
        setAuctions(aucts);
      } catch (e) {}
    }, 30000);

    if (activeTab === "trades" && activeLeagueId) {
      getTrades(activeLeagueId, profileId).then(setTrades);
    }

    return () => clearInterval(timer);
  }, [activeLeagueId, profileId, refreshTrigger, activeTab]);

  // Auto-dismiss status banner after 5 seconds
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleAction = async (actionFn: () => Promise<any>) => {
    haptic.medium();
    setLoading(true);
    setStatus(null);
    try {
      const res = await actionFn();
      if (res.success) {
        haptic.success();
        setStatus({
          type: "success",
          message: res.message || "Operación completada con éxito",
        });
        setRefreshTrigger((prev) => prev + 1);
        router.refresh();
      } else {
        haptic.error();
        setStatus({
          type: "error",
          message: res.error || "Error en la operación",
        });
      }
    } catch (e) {
      haptic.error();
      setStatus({ type: "error", message: "Error inesperado" });
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

  const submitTrade = async () => {
    const { targetPlayer, receiverId, myPlayerId, cashAmount, direction } =
      tradeDialog;
    if (!targetPlayer || !receiverId) return;

    const cash = parseInt(cashAmount) || 0;
    const finalCash = direction === "pay" ? cash : -cash;

    setTradeDialog((prev) => ({ ...prev, show: false }));

    handleAction(() =>
      createTradeOffer(
        activeLeagueId,
        profileId,
        receiverId,
        myPlayerId || null,
        targetPlayer.id,
        finalCash,
      ),
    );
  };

  const roles = ["Duelista", "Iniciador", "Controlador", "Centinela"];

  const filteredPersonalMarket = useMemo(
    () => personalMarket,
    [personalMarket],
  );

  const filteredAuctions = useMemo(
    () =>
      auctions.filter(
        (item) => !activeFilter || item.pro_players?.role === activeFilter,
      ),
    [auctions, activeFilter],
  );

  const filteredRivals = useMemo(() => rivals, [rivals]);

  const myRoster = useMemo(() => {
    return initialLeagueRosters
      .filter((r) => r.profile_id === profileId && r.pro_players)
      .map((r) => r.pro_players);
  }, [initialLeagueRosters, profileId]);

  const incomingTrades = useMemo(
    () =>
      trades.filter(
        (t) => t.receiver_id === profileId && t.status === "pending",
      ),
    [trades, profileId],
  );
  const outgoingTrades = useMemo(
    () =>
      trades.filter((t) => t.sender_id === profileId && t.status === "pending"),
    [trades, profileId],
  );

  const committedFunds = useMemo(() => {
    return userBids.reduce((sum, b) => sum + Number(b.bid_amount), 0);
  }, [userBids]);

  const availableBudget =
    (activeParticipation?.current_budget || 0) - committedFunds;

  const handleReveal = async (auctionId: string) => {
    handleAction(() => revealAuction(activeLeagueId, profileId, auctionId));
  };

  const handleWithdraw = async (auctionId: string) => {
    handleAction(() => withdrawBid(auctionId, profileId));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* League Selector */}
      <div className="v-panel p-4 space-y-2">
        <label className="text-[8px] font-black uppercase text-v-white/40 ml-1 tracking-[0.2em]">
          Operando en Liga:
        </label>
        <select
          value={activeLeagueId}
          onChange={(e) => setActiveLeagueId(e.target.value)}
          className="w-full bg-v-navy/50 border border-white/10 px-4 py-2 text-xs font-black italic focus:border-v-red outline-none transition-colors"
        >
          {initialLeagues.map((l) => (
            <option
              key={l.league_id || l.leagues?.id}
              value={l.league_id || l.leagues?.id}
            >
              {l.leagues?.name || l.name}
            </option>
          ))}
        </select>
        {activeParticipation && (
          <div className="flex justify-between items-center pt-2 mt-2 border-t border-white/5">
            <div>
              <p className="text-[7px] font-black uppercase text-v-white/40 mb-0.5">
                Créditos Disponibles
              </p>
              <p className="text-sm font-black italic text-v-white">
                {(availableBudget / 1000000).toFixed(1)}M VP
              </p>
            </div>
            {committedFunds > 0 && (
              <div className="flex-1 px-4 border-l border-white/5 mx-4">
                <p className="text-[7px] font-black uppercase text-v-red/60 mb-0.5">
                  Comprometido en Draft
                </p>
                <p className="text-sm font-black italic text-v-red/80">
                  {(committedFunds / 1000000).toFixed(1)}M VP
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search & Tabs */}
      <div className="v-panel p-4 space-y-4">
        <div className="flex bg-v-navy/80 p-1 border border-white/10 rounded-sm overflow-x-auto scrollbar-hide relative">
          {[
            { id: "personal", label: "Diario" },
            { id: "general", label: "Draft" },
            { id: "rivals", label: "Rivales" },
            { id: "trades", label: "Trades" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                haptic.light();
                setActiveTab(tab.id as any);
              }}
              className={`relative flex-1 min-w-[70px] py-2.5 text-[8.5px] font-black uppercase italic tracking-[0.05em] transition-colors z-10 ${activeTab === tab.id ? "text-v-white" : "text-v-white/40 hover:text-v-white/70"}`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="market-tab-active"
                  className="absolute inset-0 bg-v-red shadow-[0_0_15px_rgba(255,70,85,0.3)]"
                  transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                />
              )}
              <span className="relative z-20">{tab.label}</span>
            </button>
          ))}

          {isFinal && (
            <button
              onClick={() => {
                haptic.light();
                setActiveTab("legends");
              }}
              className={`relative flex-1 min-w-[100px] py-2.5 text-[9px] font-black uppercase italic tracking-widest transition-all overflow-hidden group z-10 ${activeTab === "legends" ? "text-v-navy" : "text-amber-500"}`}
            >
              {activeTab === "legends" ? (
                <motion.div
                  layoutId="market-tab-active"
                  className="absolute inset-0 bg-amber-500"
                  transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                />
              ) : (
                <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors" />
              )}
              <span className="relative z-20 whitespace-nowrap">
                ⭐ Leyendas
              </span>
            </button>
          )}
        </div>

        {activeTab === "general" && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveFilter(null)}
              className={`shrink-0 px-3 py-1 text-[8px] font-black uppercase border transition-all ${!activeFilter ? "border-v-red bg-v-red/10 text-v-red" : "border-white/10 text-v-white/40"}`}
            >
              TODOS LOS ROLES
            </button>
            {roles.map((role) => (
              <button
                key={role}
                onClick={() =>
                  setActiveFilter(role === activeFilter ? null : role)
                }
                className={`shrink-0 px-3 py-1 text-[8px] font-black uppercase border transition-all ${role === activeFilter ? "border-v-red bg-v-red/10 text-v-red" : "border-white/10 text-v-white/40"}`}
              >
                {role}
              </button>
            ))}
          </div>
        )}
      </div>

      <FeedbackBanner status={status} />

      {/* Content Area */}
      <div className="space-y-6">
        {activeTab === "personal" ? (
          <div className="space-y-4">
            <div className="px-1">
              <h2 className="text-xl italic uppercase text-v-white/80">
                Ofertas del Día
              </h2>
              <p className="text-[8px] uppercase tracking-widest text-v-red font-black">
                5 Agentes disponibles solo hoy
              </p>
            </div>
            <div className="grid gap-3">
              {filteredPersonalMarket.map((offer) => (
                <PlayerCard
                  key={offer.id}
                  player={offer.player}
                  inAuction={auctions.some(
                    (a) => a.player_id === offer.player_id,
                  )}
                  onAction={() => {
                    setConfirmDialog({
                      show: true,
                      title: "Confirmar Reclutamiento",
                      message: `¿Deseas reclutar a ${offer.player?.nickname} por ${(offer.offer_price / 1000000).toFixed(1)}M VP?`,
                      onConfirm: () =>
                        handleAction(() =>
                          buyFromPersonalMarket(
                            activeLeagueId,
                            profileId,
                            offer.player_id,
                            offer.id,
                          ),
                        ),
                    });
                  }}
                  actionLabel={offer.is_purchased ? "Adquirido" : "Reclutar"}
                  actionSubLabel={
                    offer.is_purchased
                      ? ""
                      : `${(offer.offer_price / 1000000).toFixed(1)}M VP`
                  }
                  actionDisabled={offer.is_purchased}
                />
              ))}
              {filteredPersonalMarket.length === 0 && (
                <div className="py-20 text-center opacity-30 italic text-xs uppercase font-black">
                  No se encontraron agentes
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8 text-v-white">
            {activeTab === "general" ? (
              <div className="space-y-4">
                <div className="px-1">
                  <h2 className="text-xl italic uppercase text-v-white/80">
                    Draft Activo
                  </h2>
                  <p className="text-[8px] uppercase tracking-widest text-v-red font-black">
                    Asignación por mérito táctico
                  </p>
                </div>
                <div className="grid gap-3">
                  {filteredAuctions.map((auction) => {
                    const myBid = userBids.find(
                      (b) => b.auction_id === auction.id,
                    );
                    const isRevealed = auction.is_revealed;

                    return (
                      <div
                        key={auction.id}
                        className="v-panel-red group relative overflow-hidden transition-all hover:translate-y-[-2px] hover:shadow-2xl"
                      >
                        <div className="absolute top-0 right-0 w-48 h-full bg-linear-to-l from-v-red/10 to-transparent pointer-events-none" />
                        {(() => {
                          const logo = getTeamLogo(auction.pro_players?.pro_teams?.tag);
                          return logo ? (
                            <div className="absolute -right-4 -bottom-6 w-32 h-32 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                              <img src={logo} alt="" className="w-full h-full object-contain grayscale brightness-200" />
                            </div>
                          ) : (
                            <div className="absolute -right-4 -bottom-6 text-8xl font-black text-white/5 italic select-none group-hover:text-v-red/10 transition-colors uppercase leading-none pointer-events-none">
                              {auction.pro_players?.nickname?.substring(0, 3)}
                            </div>
                          );
                        })()}

                        <div className="relative z-10 flex flex-col gap-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-1.5 h-1.5 bg-v-red rounded-full shadow-[0_0_5px_rgba(255,70,85,1)] animate-pulse" />
                                <p className="text-[8px] font-black uppercase text-white/40 tracking-[0.2em]">
                                  Vendedor:{" "}
                                  <span className="text-white/80">
                                    {auction.profiles?.username || "SISTEMA"}
                                  </span>
                                </p>
                              </div>
                              <h3 className="text-2xl sm:text-3xl font-black italic uppercase tracking-wider leading-none pr-2 truncate">
                                {auction.pro_players?.nickname}
                              </h3>
                              {myBid && (
                                <div className="inline-flex items-center gap-2 mt-2 bg-v-red px-2 py-0.5 rounded-sm">
                                  <span className="text-[7px] font-black uppercase text-white tracking-widest whitespace-nowrap">
                                    TU OFERTA:{" "}
                                    {(myBid.bid_amount / 1000000).toFixed(1)}M
                                    VP
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="text-right bg-black/40 backdrop-blur-md p-3 rounded-sm border border-white/5 min-w-[100px]">
                              <p className="text-[7px] font-black uppercase text-white/30 tracking-widest mb-1">
                                OFERTA LÍDER
                              </p>
                              {isRevealed ? (
                                <p className="text-2xl font-black italic text-green-500 leading-none">
                                  {(auction.current_bid / 1000000).toFixed(1)}M{" "}
                                  <span className="text-[10px]">VP</span>
                                </p>
                              ) : (
                                <div className="flex flex-col items-end gap-1.5">
                                  <p className="text-xl font-black italic text-white/10 leading-none select-none">
                                    ???.?M VP
                                  </p>
                                  <button
                                    onClick={() => {
                                      setConfirmDialog({
                                        show: true,
                                        title: "Protocolo de Espionaje",
                                        message:
                                          "¿Confirmas el uso de 1 'Ojo del Espía' para interceptar la oferta más alta?",
                                        onConfirm: () =>
                                          handleReveal(auction.id),
                                      });
                                    }}
                                    title="Revelar Oferta"
                                    className="group flex items-center gap-1.5 text-[8px] font-black uppercase text-v-red hover:text-white bg-v-red/10 hover:bg-v-red px-2 py-1 border border-v-red/20 transition-all rounded-sm"
                                  >
                                    <span className="text-xs">👁️</span> REVELAR
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 relative z-10">
                            <button
                              onClick={() => {
                                setBidDialog({
                                  show: true,
                                  auction: auction,
                                  amount: (
                                    Math.max(
                                      auction.current_bid,
                                      myBid?.bid_amount || 0,
                                    ) + 500000
                                  ).toString(),
                                });
                              }}
                              className="v-btn-primary flex-1 py-3! text-[10px]! italic shadow-xl"
                            >
                              {myBid
                                ? "MODIFICAR OFERTA"
                                : "ENVIAR OFERTA ANÓNIMA"}
                            </button>

                            {myBid && (
                              <button
                                onClick={() => {
                                  setConfirmDialog({
                                    show: true,
                                    title: "Retirar Oferta",
                                    message:
                                      "¿Deseas anular tu oferta y recuperar el saldo bloqueado?",
                                    onConfirm: () => handleWithdraw(auction.id),
                                  });
                                }}
                                title="Retirar Oferta"
                                className="w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10 text-white/30 hover:border-v-red hover:text-v-red hover:bg-v-red/5 transition-all rounded-sm group/close"
                              >
                                <svg
                                  className="w-5 h-5 group-hover/close:scale-110 transition-transform"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2.5"
                                    d="M6 18L18 6M6 6l12 12"
                                  ></path>
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {auctions.length === 0 && (
                    <div className="py-10 text-center opacity-30 italic text-[10px] uppercase font-black">
                      No hay subastas activas
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === "rivals" ? (
              <div className="space-y-4">
                <div className="px-1">
                  <h2 className="text-xl italic uppercase text-v-white/80">
                    Equipos Rivales
                  </h2>
                  <p className="text-[8px] uppercase tracking-widest text-v-red font-black">
                    Paga cláusulas para robar agentes
                  </p>
                </div>

                <div className="space-y-6">
                  {filteredRivals.map((rival) => (
                    <div key={rival.profile_id} className="space-y-3">
                      <div className="flex items-center gap-3 bg-v-white/5 p-2 border-l-2 border-v-red">
                        <div className="w-8 h-8 bg-v-red/20 rounded-full flex items-center justify-center text-[10px] font-black italic">
                          {rival.profiles?.username
                            ?.substring(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-black italic uppercase tracking-wider">
                            {rival.profiles?.username}
                          </h3>
                          <p className="text-[7px] font-black uppercase text-v-white/40">
                            {rival.total_points || 0} PUNTOS
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        {rival.roster.length > 0 ? (
                          rival.roster.map((player: any) => (
                            <div
                              key={player.id}
                              className="v-panel relative overflow-hidden group hover:border-v-red transition-all flex items-center justify-between p-3 select-none active:scale-[0.99]"
                            >
                                {(() => {
                                  const logo = getTeamLogo(player.pro_teams?.tag);
                                  return logo ? (
                                    <div className="absolute top-0 right-0 w-24 h-full bg-linear-to-l from-v-red/5 to-transparent pointer-events-none flex items-center justify-end pr-2 overflow-hidden opacity-5 group-hover:opacity-10 transition-opacity">
                                      <img src={logo} alt="" className="w-20 h-20 object-contain grayscale brightness-200" />
                                    </div>
                                  ) : (
                                    <div className="absolute -right-2 -bottom-2 text-4xl font-black text-white/3 italic select-none group-hover:text-v-red/5 transition-colors uppercase leading-none pointer-events-none">
                                      {player.pro_teams?.tag || "FA"}
                                    </div>
                                  );
                                })()}

                                <div className="flex items-center gap-3 relative z-10">
                                  <div className="w-10 shrink-0 flex justify-start border-r border-white/5 pr-2">
                                    {(() => {
                                      const logo = getTeamLogo(player.pro_teams?.tag);
                                      return logo ? (
                                        <img src={logo} alt={player.pro_teams?.tag || ""} className="w-6 h-6 object-contain" />
                                      ) : (
                                        <span className="text-[9px] font-black uppercase text-v-red tracking-widest">
                                          {player.pro_teams?.tag || "FA"}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                <div>
                                  <p className="text-sm font-black uppercase italic leading-none group-hover:text-v-red transition-colors pr-2 truncate">
                                    {player.nickname}
                                  </p>
                                  <p className="text-[7px] font-black uppercase text-v-white/30 mt-1">
                                    {player.role}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 relative z-10">
                                <div className="text-right border-r border-white/5 pr-4">
                                  <p className="text-[7px] font-black uppercase text-v-white/30 mb-0.5">
                                    Reasignación
                                  </p>
                                  <p className="text-sm font-black italic text-v-red">
                                    {(
                                      Number(
                                        player.release_clause ||
                                          player.market_value ||
                                          0,
                                      ) / 1000000
                                    ).toFixed(1)}
                                    M VP
                                  </p>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={() => {
                                      setConfirmDialog({
                                        show: true,
                                        title: "Protocolo de Reasignación",
                                        message: `¿Deseas solicitar la reasignación de ${player.nickname} por ${(player.release_clause / 1000000).toFixed(1)}M VP? Los créditos de operación se transferirán a ${rival.profiles?.username}.`,
                                        onConfirm: () =>
                                          handleAction(() =>
                                            payClause(
                                              activeLeagueId,
                                              profileId,
                                              player.id,
                                              rival.profile_id,
                                            ),
                                          ),
                                      });
                                    }}
                                    className="bg-v-white text-v-navy text-[8px] font-black px-4 py-2.5 uppercase italic hover:bg-v-red hover:text-v-white transition-all shadow-lg active:scale-95 w-full"
                                  >
                                    Pagar Rescisión
                                  </button>
                                  <button
                                    onClick={() => {
                                      setTradeDialog({
                                        show: true,
                                        targetPlayer: player,
                                        receiverId: rival.profile_id,
                                        myPlayerId: "",
                                        cashAmount: "",
                                        direction: "pay",
                                      });
                                    }}
                                    className="border border-white/10 text-v-white/50 hover:text-v-white hover:border-v-white text-[7px] font-black px-4 py-1.5 uppercase italic transition-all active:scale-95 w-full"
                                  >
                                    Prop. Intercambio
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[8px] uppercase italic text-v-white/20 text-center py-2">
                            Sin agentes que coincidan
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeTab === "trades" ? (
              <div className="space-y-8">
                {/* INCOMING */}
                <div className="space-y-4">
                  <h2 className="text-xl italic uppercase text-v-white/80 border-b border-v-red/50 w-fit pr-4">
                    Ofertas Recibidas
                  </h2>
                  <div className="grid gap-3">
                    {incomingTrades.map((trade) => (
                      <div
                        key={trade.id}
                        className="v-panel p-4 border-l-4 border-green-500 bg-v-navy/40 relative"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-[9px] font-black uppercase text-v-white/40 tracking-widest">
                              De: {trade.sender?.username || "Desconocido"}
                            </p>
                            <p className="text-[9px] font-black uppercase text-v-white/20 tracking-widest italic">
                              {new Date(trade.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                              trade.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-500"
                                : trade.status === "accepted"
                                  ? "bg-green-500/20 text-green-500"
                                  : "bg-red-500/20 text-red-500"
                            }`}
                          >
                            {trade.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          {/* THEY GIVE */}
                          <div className="flex-1 text-center bg-black/20 p-2 rounded border border-white/5">
                            <p className="text-[7px] font-black uppercase text-v-white/30 mb-1">
                              Recibes
                            </p>
                            {trade.sender_player ? (
                              <p className="text-sm font-black italic text-v-white">
                                {trade.sender_player.nickname}
                              </p>
                            ) : (
                              <span className="text-xs opacity-20">-</span>
                            )}
                            {trade.cash_offer > 0 && (
                              <p className="text-xs font-black text-green-400 mt-1">
                                +{(trade.cash_offer / 1000000).toFixed(1)}M VP
                              </p>
                            )}
                          </div>

                          <div className="text-v-white/20">⇄</div>

                          {/* YOU GIVE */}
                          <div className="flex-1 text-center bg-black/20 p-2 rounded border border-white/5">
                            <p className="text-[7px] font-black uppercase text-v-white/30 mb-1">
                              Entregas
                            </p>
                            {trade.receiver_player ? (
                              <p className="text-sm font-black italic text-v-red">
                                {trade.receiver_player.nickname}
                              </p>
                            ) : (
                              <span className="text-xs opacity-20">-</span>
                            )}
                            {trade.cash_offer < 0 && (
                              <p className="text-xs font-black text-v-red mt-1">
                                +
                                {(Math.abs(trade.cash_offer) / 1000000).toFixed(
                                  1,
                                )}
                                M VP
                              </p>
                            )}
                          </div>
                        </div>

                        {trade.status === "pending" && (
                          <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                            <button
                              onClick={() => {
                                setConfirmDialog({
                                  show: true,
                                  title: "Aceptar Intercambio",
                                  message:
                                    "¿Confirmas el intercambio de activos? Esta acción es irreversible.",
                                  onConfirm: () =>
                                    handleAction(() =>
                                      acceptTradeOffer(trade.id, profileId),
                                    ),
                                });
                              }}
                              className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-v-navy text-[9px] font-black uppercase italic transition-colors"
                            >
                              Aceptar
                            </button>
                            <button
                              onClick={() =>
                                handleAction(() =>
                                  rejectTradeOffer(trade.id, profileId),
                                )
                              }
                              className="flex-1 py-2 bg-v-white/5 hover:bg-v-red hover:text-v-white text-v-white/40 text-[9px] font-black uppercase italic transition-colors"
                            >
                              Rechazar
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {incomingTrades.length === 0 && (
                      <p className="text-[10px] uppercase italic opacity-30">
                        No tienes ofertas pendientes.
                      </p>
                    )}
                  </div>
                </div>

                {/* OUTGOING */}
                <div className="space-y-4">
                  <h2 className="text-xl italic uppercase text-v-white/80 border-b border-v-red/50 w-fit pr-4">
                    Ofertas Enviadas
                  </h2>
                  <div className="grid gap-3">
                    {outgoingTrades.map((trade) => (
                      <div
                        key={trade.id}
                        className="v-panel p-4 border-l-4 border-v-white/20 bg-v-navy/40 opacity-80 hover:opacity-100 transition-opacity"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-[9px] font-black uppercase text-v-white/40 tracking-widest">
                              Para: {trade.receiver?.username || "Desconocido"}
                            </p>
                            <p className="text-[9px] font-black uppercase text-v-white/20 tracking-widest italic">
                              {new Date(trade.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                              trade.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-500"
                                : trade.status === "accepted"
                                  ? "bg-green-500/20 text-green-500"
                                  : "bg-red-500/20 text-red-500"
                            }`}
                          >
                            {trade.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 text-center bg-black/20 p-2 rounded border border-white/5">
                            <span className="block text-[7px] text-v-white/30 uppercase">
                              Ofreces
                            </span>
                            <span className="text-xs font-black italic">
                              {trade.sender_player
                                ? trade.sender_player.nickname
                                : "-"}
                            </span>
                            {trade.cash_offer > 0 && (
                              <span className="block text-[9px] text-v-red/80 font-bold">
                                {(trade.cash_offer / 1000000).toFixed(1)}M VP
                              </span>
                            )}
                          </div>
                          <div className="text-v-white/20">→</div>
                          <div className="flex-1 text-center bg-black/20 p-2 rounded border border-white/5">
                            <span className="block text-[7px] text-v-white/30 uppercase">
                              Pides
                            </span>
                            <span className="text-xs font-black italic">
                              {trade.receiver_player
                                ? trade.receiver_player.nickname
                                : "-"}
                            </span>
                            {trade.cash_offer < 0 && (
                              <span className="block text-[9px] text-green-500/80 font-bold">
                                +
                                {(Math.abs(trade.cash_offer) / 1000000).toFixed(
                                  1,
                                )}
                                M VP
                              </span>
                            )}
                          </div>
                        </div>
                        {trade.status === "pending" && (
                          <button
                            onClick={() =>
                              handleAction(() =>
                                cancelTradeOffer(trade.id, profileId),
                              )
                            }
                            className="w-full mt-3 py-1.5 text-[8px] font-black uppercase text-v-white/30 hover:text-v-red hover:bg-v-red/5 border border-transparent hover:border-v-red/20 transition-all"
                          >
                            Cancelar Propuesta
                          </button>
                        )}
                      </div>
                    ))}
                    {outgoingTrades.length === 0 && (
                      <p className="text-[10px] uppercase italic opacity-30">
                        No has enviado ofertas.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="v-panel p-6 border-amber-500/30 bg-amber-500/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-full bg-linear-to-l from-amber-500/10 to-transparent" />
                  <h2 className="text-3xl font-black italic uppercase text-amber-500 leading-none mb-1">
                    Sala de Leyendas
                  </h2>
                  <p className="text-[10px] font-black uppercase text-amber-500/60 tracking-[0.3em]">
                    Protocolo Final de Reclutamiento
                  </p>
                  <p className="text-xs text-v-white/60 mt-4 leading-relaxed max-w-sm">
                    Solo disponible durante la{" "}
                    <span className="text-amber-500 font-bold">Gran Final</span>
                    . Recluta figuras históricas que puntuarán en base a hitos
                    globales del partido.
                  </p>
                </div>

                <div className="grid gap-4">
                  {legends.map((player) => (
                    <div
                      key={player.id}
                      className="v-panel border-amber-500/20 bg-linear-to-br from-amber-500/10 to-v-navy p-4 relative overflow-hidden group hover:border-amber-500 transition-all"
                    >
                      <div className="absolute -right-4 -bottom-6 text-8xl font-black text-amber-500/5 italic select-none uppercase pointer-events-none group-hover:text-amber-500/10 transition-colors">
                        {player.nickname?.substring(0, 3)}
                      </div>

                      <div className="flex gap-4 relative z-10">
                        <div className="w-20 h-28 bg-v-navy/80 border border-amber-500/30 overflow-hidden relative group-hover:border-amber-500 transition-colors">
                          {player.photo_url ? (
                            <img
                              src={player.photo_url}
                              alt={player.nickname}
                              className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">
                              ⭐
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 w-full bg-amber-500 text-v-navy text-[7px] font-black uppercase text-center py-0.5 italic">
                            LEYENDA
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div>
                            <h3 className="text-2xl font-black italic uppercase text-amber-500 leading-none">
                              {player.nickname}
                            </h3>
                            <p className="text-[7px] font-black uppercase text-v-white/40 mt-1">
                              Hito Especial:
                            </p>
                            <p className="text-[9px] font-black uppercase text-amber-500/80 italic mt-0.5">
                              {player.nickname === "Mixwell"
                                ? "🎯 +4 pts por cada First Blood en el mapa"
                                : player.nickname === "Hiko"
                                  ? "👑 +12 pts por cada Clutch del partido"
                                  : player.nickname === "ScreaM"
                                    ? "💀 +1 pt por cada 10 ACS del MVP"
                                    : "🌟 +15 pts fijos por presencia legendaria"}
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              setConfirmDialog({
                                show: true,
                                title: "Reclutar Leyenda",
                                message: `¿Deseas añadir a ${player.nickname} a tu equipo por ${(player.market_value / 1000000).toFixed(1)}M VP? Solo disponible para esta final.`,
                                onConfirm: () =>
                                  handleAction(() =>
                                    buyPlayer(
                                      activeLeagueId,
                                      profileId,
                                      player.id,
                                    ),
                                  ),
                              });
                            }}
                            className="w-full bg-amber-500 text-v-navy text-[10px] font-black uppercase py-2.5 hover:bg-v-white transition-all italic shadow-lg shadow-amber-500/20"
                          >
                            Reclutar Icono:{" "}
                            {(player.market_value / 1000000).toFixed(1)}M VP
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* League & Budget Info */}
      {activeParticipation && (
        <div className="v-panel p-3 mt-4 flex justify-between items-center border-t-2 border-v-red">
          <div>
            <p className="text-[8px] font-black uppercase text-v-white/40">
              Créditos de Operación
            </p>
            <p className="text-xl font-black italic text-v-white">
              {(activeParticipation.current_budget / 1000000).toFixed(1)}M VP
            </p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black uppercase text-v-white/40">
              Liga Operativa
            </p>
            <p className="text-xs font-black italic text-v-red uppercase">
              {activeParticipation.leagues?.name || activeParticipation.name}
            </p>
          </div>
        </div>
      )}

      {/* Trade Dialog */}
      {tradeDialog.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-v-navy/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="v-panel w-full max-w-sm p-0 overflow-hidden border-t-4 border-v-white animate-in zoom-in-95 duration-200">
            <div className="bg-v-white/5 p-4 border-b border-white/5">
              <h3 className="text-xl font-black italic uppercase leading-none">
                Propuesta de Intercambio
              </h3>
              <p className="text-[9px] uppercase tracking-widest text-v-white/40 mt-1">
                Negociación Directa
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* TARGET */}
              <div className="bg-black/20 p-3 rounded border border-white/5">
                <p className="text-[8px] font-black uppercase text-v-white/30 tracking-widest mb-1">
                  Objetivo (Recibes)
                </p>
                <p className="text-xl font-black italic text-v-red uppercase">
                  {tradeDialog.targetPlayer?.nickname}
                </p>
                <p className="text-[10px] text-v-white/50">
                  {tradeDialog.targetPlayer?.pro_teams?.tag} //{" "}
                  {tradeDialog.targetPlayer?.role}
                </p>
              </div>

              <div className="flex justify-center text-v-white/20 text-xl font-black rotate-90 sm:rotate-0">
                ⇄
              </div>

              {/* OFFER */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-v-white/60">
                    Tu Agente (Opcional)
                  </label>
                  <select
                    value={tradeDialog.myPlayerId}
                    onChange={(e) =>
                      setTradeDialog({
                        ...tradeDialog,
                        myPlayerId: e.target.value,
                      })
                    }
                    className="w-full bg-v-navy border border-white/10 px-3 py-2 text-xs font-black uppercase italic focus:border-v-red outline-none"
                  >
                    <option value="">-- Ninguno --</option>
                    {myRoster.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.nickname} ({p.role}) -{" "}
                        {(p.market_value / 1000000).toFixed(1)}M
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-v-white/60">
                    Compensación Económica
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={tradeDialog.cashAmount}
                      onChange={(e) =>
                        setTradeDialog({
                          ...tradeDialog,
                          cashAmount: e.target.value,
                        })
                      }
                      placeholder="CANTIDAD..."
                      className="flex-1 bg-v-navy border border-white/10 px-3 py-2 text-xs font-black italic focus:border-v-red outline-none"
                    />
                    <select
                      value={tradeDialog.direction}
                      onChange={(e) =>
                        setTradeDialog({
                          ...tradeDialog,
                          direction: e.target.value as any,
                        })
                      }
                      className="w-24 bg-v-navy border border-white/10 px-2 py-2 text-[10px] font-black uppercase italic focus:border-v-red outline-none"
                    >
                      <option value="pay">PAGAS</option>
                      <option value="receive">RECIBES</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() =>
                    setTradeDialog((prev) => ({ ...prev, show: false }))
                  }
                  className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-v-white/5 transition-colors border border-white/10"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitTrade}
                  disabled={loading}
                  className="flex-1 py-3 bg-v-white text-v-navy hover:bg-v-red hover:text-v-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
                >
                  Enviar Propuesta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bid Dialog */}
      {bidDialog.show && bidDialog.auction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-v-navy/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="v-panel w-full max-w-sm p-6 space-y-6 border-t-4 border-v-red animate-in zoom-in-95 duration-200">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-v-white/40 tracking-widest">
                Nueva Oferta Anónima
              </p>
              <h3 className="text-2xl font-black italic uppercase leading-none">
                {bidDialog.auction.pro_players?.nickname}
              </h3>
              <p className="text-[10px] font-black uppercase text-v-red tracking-widest">
                Oferta mínima requerida:{" "}
                {((bidDialog.auction.current_bid + 1) / 1000000).toFixed(2)}M VP
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-v-white/60">
                  Importe de la Oferta
                </label>
                <input
                  type="number"
                  value={bidDialog.amount}
                  onChange={(e) =>
                    setBidDialog((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  className="w-full bg-v-navy/50 border border-white/10 px-4 py-3 text-lg font-black italic focus:border-v-red outline-none transition-colors"
                />

                {/* Quick Add Buttons */}
                <div className="flex gap-2 pt-1 overflow-x-auto pb-2 scrollbar-hide">
                  {[500000, 1000000, 2000000, 5000000].map((add) => (
                    <button
                      key={add}
                      onClick={() =>
                        setBidDialog((prev) => ({
                          ...prev,
                          amount: (
                            parseInt(prev.amount || "0") + add
                          ).toString(),
                        }))
                      }
                      className="shrink-0 px-2 py-1 bg-v-white/5 border border-white/10 text-[8px] font-black hover:bg-v-white/10"
                    >
                      +{add / 1000000}M VP
                    </button>
                  ))}
                </div>
                <p className="text-[7px] text-v-white/30 uppercase italic">
                  El presupuesto se bloqueará hasta que finalice la subasta.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() =>
                    setBidDialog({ show: false, auction: null, amount: "" })
                  }
                  className="flex-1 py-3 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-v-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmBid}
                  disabled={loading}
                  className="flex-1 py-3 bg-v-red text-v-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                >
                  Confirmar Oferta
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
              <p className="text-[10px] font-black uppercase text-v-red tracking-[0.3em]">
                Confirmación
              </p>
              <h3 className="text-xl font-black italic uppercase leading-tight">
                {confirmDialog.title}
              </h3>
              <p className="text-xs text-v-white/60 leading-relaxed">
                {confirmDialog.message}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                  setConfirmDialog({
                    show: false,
                    title: "",
                    message: "",
                    onConfirm: null,
                  });
                }}
                disabled={loading}
                className="w-full py-4 bg-v-white text-v-navy text-[10px] font-black uppercase tracking-[0.2em] hover:bg-v-red hover:text-v-white transition-all italic shadow-xl shadow-v-red/10"
              >
                Realizar acción
              </button>
              <button
                onClick={() =>
                  setConfirmDialog({
                    show: false,
                    title: "",
                    message: "",
                    onConfirm: null,
                  })
                }
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
