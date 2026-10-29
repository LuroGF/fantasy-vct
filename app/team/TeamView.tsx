"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { haptic } from "@/lib/utils/haptics";
// import { FeedbackBanner } from "@/components/FeedbackBanner";
import { sileo } from "sileo";
import type { LineupWindowStatus } from "@/lib/actions/roster";

interface TeamViewProps {
  initialRoster: any[];
  initialLeagues: any[];
  initialLeagueId: string;
  lineupStatus: LineupWindowStatus;
  profileId: string;
}

export default function TeamView({
  initialRoster,
  initialLeagues,
  initialLeagueId,
  lineupStatus,
  profileId,
}: TeamViewProps) {
  const [roster, setRoster] = useState(initialRoster);
  const [activeLeagueId, setActiveLeagueId] = useState(initialLeagueId);
  const [leagues] = useState(initialLeagues);
  const [loading, setLoading] = useState(false);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [myListings, setMyListings] = useState<any[]>([]);

  const [listingDialog, setListingDialog] = useState<{
    show: boolean;
    player: any | null;
    price: string;
  }>({
    show: false,
    player: null,
    price: "",
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [listingSaving, setListingSaving] = useState(false);
  const listingInFlight = useRef(false);
  const [listingError, setListingError] = useState<string | null>(null);

  function successAlert(title: string, description?: string) {
    sileo.success({
      title,
      description,
      duration: 7000,
    } as any);
  }

  function errorAlert(title: string, description?: string) {
    sileo.error({
      title,
      description,
      duration: 9000,
    } as any);
  }
  // Preserve the exact price; rounding to tenths can violate the V1 range.
  function priceInMillions(price: number) {
    return String(price / 1_000_000);
  }

  function closeListingDialog() {
    if (listingInFlight.current) return;
    setListingError(null);
    setListingSaving(false);
    setListingDialog({ show: false, player: null, price: "" });
  }

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

  const activeParticipation = useMemo(
    () => leagues.find((l) => l.leagues.id === activeLeagueId),
    [activeLeagueId, leagues],
  );

  const starters = useMemo(
    () =>
      roster.filter((r) => r.is_starter === true || r.slot_type === "starter"),
    [roster],
  );

  const substitutes = useMemo(
    () =>
      roster.filter(
        (r) =>
          r.slot_type === "bench" ||
          r.slot_type === "substitute" ||
          (!r.is_starter && r.slot_type !== "starter"),
      ),
    [roster],
  );

  const lineupDate = lineupStatus.gameweek
    ? new Intl.DateTimeFormat("es-ES", {
        timeZone: "Europe/Madrid",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(lineupStatus.gameweek.start_date))
    : null;

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      try {
        const { getUserFullRoster } = await import("@/lib/actions/roster");
        const { getMarketDashboard } = await import("@/lib/actions/market");

        const [rosterData, marketData] = await Promise.all([
          getUserFullRoster(activeLeagueId, profileId),
          getMarketDashboard(activeLeagueId, profileId),
        ]);

        setRoster(rosterData);
        setAuctions(marketData.auctions || []);
        setMyListings(marketData.myListings || []);
      } finally {
        setLoading(false);
      }
    }

    if (activeLeagueId) {
      void loadData();
    }
  }, [activeLeagueId, profileId, refreshTrigger]);

  async function handleSlotChange(
    player_id: string,
    nickname: string,
    newSlot: "starter" | "bench",
  ) {
    const actionText =
      newSlot === "starter" ? "Ascender a Titular" : "Mover al Banquillo";

    setConfirmDialog({
      show: true,
      title: actionText,
      message: `¿Deseas mover a ${nickname} a ${newSlot === "starter" ? "Titulares" : "Suplentes"}?`,
      onConfirm: async () => {
        haptic.medium();
        setLoading(true);

        // Validaciones (mejor mantenerlas fuera del promise)
        if (newSlot === "starter" && starters.length >= 5) {
          sileo.error({
            title: "Límite alcanzado",
            description: "Máximo 5 titulares.",
          });
          setLoading(false);
          return;
        }

        const { setStarterStatus } = await import("@/lib/actions/roster");

        try {
          const res = await setStarterStatus(
            activeLeagueId,
            profileId,
            player_id,
            newSlot,
          );

          if (!res.success) {
            throw new Error(
              res.error || "No se pudo actualizar la alineación.",
            );
          }

          setRoster((prev) =>
            prev.map((r) =>
              r.player_id === player_id
                ? {
                    ...r,
                    slot_type: newSlot,
                    is_starter: newSlot === "starter",
                  }
                : r,
            ),
          );

          setRefreshTrigger((prev) => prev + 1);

          haptic.success();

          successAlert(
            newSlot === "starter"
              ? "Jugador ascendido"
              : "Jugador al banquillo",
            newSlot === "starter"
              ? `${nickname} ahora forma parte del quinteto titular.`
              : `${nickname} ha pasado al banquillo.`,
          );
        } catch (error: any) {
          haptic.error();

          errorAlert(
            "No se pudo cambiar la alineación",
            error instanceof Error
              ? error.message
              : "No se pudo completar la operación.",
          );
        } finally {
          setLoading(false);
        }
        setLoading(false);
      },
    });
  }

  function handleSell(rosterEntry: any) {
    if (listingInFlight.current) return;
    setListingError(null);
    setListingSaving(false);
    setListingDialog({
      show: true,
      player: {
        ...rosterEntry.pro_players,
        roster_id: rosterEntry.id,
      },
      price: priceInMillions(Number(rosterEntry.pro_players.market_value)),
    });
  }

  async function confirmListing() {
    if (listingInFlight.current) return;
    setListingError(null);
    const player = listingDialog.player;

    if (!player?.roster_id || !profileId) {
      setListingError(
        "No se ha encontrado el jugador o la sesión no es válida.",
      );
      return;
    }

    const minPrice = Number(player.market_value);
    const maxPrice = Math.floor(minPrice * 1.15);
    if (!Number.isSafeInteger(minPrice) || minPrice <= 0) {
      setListingError("El valor de mercado del jugador no es válido.");
      return;
    }

    const normalizedPrice = listingDialog.price.trim().replace(",", ".");
    const askingPrice = Math.round(Number(normalizedPrice) * 1_000_000);
    if (
      !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalizedPrice) ||
      !Number.isSafeInteger(askingPrice) ||
      askingPrice <= 0
    ) {
      setListingError("Introduce un precio válido en millones de euros.");
      return;
    }
    if (askingPrice < minPrice || askingPrice > maxPrice) {
      setListingError(
        "El precio debe estar entre " +
          priceInMillions(minPrice) +
          " y " +
          priceInMillions(maxPrice) +
          " M € (100%–115%).",
      );
      return;
    }

    listingInFlight.current = true;
    setListingSaving(true);
    try {
      const { listPlayerForSale } = await import("@/lib/actions/market");
      const res = await listPlayerForSale(
        player.roster_id,
        askingPrice,
        profileId,
      );
      if (!res.success) {
        throw new Error(res.error || "No se pudo poner el jugador en venta.");
      }

      // Close only after the server confirms the listing, before optional feedback.
      setListingDialog({
        show: false,
        player: null,
        price: "",
      });

      setRefreshTrigger((prev) => prev + 1);

      haptic.success();

      successAlert(
        "Jugador puesto en venta",
        `${player.nickname} ya puede recibir ofertas.`,
      );
    } catch (error) {
      setListingError(
        error instanceof Error
          ? error.message
          : "No se pudo completar la operación",
      );
    } finally {
      listingInFlight.current = false;
      setListingSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Selector de Liga */}
      <div className="v-panel bg-v-navy/20 border-white/5 p-5 space-y-6">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black uppercase text-v-red tracking-[0.3em] ml-1">
            Elige tu liga
          </label>
          <div className="relative group">
            <select
              value={activeLeagueId}
              onChange={(e) => setActiveLeagueId(e.target.value)}
              className="w-full bg-v-navy/80 border border-white/10 rounded-sm px-4 py-3 text-sm font-black italic uppercase focus:border-v-red outline-none transition-all appearance-none cursor-pointer"
            >
              {leagues.map((l) => (
                <option key={l.leagues.id} value={l.leagues.id}>
                  {l.leagues.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-v-red">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  d="M19 9l-7 7-7-7"
                ></path>
              </svg>
            </div>
          </div>
        </div>

        {activeParticipation && (
          <div className="grid grid-cols-2 gap-4 relative">
            <div className="bg-black/40 backdrop-blur-md p-4 rounded-sm border border-white/5 hover:border-v-red/30 transition-colors group">
              <p className="text-[8px] font-black uppercase text-white/40 mb-1 cursor-default group-hover:text-v-red/60">
                Presupuesto
              </p>
              <p className="text-2xl max-sm:text-xl font-black italic tracking-wider cursor-default text-white group-hover:scale-105 origin-left transition-transform">
                {(activeParticipation.current_budget / 1000000).toFixed(1)}M €
              </p>
            </div>
            <div className="bg-black/40 backdrop-blur-md p-4 rounded-sm border border-white/5 hover:border-white/20 transition-colors group">
              <p className="text-[8px] font-black uppercase text-white/40 mb-1 cursor-default group-hover:text-white/60">
                Jugadores
              </p>
              <p className="text-2xl font-black italic tracking-wider cursor-default text-white group-hover:scale-105 origin-left transition-transform">
                {roster.length}
              </p>
            </div>
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-v-red shadow-[0_0_10px_rgba(255,70,85,0.5)]" />
          </div>
        )}
      </div>

      {/* <FeedbackBanner status={status} /> */}

      <div
        className={`v-panel p-4 border-l-2 ${
          lineupStatus.locked
            ? "border-v-red bg-v-red/5"
            : starters.length === 5
              ? "border-green-500/60 bg-green-500/5"
              : "border-amber-400/60 bg-amber-400/5"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
              {lineupStatus.locked
                ? "Quinteto bloqueado"
                : lineupStatus.state === "preseason"
                  ? "Pretemporada · Quinteto abierto"
                  : "Quinteto abierto"}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/45">
              {lineupStatus.locked
                ? `${lineupStatus.gameweek?.name || "La jornada"} ya ha comenzado. Esta alineación no puede modificarse.`
                : lineupStatus.gameweek && lineupDate
                  ? `${lineupStatus.gameweek.name} comienza el ${lineupDate}. Puedes ajustar los titulares hasta entonces.`
                  : "Puedes preparar tu quinteto mientras se publica el calendario de 2027."}
            </p>
          </div>
          <span
            className={`shrink-0 text-sm font-black italic ${
              starters.length === 5 ? "text-green-400" : "text-amber-300"
            }`}
          >
            {starters.length}/5
          </span>
        </div>
        {!lineupStatus.locked && starters.length !== 5 && (
          <p className="mt-3 text-[9px] font-black uppercase tracking-wider text-amber-300">
            Necesitas cinco titulares para puntuar y recibir premio de jornada.
          </p>
        )}
      </div>

      {/* Titulares (5) */}
      <div className="space-y-4">
        <h2 className="text-2xl italic tracking-tighter uppercase px-1">
          Quinteto Titular{" "}
          <span className="text-sm font-black text-v-red ml-2">
            {starters.length}/5
          </span>
        </h2>
        <div className="grid gap-3">
          {starters.map((r) => (
            <div key={r.player_id} className="pl-2">
              <PlayerCard
                player={{ ...r.pro_players, releaseClause: r.release_clause }}
                onAction={() =>
                  handleSlotChange(r.player_id, r.pro_players.nickname, "bench")
                }
                actionLabel="A Suplentes"
                actionDisabled={lineupStatus.locked}
                onSecondAction={
                  myListings.some((listing) => listing.roster_id === r.id)
                    ? undefined
                    : () => handleSell(r)
                }
                secondActionLabel="Vender"
                secondActionClassName="text-v-red hover:bg-v-red/10"
                inAuction={auctions.some(
                  (a) =>
                    a.player_id === r.player_id && a.seller_id === profileId,
                )}
              />
            </div>
          ))}
          {starters.length < 5 &&
            Array.from({ length: 5 - starters.length }).map((_, i) => (
              <div
                key={`empty-s-${i}`}
                className="v-panel border-dashed border-v-white/10 h-24 flex items-center justify-center opacity-30"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                  Espacio Titular
                </p>
              </div>
            ))}
        </div>
      </div>

      {/* Suplentes */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <h2 className="text-2xl italic tracking-tighter uppercase px-1 text-v-white/70">
          Suplentes Próx. Jornada{" "}
          <span className="text-sm font-black text-v-red ml-2">
            {substitutes.length}
          </span>
        </h2>
        <div className="grid gap-3">
          {substitutes.map((r) => (
            <div
              key={r.player_id}
              className="border-l-4 border-v-white/50 pl-2"
            >
              <PlayerCard
                player={{ ...r.pro_players, releaseClause: r.release_clause }}
                onAction={() =>
                  handleSlotChange(
                    r.player_id,
                    r.pro_players.nickname,
                    "starter",
                  )
                }
                actionLabel="Ascender a Titular"
                actionDisabled={lineupStatus.locked}
                onSecondAction={
                  myListings.some((listing) => listing.roster_id === r.id)
                    ? undefined
                    : () => handleSell(r)
                }
                secondActionLabel="Vender"
                secondActionClassName="text-v-red hover:bg-v-red/10"
                inAuction={auctions.some(
                  (a) =>
                    a.player_id === r.player_id && a.seller_id === profileId,
                )}
              />
            </div>
          ))}
          {substitutes.length === 0 && (
            <div className="v-panel border-dashed border-v-white/10 h-24 flex items-center justify-center opacity-20">
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                Sin suplentes
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Player Listing Dialog */}
      {listingDialog.show && listingDialog.player && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-v-navy/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="v-panel w-full max-w-sm p-6 space-y-6 border-t-4 border-v-red animate-in zoom-in-95 duration-200">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-v-white/40 tracking-widest">
                Poner en Venta
              </p>
              <h3 className="text-2xl font-black italic uppercase leading-none">
                {listingDialog.player.nickname}
              </h3>
              <p className="text-[10px] font-black uppercase text-v-red tracking-widest">
                {listingDialog.player.pro_teams?.name}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-v-white/60">
                  Precio de venta (M €)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    disabled={listingSaving}
                    aria-invalid={Boolean(listingError)}
                    aria-describedby={
                      listingError ? "listing-error" : undefined
                    }
                    value={listingDialog.price}
                    onChange={(e) => {
                      setListingError(null);
                      setListingDialog((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }));
                    }}
                    className="flex-1 bg-v-navy/50 border border-white/10 px-4 py-3 text-lg font-black italic focus:border-v-red outline-none transition-colors"
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={listingSaving}
                      onClick={() =>
                        setListingDialog((prev) => ({
                          ...prev,
                          price: (
                            Number(listingDialog.player!.market_value) / 1000000
                          ).toString(),
                        }))
                      }
                      className="px-3 py-1 bg-v-navy/80 border border-white/5 text-[8px] font-black uppercase hover:bg-v-red/20 transition-colors"
                    >
                      MIN
                    </button>
                    <button
                      type="button"
                      disabled={listingSaving}
                      onClick={() =>
                        setListingDialog((prev) => ({
                          ...prev,
                          price: (
                            Math.floor(
                              Number(listingDialog.player!.market_value) * 1.15,
                            ) / 1000000
                          ).toString(),
                        }))
                      }
                      className="px-3 py-1 bg-v-navy/80 border border-white/5 text-[8px] font-black uppercase hover:bg-v-red/20 transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                </div>
                <div className="flex justify-between text-[8px] font-black uppercase text-v-white/30 px-1">
                  <span>
                    Rango:{" "}
                    {(
                      Number(listingDialog.player.market_value) / 1000000
                    ).toString()}
                    M € -{" "}
                    {(
                      Math.floor(
                        Number(listingDialog.player.market_value) * 1.15,
                      ) / 1000000
                    ).toString()}
                    M €
                  </span>
                </div>
              </div>

              {listingError && (
                <p
                  id="listing-error"
                  role="alert"
                  className="text-xs text-v-red"
                >
                  {listingError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={listingSaving}
                  onClick={closeListingDialog}
                  className="flex-1 py-3 text-[9px] font-black uppercase disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={listingSaving}
                  onClick={confirmListing}
                  className="flex-1 bg-v-red py-3 text-[9px] font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {listingSaving ? "PUBLICANDO..." : "PONER EN VENTA"}
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
              <h3 className="text-xl font-black italic uppercase leading-tight tracking-wider">
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
                className="w-full cursor-pointer py-4 bg-v-white text-v-navy text-[10px] font-black uppercase tracking-[0.2em] hover:bg-v-red hover:text-v-white transition-all italic shadow-xl shadow-v-red/10"
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
                className="w-full py-2 text-[8px] cursor-pointer font-black uppercase text-v-white/20 hover:text-v-white transition-colors tracking-widest"
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
