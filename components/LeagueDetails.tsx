"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getLeagueClassification,
  getLeagueGameweekOverview,
} from "@/lib/actions/leagues";
import { haptic } from "@/lib/utils/haptics";
import { sileo } from "sileo";

interface LeagueDetailsProps {
  leagueId: string;
  inviteCode: string;
  leagueName?: string;
  onBack: () => void;
}

type Team = {
  id?: string;
  name?: string;
  tag?: string;
  logo_url?: string | null;
  region?: string | null;
};

type RosterPlayer = {
  id: string;
  nickname: string;
  full_name?: string | null;
  role?: string | null;
  market_value?: number | null;
  photo_url?: string | null;
  country_code?: string | null;
  pro_teams?: Team | null;
  slot_type?: string | null;
  is_starter?: boolean | null;
  release_clause?: number | null;
};

type Standing = {
  rank?: number;
  profile_id: string;
  current_budget?: number;
  total_points?: number;

  profiles: {
    id: string;
    username?: string | null;
    avatar_url?: string | null;
  };

  roster: RosterPlayer[];
};

type Gameweek = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_locked: boolean;
  is_final: boolean;
};

type GameweekPlayer = RosterPlayer & {
  roster_id?: string;
  captured_at?: string;
  gameweek_points: number;
};

type GameweekStanding = {
  profile_id: string;

  profiles: {
    id: string;
    username?: string | null;
    avatar_url?: string | null;
  };

  total_points: number;
  gameweek_points: number;
  gameweek_rank: number | null;
  rewarded: boolean;

  lineup: GameweekPlayer[];
};

type GameweekOverview = {
  gameweeks: Gameweek[];
  selectedGameweek: Gameweek | null;
  standings: GameweekStanding[];
};

function formatMillions(value?: number | null) {
  return `${((Number(value) || 0) / 1_000_000).toFixed(1)}M €`;
}

function initials(value?: string | null) {
  if (!value) return "?";

  return value.trim().slice(0, 2).toUpperCase();
}

