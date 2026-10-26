"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  dismissLeagueReport,
  getLeagueClassification,
  getLeagueGameweekOverview,
  kickLeagueMember,
  reportLeagueMember,
} from "@/lib/actions/leagues";
import { haptic } from "@/lib/utils/haptics";
import { sileo } from "sileo";
import { Crown, Flag, UserMinus } from "lucide-react";

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

type LeagueReport = {
  id: string;
  reporter_id: string;
  target_profile_id: string;
  reporter_name: string;
  target_name: string;
  reason: "inactivity" | "unsportsmanlike";
  details?: string | null;
  created_at: string;
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [leaderId, setLeaderId] = useState<string | null>(null);
  const [reports, setReports] = useState<LeagueReport[]>([]);
  const [managerModalTab, setManagerModalTab] = useState<"roster" | "points">("roster");
  const [reportTarget, setReportTarget] = useState<Standing | null>(null);
  const [reportReason, setReportReason] = useState<"inactivity" | "unsportsmanlike">("inactivity");
  const [reportDetails, setReportDetails] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // ============================================================
  // VISTA
  // ============================================================

  const [viewMode, setViewMode] = useState<"general" | "gameweeks" | "management">("general");

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
        const result = await getLeagueClassification(leagueId);

        setData((result.standings ?? []) as Standing[]);
        setCurrentUserId(result.currentUserId);
        setLeaderId(result.leaderId);
        setReports((result.reports ?? []) as LeagueReport[]);
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
    setManagerModalTab("roster");
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

  const selectedManagerGameweek = useMemo(
    () =>
      gameweekData?.standings.find(
        (manager) => manager.profile_id === selectedManager?.profile_id,
      ) ?? null,
    [gameweekData, selectedManager],
  );

  async function refreshClassification() {
    const result = await getLeagueClassification(leagueId);
    setData((result.standings ?? []) as Standing[]);
    setCurrentUserId(result.currentUserId);
    setLeaderId(result.leaderId);
    setReports((result.reports ?? []) as LeagueReport[]);
  }

  async function handleKick(profileId: string) {
    if (!window.confirm("¿Expulsar a este entrenador de la liga? Esta acción libera su plantilla.")) return;
    setActionLoading(true);
    const result = await kickLeagueMember(leagueId, profileId);
    if (result.success) {
      sileo.success({ title: "Entrenador expulsado", description: "La plantilla ha quedado liberada." });
      setSelectedManager(null);
      await refreshClassification();
    } else {
      sileo.error({ title: "No se pudo expulsar", description: result.error || "Inténtalo de nuevo." });
    }
    setActionLoading(false);
  }

  async function handleReportSubmit() {
    if (!reportTarget) return;
    setActionLoading(true);
    const result = await reportLeagueMember(
      leagueId,
      reportTarget.profile_id,
      reportReason,
      reportDetails,
    );
    if (result.success) {
      sileo.success({ title: "Reporte enviado", description: "El líder de la liga podrá revisarlo." });
      setReportTarget(null);
      setReportDetails("");
    } else {
      sileo.error({ title: "No se pudo enviar", description: result.error || "Inténtalo de nuevo." });
    }
    setActionLoading(false);
  }

  async function handleDismissReport(reportId: string) {
    setActionLoading(true);
    const result = await dismissLeagueReport(reportId);
    if (result.success) {
      await refreshClassification();
      sileo.success({ title: "Reporte archivado" });
    } else {
      sileo.error({ title: "No se pudo archivar", description: result.error || "Inténtalo de nuevo." });
    }
    setActionLoading(false);
  }

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
              <p className="mb-1 flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.28em] text-v-red">
                Liga activa
                {leaderId === currentUserId && (
                  <span className="flex items-center gap-1 border border-v-red/30 px-2 py-0.5">
                    <Crown className="h-3 w-3" /> Líder
                  </span>
                )}
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

          <div className={`mb-6 grid border border-white/5 bg-black/10 ${leaderId === currentUserId ? "grid-cols-3" : "grid-cols-2"}`}>
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

            {leaderId === currentUserId && (
              <button
                type="button"
                onClick={() => {
                  haptic.light();
                  setViewMode("management");
                  setSelectedManager(null);
                  setSelectedGameweekManager(null);
                }}
                className={`cursor-pointer py-3 text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                  viewMode === "management"
                    ? "bg-v-red text-white"
                    : "text-v-white/30 hover:text-v-white"
                }`}
              >
                Gestión {reports.length > 0 ? `(${reports.length})` : ""}
              </button>
            )}
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
                           <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-black uppercase tracking-wider text-v-white transition-colors group-hover:text-v-red sm:text-[15px]">
                              <span className="truncate">{username}</span>
                              {manager.profile_id === leaderId && (
                                <Crown className="h-3 w-3 shrink-0 text-v-red" aria-label="Líder de la liga" />
                              )}
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
          ) : viewMode === "gameweeks" ? (
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
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.25em] text-v-red">
                  Moderación
                </p>
                <h3 className="text-xl font-black italic uppercase tracking-tighter">
                  Reportes pendientes
                </h3>
                <p className="mt-1 text-[9px] text-v-white/35">
                  Revisa el contexto antes de expulsar a un entrenador.
                </p>
              </div>

              {reports.length > 0 ? (
                <div className="grid gap-3">
                  {reports.map((report) => (
                    <article key={report.id} className="border border-white/10 bg-black/15 p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-black uppercase italic">
                            {report.target_name}
                          </p>
                          <p className="mt-1 text-[8px] font-black uppercase tracking-wider text-v-red">
                            {report.reason === "inactivity" ? "Inactividad" : "Conducta antideportiva"}
                          </p>
                          <p className="mt-2 text-[9px] text-v-white/40">
                            Reportado por {report.reporter_name} · {new Date(report.created_at).toLocaleDateString("es-ES")}
                          </p>
                          {report.details && (
                            <p className="mt-3 text-xs leading-relaxed text-v-white/65">{report.details}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => void handleDismissReport(report.id)}
                            className="v-btn-secondary px-3 py-2 text-[8px] disabled:opacity-50"
                          >
                            Archivar
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => void handleKick(report.target_profile_id)}
                            className="v-btn-primary px-3 py-2 text-[8px] disabled:opacity-50"
                          >
                            Expulsar
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-white/10 py-14 text-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-v-white/25">
                    No hay reportes pendientes
                  </p>
                </div>
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
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/75 p-0 backdrop-blur-sm sm:p-4 sm:py-6"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setSelectedManager(null);
            }
          }}
        >
          <div className="flex max-h-[100dvh] w-full flex-col overflow-hidden border border-white/10 bg-v-navy shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:max-w-3xl">
            <div className="flex shrink-0 items-start justify-between border-b border-white/5 p-5 sm:p-6">
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

                {selectedManager.profile_id !== currentUserId && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {leaderId === currentUserId ? (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => void handleKick(selectedManager.profile_id)}
                        className="flex items-center gap-2 border border-v-red/40 bg-v-red/10 px-3 py-2 text-[8px] font-black uppercase tracking-wider text-v-red disabled:opacity-50"
                      >
                        <UserMinus className="h-3 w-3" /> Expulsar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setReportTarget(selectedManager)}
                        className="flex items-center gap-2 border border-white/10 px-3 py-2 text-[8px] font-black uppercase tracking-wider text-v-white/55 hover:border-v-red hover:text-v-red"
                      >
                        <Flag className="h-3 w-3" /> Reportar
                      </button>
                    )}
                  </div>
                )}
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

            <div className="grid shrink-0 grid-cols-2 border-b border-white/5 bg-black/10">
              <button
                type="button"
                onClick={() => setManagerModalTab("roster")}
                className={`py-3 text-[9px] font-black uppercase tracking-[0.2em] ${managerModalTab === "roster" ? "bg-v-red text-white" : "text-v-white/35"}`}
              >
                Plantilla
              </button>
              <button
                type="button"
                onClick={() => {
                  setManagerModalTab("points");
                  if (!gameweekData) void loadGameweekOverview(null);
                }}
                className={`py-3 text-[9px] font-black uppercase tracking-[0.2em] ${managerModalTab === "points" ? "bg-v-red text-white" : "text-v-white/35"}`}
              >
                Puntos
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {managerModalTab === "roster" ? (
                <>
                  <RosterSection
                    leagueId={leagueId}
                    title="Titulares"
                    subtitle="Puntúan en la jornada"
                    players={selectedRoster.starters}
                    accent
                  />

                  {selectedRoster.bench.length > 0 && (
                    <div className="mt-7 border-t border-white/5 pt-6">
                      <RosterSection
                        leagueId={leagueId}
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
                </>
              ) : (
                <div className="space-y-5">
                  {gameweekData && gameweekData.gameweeks.length > 0 && (
                    <select
                      value={selectedGameweekId ?? ""}
                      onChange={async (event) => {
                        const value = Number(event.target.value);
                        if (Number.isFinite(value)) await loadGameweekOverview(value);
                      }}
                      className="w-full border border-white/10 bg-v-navy px-4 py-3 text-[9px] font-black uppercase tracking-wider outline-none focus:border-v-red"
                    >
                      {gameweekData.gameweeks.map((gameweek) => (
                        <option key={gameweek.id} value={gameweek.id}>
                          {gameweek.name}{gameweek.is_active ? " · ACTIVA" : ""}
                        </option>
                      ))}
                    </select>
                  )}

                  {gameweekLoading ? (
                    <p className="py-14 text-center text-[9px] font-black uppercase tracking-[0.25em] text-v-white/30">Cargando jornada...</p>
                  ) : selectedManagerGameweek ? (
                    <>
                      <div className="flex items-end justify-between border-b border-white/5 pb-4">
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-wider text-v-white/30">Resultado de la jornada</p>
                          <p className="mt-1 text-2xl font-black italic text-v-red">{selectedManagerGameweek.gameweek_points.toLocaleString()} pts</p>
                        </div>
                        <p className="text-sm font-black italic">#{selectedManagerGameweek.gameweek_rank ?? "-"}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {selectedManagerGameweek.lineup.map((player) => (
                          <Link
                            key={player.id}
                            href={`/players/${player.id}?league=${leagueId}`}
                            className="group flex min-w-0 items-center gap-3 border border-white/5 bg-black/15 p-3 hover:border-v-red/30"
                          >
                            <div className="h-14 w-14 shrink-0 overflow-hidden border border-white/10 bg-black/20">
                              <PlayerImage player={player} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate pr-1 text-sm font-black italic uppercase">{player.nickname}</p>
                              <p className="mt-1 text-[8px] font-black uppercase text-v-white/30">{player.pro_teams?.tag || "FA"} · {player.role || "Sin rol"}</p>
                            </div>
                            <span className="shrink-0 text-sm font-black italic text-v-red">{player.gameweek_points.toLocaleString()} pts</span>
                          </Link>
                        ))}
                      </div>
                      {selectedManagerGameweek.lineup.length === 0 && (
                        <p className="py-14 text-center text-[9px] font-black uppercase tracking-[0.25em] text-v-white/25">Sin alineación congelada para esta jornada</p>
                      )}
                    </>
                  ) : (
                    <p className="py-14 text-center text-[9px] font-black uppercase tracking-[0.25em] text-v-white/25">Todavía no hay puntos para esta jornada</p>
                  )}
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
          className="fixed inset-0 z-[75] flex items-start justify-center overflow-y-auto bg-black/75 p-0 backdrop-blur-sm sm:p-4 sm:py-6"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setSelectedGameweekManager(null);
            }
          }}
        >
          <div className="flex max-h-[100dvh] w-full flex-col overflow-hidden border border-white/10 bg-v-navy shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:max-w-3xl">
            <div className="flex shrink-0 items-start justify-between border-b border-white/5 p-5 sm:p-6">
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

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
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
                  <Link
                    key={player.id}
                    href={`/players/${player.id}?league=${leagueId}`}
                    aria-label={`Ver perfil de ${player.nickname}`}
                    className="group flex min-w-0 items-center gap-4 overflow-hidden border border-white/5 bg-black/15 p-3 transition-colors hover:border-v-red/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v-red"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden border border-white/10 bg-black/20">
                      <PlayerImage player={player} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate pr-1 text-sm font-black italic uppercase transition-colors group-hover:text-v-red">
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
                  </Link>
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

      {reportTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-sm">
          <div className="v-panel w-full max-w-md space-y-5 p-5 sm:p-6">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.25em] text-v-red">Reporte al líder</p>
              <h3 className="mt-1 text-2xl font-black italic uppercase">{reportTarget.profiles?.username}</h3>
              <p className="mt-2 text-xs leading-relaxed text-v-white/45">
                El reporte no expulsa automáticamente. El líder revisará el motivo y decidirá.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(["inactivity", "unsportsmanlike"] as const).map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setReportReason(reason)}
                  className={`border px-3 py-3 text-[8px] font-black uppercase tracking-wider ${reportReason === reason ? "border-v-red bg-v-red/10 text-v-red" : "border-white/10 text-v-white/40"}`}
                >
                  {reason === "inactivity" ? "Inactividad" : "Conducta antideportiva"}
                </button>
              ))}
            </div>

            <textarea
              value={reportDetails}
              onChange={(event) => setReportDetails(event.target.value.slice(0, 500))}
              rows={4}
              placeholder="Añade contexto para el líder (opcional)"
              className="w-full resize-none border border-white/10 bg-black/20 p-3 text-xs outline-none placeholder:text-v-white/20 focus:border-v-red"
            />
            <p className="text-right text-[8px] text-v-white/25">{reportDetails.length}/500</p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setReportTarget(null);
                  setReportDetails("");
                }}
                className="v-btn-secondary py-3 text-[9px] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void handleReportSubmit()}
                className="v-btn-primary py-3 text-[9px] disabled:opacity-50"
              >
                {actionLoading ? "Enviando..." : "Enviar reporte"}
              </button>
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
  leagueId,
  title,
  subtitle,
  players,
  accent = false,
}: {
  leagueId: string;
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
          <Link
            key={player.id}
            href={`/players/${player.id}?league=${leagueId}`}
            aria-label={`Ver perfil de ${player.nickname}`}
            className="group flex min-w-0 items-center gap-4 overflow-hidden border border-white/5 bg-black/15 p-3 transition-colors hover:border-v-red/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v-red"
          >
            <div className="h-16 w-16 shrink-0 overflow-hidden border border-white/10 bg-black/20">
              <PlayerImage player={player} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate pr-1 text-sm font-black italic uppercase text-v-white transition-colors group-hover:text-v-red">
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
          </Link>
        ))}
      </div>
    </section>
  );
}
