"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { sileo } from "sileo";
import { haptic } from "@/lib/utils/haptics";
import {
  acceptLeagueOffer,
  acceptManagerOffer,
  getMarketDashboard,
  makeManagerOffer,
  payReleaseClause,
  placeBid,
  rejectLeagueOffer,
  rejectManagerOffer,
  withdrawBid,
  withdrawPlayerListing,
  updatePlayerListingPrice,
  updateManagerOffer,
} from "@/lib/actions/market";

type Tab = "market" | "rivals" | "sales" | "offers";

type Props = {
  initialLeagues: any[];
  initialLeagueId: string;
  profileId: string;
  initialData: any;
};

const money = (value: number | string | null | undefined) =>
  `${(Number(value || 0) / 1_000_000).toFixed(1)}M €`;

const notifySuccess = (title: string, description?: string) =>
  sileo.success({
    title,
    description,
    duration: 7000,
  } as any);

const notifyError = (title: string, description?: string) =>
  sileo.error({
    title,
    description,
    duration: 9000,
  } as any);

function PlayerImage({ player }: { player: any }) {
  return (
    <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-sm border border-white/10 bg-white/5">
      {player?.photo_url ? (
        <img
          src={player.photo_url}
          alt={player.nickname || "Jugador"}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xl font-black italic text-white/15">
          {(player?.nickname || "?").slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function Countdown({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, new Date(endsAt).getTime() - now);
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);

  return <>{diff <= 0 ? "Cerrando…" : `${hours}h ${mins}m`}</>;
}

function ListingCountdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, new Date(expiresAt).getTime() - now);

  if (diff <= 0) return <>Caducando…</>;

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);

  return <>{days > 0 ? `${days}d ${hours}h` : `${hours}h ${mins}m`}</>;
}

export default function MarketView({
  initialLeagues,
  initialLeagueId,
  profileId,
  initialData,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeLeagueId, setActiveLeagueId] = useState(initialLeagueId);
  const [leagueMenuOpen, setLeagueMenuOpen] = useState(false);
  const requestedTab = searchParams.get("tab");
  const initialTab: Tab =
    requestedTab === "rivals" ||
    requestedTab === "sales" ||
    requestedTab === "offers"
      ? requestedTab
      : "market";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [bidDialog, setBidDialog] = useState<any>(null);
  const [offerDialog, setOfferDialog] = useState<any>(null);
  const [editPriceDialog, setEditPriceDialog] = useState<any>(null);

  const activeLeague = useMemo(
    () =>
      initialLeagues.find(
        (l) => (l.league_id || l.leagues?.id) === activeLeagueId,
      ),
    [activeLeagueId, initialLeagues],
  );

  const currentBudget = Number(data?.participant?.current_budget || 0);
  const bidExposure = Number(data?.stats?.bidExposure || 0);
  const availableBudget = Math.max(0, currentBudget - bidExposure);
  const bidBeingEdited = Number(bidDialog?.auction?.my_bid?.amount || 0);
  const availableForCurrentBid = Math.max(
    0,
    availableBudget + bidBeingEdited,
  );

  async function reload(leagueId = activeLeagueId) {
    setLoading(true);
    try {
      const next = await getMarketDashboard(leagueId, profileId);
      setData(next);
    } catch (error: any) {
      notifyError(
        "Error al cargar el mercado",
        error?.message || "No se pudieron actualizar los datos",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const auctions = data?.auctions || [];
    const now = Date.now();
    const futureEnds = auctions
      .map((auction: any) => new Date(auction.ends_at).getTime())
      .filter((endsAt: number) => Number.isFinite(endsAt) && endsAt > now);

    // Al cerrar el mercado se consulta enseguida. Si el motor todavía está
    // procesándolo y no hay tarjetas, se reintenta de forma moderada mientras
    // el entrenador permanezca en esta pantalla.
    const delay =
      futureEnds.length > 0
        ? Math.max(1_000, Math.min(...futureEnds) - now + 1_500)
        : 30_000;

    const timeout = window.setTimeout(() => {
      void reload(activeLeagueId);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [activeLeagueId, data?.auctions]);

  function changeLeague(leagueId: string) {
    haptic.light();
    setActiveLeagueId(leagueId);
    setLeagueMenuOpen(false);

    const params = new URLSearchParams(searchParams.toString());
    params.set("league", leagueId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    void reload(leagueId);
  }

  function changeTab(tab: Tab) {
    setActiveTab(tab);

    const params = new URLSearchParams(searchParams.toString());
    if (tab === "market") params.delete("tab");
    else params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function runAction(
    fn: () => Promise<any>,
    successTitle: string,
    successDescription?: string,
  ) {
    haptic.medium();
    setLoading(true);

    try {
      const result = await fn();

      if (!result?.success) {
        throw new Error(result?.error || "No se pudo completar la operación.");
      }

      // Primero actualizamos la información.
      await reload();

      haptic.success();

      sileo.success({
        title: successTitle,
        description: successDescription,
        duration: 7000,
      } as any);
    } catch (error: any) {
      haptic.error();

      // Una subasta puede haber caducado o haber sido sustituida mientras la
      // página estaba abierta. Sincronizamos el mercado también al fallar para
      // no dejar tarjetas obsoletas visibles después del rechazo del servidor.
      try {
        await reload();
      } catch {
        // El aviso original es más útil que un segundo error de refresco.
      }

      sileo.error({
        title: "Error",
        description: error?.message || "No se pudo completar la operación.",
        duration: 9000,
      } as any);
    } finally {
      setLoading(false);
    }
  }

  async function submitBid() {
    if (!bidDialog) return;
    const amount = Number(bidDialog.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      notifyError("Puja no válida", "Introduce un importe válido.");
      return;
    }

    if (amount > availableForCurrentBid) {
      notifyError(
        "Saldo comprometido",
        `Puedes destinar como máximo ${money(availableForCurrentBid)} a esta puja.`,
      );
      return;
    }

    const auctionId = bidDialog.auction.id;
    const editingBid = Boolean(bidDialog.auction.my_bid);
    const playerName = bidDialog.auction.player?.nickname || "el jugador";

    setBidDialog(null);
    await runAction(
      () => placeBid(auctionId, profileId, Math.round(amount)),
      editingBid ? "Puja modificada" : "Puja realizada",
      editingBid
        ? `Tu nueva puja por ${playerName} es de ${money(amount)}.`
        : `Has pujado ${money(amount)} por ${playerName}.`,
    );
  }

  async function submitManagerOffer() {
    if (!offerDialog) return;

    const amount = Number(offerDialog.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      notifyError("Oferta no válida", "Introduce un importe válido.");
      return;
    }

    const listingId = offerDialog.listing.id;
    const existingOffer = offerDialog.offer || null;
    const playerName = offerDialog.player?.nickname || "el jugador";

    setOfferDialog(null);

    if (existingOffer) {
      await runAction(
        () =>
          updateManagerOffer(existingOffer.id, Math.round(amount), profileId),
        "Oferta modificada",
        `Tu nueva oferta por ${offerDialog.player?.nickname} es de ${money(amount)}.`,
      );
      return;
    }

    await runAction(
      () => makeManagerOffer(listingId, Math.round(amount), profileId),
      "Oferta enviada",
      `Has ofrecido ${money(amount)} por ${offerDialog.player?.nickname}.`,
    );
  }

  async function submitEditListingPrice() {
    if (!editPriceDialog) return;

    const listing = editPriceDialog.listing;
    const amount = Number(editPriceDialog.amount);
    const minPrice = Number(listing.market_value_snapshot || 0);
    const maxPrice = Math.floor(minPrice * 1.15);

    if (!Number.isFinite(amount) || amount <= 0) {
      notifyError("Precio no válido", "Introduce un importe válido.");
      return;
    }

    if (amount < minPrice || amount > maxPrice) {
      notifyError(
        "Precio fuera de rango",
        `Debe estar entre ${money(minPrice)} y ${money(maxPrice)}.`,
      );
      return;
    }

    setEditPriceDialog(null);

    await runAction(
      () => updatePlayerListingPrice(listing.id, Math.round(amount), profileId),
      "Precio actualizado",
      `${listing.player?.nickname} ahora está listado por ${money(amount)}.`,
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "market", label: "Mercado" },
    { id: "rivals", label: "Rivales" },
    { id: "sales", label: "Mis ventas" },
    { id: "offers", label: "Ofertas" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <section className="v-panel relative z-30 overflow-visible p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="mb-1 text-[8px] font-black uppercase tracking-[0.22em] text-white/35">
              Liga activa
            </p>
            <button
              type="button"
              onClick={() => setLeagueMenuOpen((v) => !v)}
              className="flex max-w-full items-center gap-2 text-left text-lg font-black italic uppercase text-white transition hover:text-v-red"
            >
              <span className="truncate">
                {activeLeague?.leagues?.name || activeLeague?.name || "Liga"}
              </span>
              <span className="text-xs text-v-red">⌄</span>
            </button>

            {leagueMenuOpen && (
              <div className="absolute left-4 top-[62px] z-50 max-h-64 w-[min(320px,calc(100%-2rem))] overflow-y-auto border border-white/10 bg-v-navy shadow-2xl custom-scrollbar">
                {initialLeagues.map((league) => {
                  const id = league.league_id || league.leagues?.id;
                  const name = league.leagues?.name || league.name;
                  const active = id === activeLeagueId;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => changeLeague(id)}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-xs font-black uppercase transition ${
                        active
                          ? "bg-v-red text-white"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span>{name}</span>
                      {active && <span>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid w-full shrink-0 grid-cols-4 gap-x-3 gap-y-2 text-right sm:w-auto sm:gap-x-4">
            <div>
              <p className="text-[7px] font-black uppercase text-white/30">
                Saldo
              </p>
              <p className="text-sm font-black italic text-white">
                {money(data?.participant?.current_budget)}
              </p>
            </div>
            <div>
              <p className="text-[7px] font-black uppercase text-white/30">
                Disponible
              </p>
              <p className="text-sm font-black italic text-v-red">
                {money(availableBudget)}
              </p>
            </div>
            <div>
              <p className="text-[7px] font-black uppercase text-white/30">
                Pujas
              </p>
              <p className="text-sm font-black italic text-white">
                {data?.stats?.activeBids || 0}
              </p>
            </div>
            <div>
              <p className="text-[7px] font-black uppercase text-white/30">
                Exposición
              </p>
              <p className="text-sm font-black italic text-v-red">
                {money(data?.stats?.bidExposure)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="v-panel relative z-10 p-1">
        <div className="grid grid-cols-4 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => changeTab(tab.id)}
              className={`px-2 py-3 text-[8px] font-black uppercase italic tracking-wide transition sm:text-[9px] ${
                activeTab === tab.id
                  ? "bg-v-red text-white shadow-[0_0_18px_rgba(255,70,85,.22)]"
                  : "text-white/35 hover:bg-white/5 hover:text-white/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center text-[8px] font-black uppercase tracking-[0.2em] text-white/30">
          Actualizando…
        </div>
      )}

      {activeTab === "market" && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-black italic uppercase">
              Mercado de hoy
            </h2>
            <p className="text-[9px] font-black uppercase tracking-widest text-v-red">
              10 jugadores · pujas ocultas · cierre automático
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {(data?.auctions || []).map((auction: any) => {
              const player = auction.player;
              const myBid = auction.my_bid;
              return (
                <article
                  key={auction.id}
                  className="v-panel-red relative overflow-hidden p-4"
                >
                  <div className="flex gap-4">
                    <Link
                      href={`/players/${player.id}?league=${activeLeagueId}`}
                      aria-label={`Ver perfil de ${player.nickname}`}
                      className="shrink-0 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v-red"
                    >
                      <PlayerImage player={player} />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/players/${player.id}?league=${activeLeagueId}`}
                            className="group/player block min-w-0 pr-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v-red"
                          >
                            <h3 className="truncate pr-2 text-2xl font-black italic uppercase leading-none transition-colors group-hover/player:text-v-red">
                              {player?.nickname}
                            </h3>
                            <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-white/35 transition-colors group-hover/player:text-white/60">
                              {player?.pro_teams?.tag || "FA"} · {player?.role}
                            </p>
                          </Link>
                        </div>
                        <div className="text-right">
                          <p className="text-[7px] font-black uppercase text-white/30">
                            Valor
                          </p>
                          <p className="text-sm font-black italic text-white">
                            {money(
                              auction.market_value_snapshot ||
                                player?.market_value,
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                        <div>
                          <p className="text-[7px] font-black uppercase text-white/30">
                            Tu puja
                          </p>
                          <p
                            className={`text-sm font-black italic ${myBid ? "text-v-red" : "text-white/25"}`}
                          >
                            {myBid ? money(myBid.amount) : "Sin puja"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[7px] font-black uppercase text-white/30">
                            Cierra en
                          </p>
                          <p className="text-sm font-black italic text-white">
                            <Countdown endsAt={auction.ends_at} />
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setBidDialog({
                              auction,
                              amount: String(
                                myBid?.amount ||
                                  auction.market_value_snapshot ||
                                  player?.market_value ||
                                  10_000_000,
                              ),
                            })
                          }
                          className="v-btn-primary flex-1 py-3! text-[9px]!"
                        >
                          {myBid ? "Modificar puja" : "Pujar"}
                        </button>
                        {myBid && (
                          <button
                            type="button"
                            onClick={() =>
                              runAction(
                                () => withdrawBid(auction.id, profileId),
                                "Puja retirada",
                                `Has retirado tu puja por ${player?.nickname}.`,
                              )
                            }
                            className="border border-white/10 px-3 text-[8px] font-black uppercase text-white/40 transition hover:border-v-red hover:text-v-red"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {(data?.auctions || []).length === 0 && (
            <div className="v-panel py-14 text-center text-xs font-black uppercase italic text-white/25">
              No hay mercado activo en esta liga.
            </div>
          )}
        </section>
      )}

      {activeTab === "rivals" && (
        <section className="space-y-5">
          <div>
            <h2 className="text-xl font-black italic uppercase">Rivales</h2>
            <p className="text-[9px] font-black uppercase tracking-widest text-v-red">
              Cláusulas y ofertas por jugadores en venta
            </p>
          </div>

          {(data?.rivals || []).map((rival: any) => (
            <div key={rival.profile_id} className="space-y-2">
              <div className="flex items-center justify-between border-l-2 border-v-red bg-white/5 px-3 py-2">
                <p className="text-sm font-black italic uppercase">
                  {rival.username}
                </p>
                <span className="text-[8px] font-black uppercase text-white/30">
                  {rival.roster.length} jugadores
                </span>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                {rival.roster.map((row: any) => {
                  const p = row.player;
                  const protectedClause =
                    row.clause_protected_until &&
                    new Date(row.clause_protected_until) > new Date();

                  const myPendingOffer = row.listing
                    ? (data?.managerOffers || []).find(
                        (offer: any) =>
                          offer.listing_id === row.listing.id &&
                          offer.from_profile_id === profileId &&
                          offer.status === "pending",
                      )
                    : null;

                  return (
                    <article key={row.id} className="v-panel flex gap-3 p-3">
                      <Link
                        href={`/players/${p.id}?league=${activeLeagueId}`}
                        aria-label={`Ver perfil de ${p.nickname}`}
                        className="shrink-0 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v-red"
                      >
                        <PlayerImage player={p} />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/players/${p.id}?league=${activeLeagueId}`}
                              className="group/player block min-w-0 pr-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v-red"
                            >
                              <h3 className="truncate pr-2 text-lg font-black italic uppercase transition-colors group-hover/player:text-v-red">
                                {p?.nickname}
                              </h3>
                              <p className="text-[8px] font-black uppercase text-white/35 transition-colors group-hover/player:text-white/60">
                                {p?.pro_teams?.tag || "FA"} · {p?.role}
                              </p>
                            </Link>
                          </div>
                          <div className="text-right">
                            <p className="text-[7px] uppercase text-white/30">
                              Cláusula
                            </p>
                            <p className="text-sm font-black italic text-v-red">
                              {money(row.release_clause)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={protectedClause || loading}
                            onClick={() =>
                              runAction(
                                () => payReleaseClause(row.id, profileId),
                                "Cláusula ejecutada",
                                `${p?.nickname} se ha incorporado a tu plantilla.`,
                              )
                            }
                            className="flex-1 bg-white px-3 py-2 text-[8px] font-black uppercase text-v-navy transition hover:bg-v-red hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                          >
                            {protectedClause
                              ? "Protegido 48h"
                              : "Pagar cláusula"}
                          </button>
                          {row.listing && (
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() =>
                                setOfferDialog({
                                  listing: row.listing,
                                  player: p,
                                  offer: myPendingOffer,
                                  amount: String(
                                    myPendingOffer?.amount ??
                                      row.listing.asking_price ??
                                      p?.market_value ??
                                      10_000_000,
                                  ),
                                })
                              }
                              className="flex-1 border border-white/10 px-3 py-2 text-[8px] font-black uppercase text-white/60 transition hover:border-v-red hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              {myPendingOffer
                                ? "Editar oferta"
                                : "Hacer oferta"}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}

          {(data?.rivals || []).length === 0 && (
            <div className="v-panel py-14 text-center text-xs font-black uppercase italic text-white/25">
              Aún no hay rivales en esta liga.
            </div>
          )}
        </section>
      )}

      {activeTab === "sales" && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-black italic uppercase">Mis ventas</h2>
            <p className="text-[9px] font-black uppercase tracking-widest text-v-red">
              Jugadores listados y ofertas recibidas
            </p>
          </div>

          {(data?.myListings || []).map((listing: any) => (
            <article key={listing.id} className="v-panel p-4">
              <div className="flex gap-4">
                <PlayerImage player={listing.player} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate pr-2 text-xl font-black italic uppercase">
                        {listing.player?.nickname}
                      </h3>

                      <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-1 sm:grid-cols-3">
                        <div>
                          <p className="text-[7px] font-black uppercase text-white/25">
                            Precio
                          </p>
                          <p className="text-sm font-black italic text-v-red">
                            {money(listing.asking_price)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[7px] font-black uppercase text-white/25">
                            Valor mercado
                          </p>
                          <p className="text-sm font-black italic text-white/70">
                            {money(listing.market_value_snapshot)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[7px] font-black uppercase text-white/25">
                            Tiempo restante
                          </p>
                          <p className="text-sm font-black italic text-white">
                            {listing.expires_at ? (
                              <ListingCountdown
                                expiresAt={listing.expires_at}
                              />
                            ) : (
                              "7 días"
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() =>
                          setEditPriceDialog({
                            listing,
                            amount: String(listing.asking_price),
                          })
                        }
                        className="border border-white/10 px-3 py-2 text-[8px] font-black uppercase text-white/55 transition hover:border-white/25 hover:text-white disabled:opacity-30"
                      >
                        Editar precio
                      </button>

                      <button
                        type="button"
                        disabled={loading}
                        onClick={() =>
                          runAction(
                            () => withdrawPlayerListing(listing.id, profileId),
                            "Jugador retirado de la venta",
                            `${listing.player?.nickname} ya no está en venta.`,
                          )
                        }
                        className="border border-v-red/30 px-3 py-2 text-[8px] font-black uppercase text-v-red transition hover:bg-v-red hover:text-white disabled:opacity-30"
                      >
                        Retirar
                      </button>
                    </div>
                  </div>

                  {listing.league_offer && (
                    <div className="mt-4 border border-v-red/20 bg-v-red/5 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[8px] font-black uppercase text-v-red">
                            Oferta de la liga
                          </p>
                          <p className="text-lg font-black italic">
                            {money(listing.league_offer.amount)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              runAction(
                                () =>
                                  acceptLeagueOffer(
                                    listing.league_offer.id,
                                    profileId,
                                  ),
                                "Jugador vendido",
                                `${listing.player?.nickname || "El jugador"} ha sido vendido a la liga por ${money(listing.league_offer.amount)}.`,
                              )
                            }
                            className="bg-white px-3 py-2 text-[8px] font-black uppercase text-v-navy"
                          >
                            Aceptar
                          </button>
                          <button
                            onClick={() =>
                              runAction(
                                () =>
                                  rejectLeagueOffer(
                                    listing.league_offer.id,
                                    profileId,
                                  ),
                                "Oferta rechazada",
                                `Has rechazado la oferta de la liga por ${listing.player?.nickname || "el jugador"}.`,
                              )
                            }
                            className="border border-white/10 px-3 py-2 text-[8px] font-black uppercase text-white/50"
                          >
                            Rechazar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    {(listing.manager_offers || [])
                      .filter((o: any) => o.status === "pending")
                      .map((offer: any) => (
                        <div
                          key={offer.id}
                          className="flex items-center justify-between gap-3 border-t border-white/5 pt-2"
                        >
                          <div>
                            <p className="text-[8px] font-black uppercase text-white/35">
                              {offer.from_username}
                            </p>
                            <p className="text-sm font-black italic">
                              {money(offer.amount)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                runAction(
                                  () => acceptManagerOffer(offer.id, profileId),
                                  "Jugador vendido",
                                  `${listing.player?.nickname} ha sido vendido a ${offer.from_username} por ${money(offer.amount)}.`,
                                )
                              }
                              className="bg-white px-3 py-2 text-[8px] font-black uppercase text-v-navy"
                            >
                              Aceptar
                            </button>
                            <button
                              onClick={() =>
                                runAction(
                                  () => rejectManagerOffer(offer.id, profileId),
                                  "Oferta rechazada",
                                  `Has rechazado la oferta de ${offer.from_username}.`,
                                )
                              }
                              className="border border-white/10 px-3 py-2 text-[8px] font-black uppercase text-white/50"
                            >
                              Rechazar
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </article>
          ))}

          {(data?.myListings || []).length === 0 && (
            <div className="v-panel py-14 text-center text-xs font-black uppercase italic text-white/25">
              No tienes jugadores puestos en venta.
            </div>
          )}
        </section>
      )}

      {activeTab === "offers" && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-black italic uppercase">Ofertas</h2>
            <p className="text-[9px] font-black uppercase tracking-widest text-v-red">
              Historial de ofertas entre managers
            </p>
          </div>

          <div className="space-y-2">
            {(data?.managerOffers || []).map((offer: any) => {
              const sent = offer.from_profile_id === profileId;
              return (
                <article
                  key={offer.id}
                  className="v-panel flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase text-white/35">
                      {sent
                        ? `Enviada a ${offer.to_username}`
                        : `Recibida de ${offer.from_username}`}
                    </p>
                    <h3 className="truncate pr-2 text-lg font-black italic uppercase">
                      {offer.player?.nickname || "Jugador"}
                    </h3>
                    <p className="text-sm font-black italic text-v-red">
                      {money(offer.amount)}
                    </p>
                  </div>
                  <span className="shrink-0 border border-white/10 px-2 py-1 text-[8px] font-black uppercase text-white/45">
                    {offer.status}
                  </span>
                </article>
              );
            })}
          </div>

          {(data?.managerOffers || []).length === 0 && (
            <div className="v-panel py-14 text-center text-xs font-black uppercase italic text-white/25">
              Todavía no hay ofertas entre managers.
            </div>
          )}
        </section>
      )}

      {bidDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-v-navy/90 p-4 backdrop-blur-sm">
          <div className="v-panel w-full max-w-sm border-t-4 border-v-red p-6">
            <p className="text-[8px] font-black uppercase tracking-widest text-v-red">
              Puja oculta
            </p>
            <h3 className="mt-1 text-2xl font-black italic uppercase">
              {bidDialog.auction.player?.nickname}
            </h3>
            <p className="mt-2 text-xs text-white/45">
              Nadie podrá ver tu importe. Si modificas la puja, se actualizará
              su momento de envío.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-y border-white/5 py-3">
              <div>
                <p className="text-[7px] font-black uppercase text-white/25">
                  Exposición actual
                </p>
                <p className="text-sm font-black italic text-white">
                  {money(bidExposure)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[7px] font-black uppercase text-white/25">
                  Máximo para esta puja
                </p>
                <p className="text-sm font-black italic text-v-red">
                  {money(availableForCurrentBid)}
                </p>
              </div>
            </div>
            <input
              type="number"
              min={1}
              max={availableForCurrentBid}
              value={bidDialog.amount}
              onChange={(e) =>
                setBidDialog({ ...bidDialog, amount: e.target.value })
              }
              className="mt-4 w-full border border-white/10 bg-v-navy/60 px-4 py-3 text-lg font-black italic outline-none focus:border-v-red"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setBidDialog(null)}
                className="flex-1 border border-white/10 py-3 text-[9px] font-black uppercase text-white/50"
              >
                Cancelar
              </button>
              <button
                onClick={submitBid}
                className="flex-1 bg-v-red py-3 text-[9px] font-black uppercase text-white"
              >
                Guardar puja
              </button>
            </div>
          </div>
        </div>
      )}

      {editPriceDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-v-navy/90 p-4 backdrop-blur-sm">
          <div className="v-panel w-full max-w-sm border-t-4 border-v-red p-6">
            <p className="text-[8px] font-black uppercase tracking-widest text-v-red">
              Editar precio de venta
            </p>

            <h3 className="mt-1 text-2xl font-black italic uppercase">
              {editPriceDialog.listing.player?.nickname}
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-3 border-y border-white/5 py-3">
              <div>
                <p className="text-[7px] font-black uppercase text-white/25">
                  Mínimo
                </p>
                <p className="text-sm font-black italic text-white">
                  {money(editPriceDialog.listing.market_value_snapshot)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[7px] font-black uppercase text-white/25">
                  Máximo
                </p>
                <p className="text-sm font-black italic text-white">
                  {money(
                    Math.floor(
                      Number(
                        editPriceDialog.listing.market_value_snapshot || 0,
                      ) * 1.15,
                    ),
                  )}
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs text-white/45">
              Cambiar el precio no reinicia los 7 días de publicación.
            </p>

            <input
              type="number"
              min={editPriceDialog.listing.market_value_snapshot}
              max={Math.floor(
                Number(editPriceDialog.listing.market_value_snapshot || 0) *
                  1.15,
              )}
              step={100000}
              value={editPriceDialog.amount}
              onChange={(e) =>
                setEditPriceDialog({
                  ...editPriceDialog,
                  amount: e.target.value,
                })
              }
              className="mt-5 w-full border border-white/10 bg-v-navy/60 px-4 py-3 text-lg font-black italic outline-none focus:border-v-red"
            />

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setEditPriceDialog(null)}
                className="flex-1 border border-white/10 py-3 text-[9px] font-black uppercase text-white/50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={submitEditListingPrice}
                className="flex-1 bg-v-red py-3 text-[9px] font-black uppercase text-white"
              >
                Guardar precio
              </button>
            </div>
          </div>
        </div>
      )}

      {offerDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-v-navy/90 p-4 backdrop-blur-sm">
          <div className="v-panel w-full max-w-sm border-t-4 border-white p-6">
            <p className="text-[8px] font-black uppercase tracking-widest text-v-red">
              {offerDialog.offer ? "Editar oferta" : "Oferta al manager"}
            </p>
            <h3 className="mt-1 text-2xl font-black italic uppercase">
              {offerDialog.player?.nickname}
            </h3>
            <p className="mt-2 text-xs text-white/45">
              {offerDialog.offer
                ? "Ya tienes una oferta pendiente por este jugador. Al guardar, se modificará esa misma oferta."
                : "La oferta es solo económica. El propietario podrá aceptarla o rechazarla."}
            </p>
            <input
              type="number"
              value={offerDialog.amount}
              onChange={(e) =>
                setOfferDialog({ ...offerDialog, amount: e.target.value })
              }
              className="mt-5 w-full border border-white/10 bg-v-navy/60 px-4 py-3 text-lg font-black italic outline-none focus:border-v-red"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setOfferDialog(null)}
                className="flex-1 border border-white/10 py-3 text-[9px] font-black uppercase text-white/50"
              >
                Cancelar
              </button>
              <button
                onClick={submitManagerOffer}
                className="flex-1 bg-white py-3 text-[9px] font-black uppercase text-v-navy"
              >
                {offerDialog.offer ? "Guardar cambios" : "Enviar oferta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