function PlayerImage({
  player,
  className = "",
}: {
  player: RosterPlayer;
  className?: string;
}) {
  if (player.photo_url) {
    return (
      <img
        src={player.photo_url}
        alt={player.nickname}
        loading="lazy"
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-v-red/10 text-sm font-black italic text-v-red ${className}`}
    >
      {initials(player.nickname)}
    </div>
  );
}

export default function LeagueDetails({
  leagueId,
  inviteCode,
  leagueName,
  onBack,
}: LeagueDetailsProps) {
  // ============================================================
  // GENERAL
  // ============================================================

  const [data, setData] = useState<Standing[]>([]);

  const [loading, setLoading] = useState(true);

  const [selectedManager, setSelectedManager] = useState<Standing | null>(null);

  // ============================================================
  // VISTA
  // ============================================================

  const [viewMode, setViewMode] = useState<"general" | "gameweeks">("general");

  // ============================================================
  // JORNADAS
  // ============================================================

  const [gameweekData, setGameweekData] = useState<GameweekOverview | null>(
    null,
  );

  const [gameweekLoading, setGameweekLoading] = useState(false);

  const [selectedGameweekId, setSelectedGameweekId] = useState<number | null>(
    null,
  );

  const [selectedGameweekManager, setSelectedGameweekManager] =
    useState<GameweekStanding | null>(null);

  // ============================================================
  // CARGAR CLASIFICACIÓN GENERAL
  // ============================================================

  useEffect(() => {
    async function load() {
      setLoading(true);

      try {
        const { standings } = await getLeagueClassification(leagueId);

        setData((standings ?? []) as Standing[]);
      } catch (err) {
        console.error(err);

        sileo.error({
          title: "No se pudo cargar la liga",
          description: "Inténtalo de nuevo.",
        });
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [leagueId]);

  // ============================================================
  // CARGAR JORNADA
  // ============================================================

  async function loadGameweekOverview(gameweekId?: number | null) {
    setGameweekLoading(true);

    try {
      const result = await getLeagueGameweekOverview(leagueId, gameweekId);

      const typed = result as GameweekOverview;

      setGameweekData(typed);

      if (typed.selectedGameweek) {
        setSelectedGameweekId(typed.selectedGameweek.id);
      }
    } catch (err) {
      console.error(err);

      sileo.error({
        title: "No se pudieron cargar las jornadas",
        description: "Inténtalo de nuevo.",
      });
    } finally {
      setGameweekLoading(false);
    }
  }

  useEffect(() => {
    if (viewMode !== "gameweeks") {
      return;
    }

    /*
     * Al entrar por primera vez en
     * JORNADAS cargamos la jornada
     * activa/última.
     */
    if (!gameweekData) {
      void loadGameweekOverview(null);
    }
  }, [viewMode, leagueId, gameweekData]);

  // ============================================================
  // BLOQUEAR SCROLL EN MODALES
  // ============================================================

  useEffect(() => {
    if (!selectedManager && !selectedGameweekManager) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedManager(null);
        setSelectedGameweekManager(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedManager, selectedGameweekManager]);

  // ============================================================
  // COMPARTIR CÓDIGO
  // ============================================================

  async function handleShareInviteCode() {
    const shareText = `Únete a mi liga${
      leagueName ? ` "${leagueName}"` : ""
    } con este código: ${inviteCode}`;

    try {
      if (navigator.share) {
        haptic.light();

        await navigator.share({
          title: leagueName ? `Liga ${leagueName}` : "Invitación a liga",

          text: shareText,
        });

        return;
      }

      await navigator.clipboard.writeText(inviteCode);

      haptic.success();

      sileo.success({
        title: "Código copiado",
        description: `Código ${inviteCode} copiado al portapapeles`,
      });
    } catch (err) {
      console.error(err);

      haptic.error();

      sileo.error({
        title: "No se pudo compartir",
        description: "Inténtalo de nuevo",
      });
    }
  }

  function openManager(manager: Standing) {
    haptic.light();

    setSelectedManager(manager);
  }

  // ============================================================
  // ROSTER ACTUAL DEL MANAGER
  // ============================================================

  const selectedRoster = useMemo(() => {
    if (!selectedManager) {
      return {
        starters: [] as RosterPlayer[],

        bench: [] as RosterPlayer[],

        squadValue: 0,
      };
    }

    const starters = selectedManager.roster.filter(
      (player) => player.is_starter || player.slot_type === "starter",
    );

    const bench = selectedManager.roster.filter(
      (player) => !(player.is_starter || player.slot_type === "starter"),
    );

    const squadValue = selectedManager.roster.reduce(
      (sum, player) => sum + Number(player.market_value || 0),

      0,
    );

    return {
      starters,
      bench,
      squadValue,
    };
  }, [selectedManager]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-500">
      {/* VOLVER */}
      <button
        onClick={onBack}
        className="flex w-fit items-center gap-2 text-[10px] font-black uppercase text-v-white/40 transition-colors hover:text-v-red"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Volver a mis ligas
      </button>

      {/* PANEL PRINCIPAL */}
      <div className="v-panel overflow-hidden p-0">
        {/* HEADER */}
        <div className="border-b border-white/5 p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-1 text-[8px] font-black uppercase tracking-[0.28em] text-v-red">
                Liga activa
              </p>

              <h2 className="text-3xl italic uppercase tracking-tighter text-v-white sm:text-4xl">
                {leagueName || "Clasificación"}
              </h2>

              <p className="mt-2 text-[9px] font-black uppercase tracking-[0.18em] text-v-white/25">
                {data.length} {data.length === 1 ? "manager" : "managers"} · ver
                plantillas
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div>
                <p className="mb-1.5 text-[8px] font-black uppercase tracking-[0.24em] text-v-white/30">
                  Código de invitación
                </p>

                <div className="border border-white/10 bg-v-navy/60 px-4 py-2.5 text-sm font-black italic tracking-[0.28em] text-v-white">
                  {inviteCode}
                </div>
              </div>

              <button
                onClick={handleShareInviteCode}
                className="v-btn-primary min-h-[42px] cursor-pointer px-5 py-2.5 text-[9px]"
              >
                Compartir código
              </button>
            </div>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="p-4 sm:p-6">
          {/* ============================================= */}
          {/* TABS */}
          {/* ============================================= */}

          <div className="mb-6 grid grid-cols-2 border border-white/5 bg-black/10">
            <button
              type="button"
              onClick={() => {
                haptic.light();

                setViewMode("general");

                setSelectedGameweekManager(null);
              }}
              className={`cursor-pointer py-3 text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                viewMode === "general"
                  ? "bg-v-red text-white"
                  : "text-v-white/30 hover:text-v-white"
              }`}
            >
              General
            </button>

            <button
              type="button"
              onClick={() => {
                haptic.light();

                setViewMode("gameweeks");

                setSelectedManager(null);
              }}
              className={`cursor-pointer py-3 text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                viewMode === "gameweeks"
                  ? "bg-v-red text-white"
                  : "text-v-white/30 hover:text-v-white"
              }`}
            >
              Jornadas
            </button>
          </div>

          {/* ============================================= */}
          {/* IMPORTANTE:
              SOLO SE RENDERIZA UNA DE LAS DOS VISTAS
          */}
          {/* ============================================= */}

          {viewMode === "general" ? (
            // ==========================================
            // GENERAL
            // ==========================================
            <>
              <div className="mb-3 grid grid-cols-[1fr_auto_auto] items-end gap-5 px-2">
                <h3 className="text-xl italic uppercase tracking-tighter">
                  Clasificación
                </h3>

                <span className="hidden text-[8px] font-black uppercase tracking-[0.2em] text-v-white/25 sm:block">
                  Valor
                </span>

                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-v-white/25">
                  Puntos
                </span>
              </div>

              <div className="overflow-hidden border border-white/5">
                {data.map((manager, index) => {
                  const username = manager.profiles?.username || "Manager";

                  const rosterValue = manager.roster.reduce(
                    (sum, player) => sum + Number(player.market_value || 0),
                    0,
                  );

                  return (
                    <button
                      key={manager.profile_id || manager.profiles.id}
                      type="button"
                      onClick={() => openManager(manager)}
                      className="group flex w-full cursor-pointer items-center gap-3 border-b border-white/5 bg-v-navy/10 px-3 py-3.5 text-left transition-all last:border-b-0 hover:bg-v-white/[0.035] sm:px-4"
                    >
                      <div className="w-7 shrink-0 text-center text-sm font-black italic text-v-red">
                        {manager.rank ?? index + 1}
                      </div>

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-v-navy text-[10px] font-black uppercase">
                        {manager.profiles?.avatar_url ? (
                          <img
                            src={manager.profiles.avatar_url}
                            alt={username}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initials(username)
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-black uppercase tracking-wider text-v-white transition-colors group-hover:text-v-red sm:text-[15px]">
                            {username}
                          </p>

                          <span className="hidden text-[8px] font-black uppercase tracking-widest text-v-white/35 sm:inline">
                            {manager.roster.length} jugadores
                          </span>
                        </div>

                        <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-v-white/35 sm:hidden">
                          Plantilla {formatMillions(rosterValue)}
                        </p>
                      </div>

                      <div className="hidden min-w-[92px] shrink-0 text-right sm:block">
                        <p className="text-sm font-black italic text-v-white/70">
                          {formatMillions(rosterValue)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <p className="min-w-[34px] text-right text-base font-black italic text-v-white sm:text-lg">
                          {(manager.total_points ?? 0).toLocaleString()}
                        </p>

                        <svg
                          className="h-4 w-4 text-v-white/15 transition-all group-hover:translate-x-0.5 group-hover:text-v-red"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </button>
                  );
                })}

                {!loading && data.length === 0 && (
                  <div className="py-14 text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-v-white/25">
                      No hay managers en la clasificación
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            // ==========================================
            // JORNADAS
            // ==========================================
            <div className="space-y-5">
              {/* SELECTOR */}
              <div className="flex flex-col gap-3 border-b border-white/5 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-1 text-[8px] font-black uppercase tracking-[0.25em] text-v-red">
                    Resultados Fantasy
                  </p>

                  <h3 className="text-xl font-black italic uppercase tracking-tighter">
                    {gameweekData?.selectedGameweek?.name ?? "Jornadas"}
                  </h3>
                </div>

                {gameweekData && gameweekData.gameweeks.length > 0 && (
                  <select
                    value={selectedGameweekId ?? ""}
                    onChange={async (event) => {
                      const value = Number(event.target.value);

                      if (!Number.isFinite(value)) {
                        return;
                      }

                      setSelectedGameweekId(value);

                      setSelectedGameweekManager(null);

                      await loadGameweekOverview(value);
                    }}
                    className="border border-white/10 bg-v-navy px-4 py-2.5 text-[9px] font-black uppercase tracking-wider text-v-white outline-none focus:border-v-red"
                  >
                    {gameweekData.gameweeks.map((gameweek) => (
                      <option key={gameweek.id} value={gameweek.id}>
                        {gameweek.name}
                        {gameweek.is_active ? " · ACTIVA" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {gameweekLoading ? (
                <div className="py-14 text-center">
                  <p className="animate-pulse text-[9px] font-black uppercase tracking-[0.3em] text-v-white/25">
                    Cargando jornada...
                  </p>
                </div>
              ) : !gameweekData?.selectedGameweek ? (
                <div className="py-14 text-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-v-white/25">
                    Todavía no hay jornadas
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-3 grid grid-cols-[1fr_auto_auto] items-end gap-5 px-2">
                    <h3 className="text-xl italic uppercase tracking-tighter">
                      Clasificación jornada
                    </h3>

                    <span className="hidden text-[8px] font-black uppercase tracking-[0.2em] text-v-white/25 sm:block">
                      Total
                    </span>

                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-v-white/25">
                      Jornada
                    </span>
                  </div>

                  <div className="overflow-hidden border border-white/5">
                    {gameweekData.standings.map((manager, index) => {
                      const username = manager.profiles?.username || "Manager";

                      return (
                        <button
                          key={manager.profile_id}
                          type="button"
                          onClick={() => {
                            haptic.light();

                            setSelectedGameweekManager(manager);
                          }}
                          className="group flex w-full cursor-pointer items-center gap-3 border-b border-white/5 bg-v-navy/10 px-3 py-3.5 text-left transition-all last:border-b-0 hover:bg-v-white/[0.035] sm:px-4"
                        >
                          <div className="w-7 shrink-0 text-center text-sm font-black italic text-v-red">
                            {manager.gameweek_rank ?? index + 1}
                          </div>

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-v-navy text-[10px] font-black uppercase">
                            {manager.profiles?.avatar_url ? (
                              <img
                                src={manager.profiles.avatar_url}
                                alt={username}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              initials(username)
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black uppercase tracking-wider text-v-white transition-colors group-hover:text-v-red sm:text-[15px]">
                              {username}
                            </p>

                            <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-v-white/35">
                              {manager.lineup.length} titulares
                            </p>
                          </div>

                          <div className="hidden min-w-[70px] shrink-0 text-right sm:block">
                            <p className="text-sm font-black italic text-v-white/40">
                              {manager.total_points.toLocaleString()}
                            </p>
                          </div>

                          <div className="flex min-w-[50px] shrink-0 items-center justify-end gap-2">
                            <p className="text-right text-lg font-black italic text-v-red">
                              {manager.gameweek_points.toLocaleString()}
                            </p>

                            <svg
                              className="h-4 w-4 text-v-white/15 transition-all group-hover:translate-x-0.5 group-hover:text-v-red"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2.5"
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </button>
                      );
                    })}

                    {gameweekData.standings.length === 0 && (
                      <div className="py-14 text-center">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-v-white/25">
                          No hay resultados para esta jornada
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ====================================================== */}
      {/* MODAL GENERAL */}
      {/* ====================================================== */}

      {selectedManager && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setSelectedManager(null);
            }
          }}
        >
          <div className="max-h-[92vh] w-full overflow-hidden border border-white/10 bg-v-navy shadow-2xl sm:max-w-3xl">
            <div className="flex items-start justify-between border-b border-white/5 p-5 sm:p-6">
              <div className="min-w-0">
                <p className="mb-1 text-[8px] font-black uppercase tracking-[0.25em] text-v-red">
                  Plantilla del manager
                </p>

                <h3 className="truncate text-3xl font-black italic uppercase tracking-tighter text-v-white">
                  {selectedManager.profiles?.username || "Manager"}
                </h3>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                  <div>
                    <p className="text-[7px] font-black uppercase tracking-widest text-v-white/25">
                      Puntos
                    </p>

                    <p className="mt-0.5 text-sm font-black italic">
                      {(selectedManager.total_points ?? 0).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-[7px] font-black uppercase tracking-widest text-v-white/25">
                      Valor plantilla
                    </p>

                    <p className="mt-0.5 text-sm font-black italic">
                      {formatMillions(selectedRoster.squadValue)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[7px] font-black uppercase tracking-widest text-v-white/25">
                      Jugadores
                    </p>

                    <p className="mt-0.5 text-sm font-black italic">
                      {selectedManager.roster.length}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedManager(null)}
                className="ml-4 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center border border-white/10 text-v-white/40 transition-colors hover:border-v-red hover:text-v-red"
                aria-label="Cerrar plantilla"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[calc(92vh-150px)] overflow-y-auto p-4 sm:p-6">
              <RosterSection
                title="Titulares"
                subtitle="Puntúan en la jornada"
                players={selectedRoster.starters}
                accent
              />

              {selectedRoster.bench.length > 0 && (
                <div className="mt-7 border-t border-white/5 pt-6">
                  <RosterSection
                    title="Banquillo"
                    subtitle="No puntúan mientras sean suplentes"
                    players={selectedRoster.bench}
                  />
                </div>
              )}

              {selectedManager.roster.length === 0 && (
                <div className="py-14 text-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-v-white/25">
                    Sin jugadores asignados
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* MODAL JORNADA */}
      {/* ====================================================== */}

      {selectedGameweekManager && (
        <div
          className="fixed inset-0 z-[75] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setSelectedGameweekManager(null);
            }
          }}
        >
          <div className="max-h-[92vh] w-full overflow-hidden border border-white/10 bg-v-navy shadow-2xl sm:max-w-3xl">
            <div className="flex items-start justify-between border-b border-white/5 p-5 sm:p-6">
              <div>
                <p className="mb-1 text-[8px] font-black uppercase tracking-[0.25em] text-v-red">
                  Alineación de la jornada
                </p>

                <h3 className="text-3xl font-black italic uppercase tracking-tighter">
                  {selectedGameweekManager.profiles?.username || "Manager"}
                </h3>

                <div className="mt-3 flex gap-6">
                  <div>
                    <p className="text-[7px] font-black uppercase tracking-widest text-v-white/25">
                      Jornada
                    </p>

                    <p className="mt-0.5 text-sm font-black italic text-v-red">
                      {selectedGameweekManager.gameweek_points.toLocaleString()}{" "}
                      pts
                    </p>
                  </div>

                  <div>
                    <p className="text-[7px] font-black uppercase tracking-widest text-v-white/25">
                      Posición
                    </p>

                    <p className="mt-0.5 text-sm font-black italic">
                      #{selectedGameweekManager.gameweek_rank ?? "-"}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGameweekManager(null)}
                className="ml-4 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center border border-white/10 text-v-white/40 transition-colors hover:border-v-red hover:text-v-red"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[calc(92vh-150px)] overflow-y-auto p-4 sm:p-6">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h4 className="text-lg font-black italic uppercase tracking-tight">
                    Titulares
                  </h4>

                  <p className="text-[7px] font-black uppercase tracking-[0.18em] text-v-red">
                    Alineación congelada de la jornada
                  </p>
                </div>

                <span className="text-[8px] font-black uppercase tracking-widest text-v-white/20">
                  {selectedGameweekManager.lineup.length}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {selectedGameweekManager.lineup.map((player) => (
                  <div
                    key={player.id}
                    className="group flex min-w-0 items-center gap-4 overflow-hidden border border-white/5 bg-black/15 p-3"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden border border-white/10 bg-black/20">
                      <PlayerImage player={player} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black italic uppercase">
                            {player.nickname}
                          </p>

                          <p className="mt-1 truncate text-[8px] font-black uppercase tracking-[0.1em] text-v-white/35">
                            {player.pro_teams?.tag || "FA"} ·{" "}
                            {player.role || "Sin rol"}
                          </p>
                        </div>

                        <span className="shrink-0 bg-v-red/10 px-2 py-1 text-[9px] font-black italic text-v-red">
                          {player.gameweek_points.toLocaleString()} pts
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedGameweekManager.lineup.length === 0 && (
                <div className="py-14 text-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-v-white/25">
                    No hay snapshot de alineación para esta jornada
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LOADING GENERAL */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-v-navy/80 backdrop-blur-sm">
          <p className="animate-pulse text-[10px] font-black uppercase tracking-[0.5em]">
            Cargando liga...
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ROSTER SECTION
// ============================================================

function RosterSection({
  title,
  subtitle,
  players,
  accent = false,
}: {
  title: string;
  subtitle: string;
  players: RosterPlayer[];
  accent?: boolean;
}) {
  if (players.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h4 className="text-lg font-black italic uppercase tracking-tight text-v-white">
            {title}
          </h4>

          <p
            className={`text-[7px] font-black uppercase tracking-[0.18em] ${
              accent ? "text-v-red" : "text-v-white/25"
            }`}
          >
            {subtitle}
          </p>
        </div>

        <span className="text-[8px] font-black uppercase tracking-widest text-v-white/20">
          {players.length}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {players.map((player) => (
          <div
            key={player.id}
            className="group flex min-w-0 items-center gap-4 overflow-hidden border border-white/5 bg-black/15 p-3 transition-colors hover:border-v-red/30"
          >
            <div className="h-16 w-16 shrink-0 overflow-hidden border border-white/10 bg-black/20">
              <PlayerImage player={player} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black italic uppercase text-v-white transition-colors group-hover:text-v-red">
                    {player.nickname}
                  </p>

                  <div className="mt-1 flex min-w-0 items-center gap-1.5">
                    {player.pro_teams?.logo_url ? (
                      <img
                        src={player.pro_teams.logo_url}
                        alt={player.pro_teams?.tag || ""}
                        loading="lazy"
                        className="h-3.5 w-3.5 shrink-0 object-contain opacity-70"
                      />
                    ) : null}

                    <p className="truncate text-[8px] font-black uppercase tracking-[0.1em] text-v-white/35">
                      {player.pro_teams?.tag || "FA"} ·{" "}
                      {player.role || "Sin rol"}
                    </p>
                  </div>
                </div>

                {player.is_starter || player.slot_type === "starter" ? (
                  <span className="shrink-0 bg-v-red/10 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-widest text-v-red">
                    Titular
                  </span>
                ) : null}
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-1.5">
                <span className="text-[7px] font-black uppercase text-v-white/20">
                  Valor
                </span>

                <span className="text-[9px] font-black italic text-v-white/70">
                  {formatMillions(player.market_value)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
