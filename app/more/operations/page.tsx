import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Database, Link2Off } from "lucide-react";

import { getAdminSession } from "@/lib/admin/access";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { SyncControls } from "./SyncControls";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type SyncRun = {
  id: string;
  sync_type: "matches" | "stats";
  status: "running" | "success" | "warning" | "failed";
  started_at: string;
  finished_at: string | null;
  summary: Record<string, number | string | boolean | null>;
  errors: string[];
};

type MissingPlayer = {
  id: string;
  nickname: string;
  team_id: string | null;
};

type MissingTeam = {
  id: string;
  name: string;
  tag: string;
};

const summaryLabels: Record<string, string> = {
  received: "Recibidos",
  synced: "Sincronizados",
  skipped: "Omitidos",
  errors: "Errores",
  without_gameweek: "Sin jornada",
  matches_processed: "Partidos procesados",
  performances_synced: "Actuaciones guardadas",
  player_ids_linked: "IDs VLR enlazados",
  players_resolved_by_fallback: "Jugadores por alias",
  players_skipped: "Jugadores omitidos",
  maps_skipped: "Mapas omitidos",
};

function formatDate(value: string | null) {
  if (!value) return "En curso";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

function statusText(status: SyncRun["status"]) {
  if (status === "success") return "Correcta";
  if (status === "warning") return "Con avisos";
  if (status === "failed") return "Fallida";
  return "En curso";
}

function statusClass(status: SyncRun["status"]) {
  if (status === "success") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  if (status === "warning") return "border-amber-400/25 bg-amber-400/10 text-amber-300";
  if (status === "failed") return "border-v-red/30 bg-v-red/10 text-v-red";
  return "border-sky-400/25 bg-sky-400/10 text-sky-300";
}

export default async function OperationsPage() {
  const adminSession = await getAdminSession();
  if (!adminSession) notFound();

  const [runsResult, gameweeksResult, seasonPlayersResult, seasonTeamsResult] = await Promise.all([
    supabaseAdmin
      .from("vct_sync_runs")
      .select("id, sync_type, status, started_at, finished_at, summary, errors")
      .order("started_at", { ascending: false })
      .limit(12),
    supabaseAdmin
      .from("gameweeks")
      .select("start_date, end_date")
      .order("start_date", { ascending: true }),
    supabaseAdmin
      .from("vct_season_players")
      .select("player_id, team_id")
      .eq("season_year", 2027)
      .eq("roster_status", "active")
      .eq("market_eligible", true),
    supabaseAdmin
      .from("vct_season_teams")
      .select("team_id")
      .eq("season_year", 2027)
      .eq("confirmation_status", "confirmed")
      .eq("fantasy_eligible", true),
  ]);

  const gameweeks = gameweeksResult.data || [];
  const seasonStart = gameweeks[0]?.start_date || "2026-12-29T00:00:00.000Z";
  const seasonEnd = gameweeks.at(-1)?.end_date || "2028-01-03T23:59:59.999Z";
  const playerIds = (seasonPlayersResult.data || []).map((row) => row.player_id);
  const teamIds = (seasonTeamsResult.data || []).map((row) => row.team_id);

  const matchBase = () =>
    supabaseAdmin
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("source", "vlr")
      .gte("match_date", seasonStart)
      .lte("match_date", seasonEnd);

  const [
    totalMatchesResult,
    unmappedMatchesResult,
    liveMatchesResult,
    completedMatchesResult,
    missingPlayersResult,
    missingTeamsResult,
  ] = await Promise.all([
    matchBase(),
    matchBase().is("gameweek_id", null),
    matchBase().eq("status", "live"),
    matchBase().in("status", ["finished", "completed"]),
    playerIds.length > 0
      ? supabaseAdmin
          .from("pro_players")
          .select("id, nickname, team_id")
          .in("id", playerIds)
          .is("vlr_id", null)
          .order("nickname", { ascending: true })
      : Promise.resolve({ data: [] as MissingPlayer[], error: null }),
    teamIds.length > 0
      ? supabaseAdmin
          .from("pro_teams")
          .select("id, name, tag")
          .in("id", teamIds)
          .is("vlr_id", null)
          .order("name", { ascending: true })
      : Promise.resolve({ data: [] as MissingTeam[], error: null }),
  ]);

  const runs = (runsResult.data || []) as SyncRun[];
  const missingPlayers = (missingPlayersResult.data || []) as MissingPlayer[];
  const missingTeams = (missingTeamsResult.data || []) as MissingTeam[];
  const teamNames = new Map(
    ((await supabaseAdmin.from("pro_teams").select("id, tag").in("id", teamIds)).data || []).map(
      (team) => [team.id, team.tag],
    ),
  );

  const metrics = [
    { label: "Partidos VLR 2027", value: totalMatchesResult.count || 0, icon: Database },
    { label: "Sin jornada", value: unmappedMatchesResult.count || 0, icon: AlertTriangle },
    { label: "En directo", value: liveMatchesResult.count || 0, icon: Clock3 },
    { label: "Finalizados", value: completedMatchesResult.count || 0, icon: CheckCircle2 },
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-7 px-4 py-6 pb-24 sm:px-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/more" className="mt-1 text-v-white/35 transition-colors hover:text-v-white" aria-label="Volver">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-v-red">Solo administración</p>
            <h1 className="text-3xl italic uppercase sm:text-4xl">Operaciones VLR</h1>
            <p className="mt-2 max-w-2xl text-xs text-v-white/45">
              Estado de la ingesta de partidos, estadísticas y correspondencias del VCT 2027.
            </p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="v-panel p-4">
            <metric.icon className="mb-4 h-4 w-4 text-v-red" />
            <p className="text-2xl font-black italic">{metric.value}</p>
            <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-v-white/35">{metric.label}</p>
          </div>
        ))}
      </section>

      <section className="v-panel space-y-4 p-5">
        <div>
          <h2 className="text-xl italic uppercase">Reintento seguro</h2>
          <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-v-white/30">
            Ejecuta los mismos procesos protegidos que utilizan los cron.
          </p>
        </div>
        <SyncControls />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="v-panel p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl italic uppercase">Jugadores sin ID VLR</h2>
            <span className="text-lg font-black text-v-red">{missingPlayers.length}</span>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
            {missingPlayers.slice(0, 100).map((player) => (
              <div key={player.id} className="flex items-center justify-between border-b border-white/5 py-2 text-xs">
                <span className="font-black italic">{player.nickname}</span>
                <span className="text-[8px] font-black uppercase text-v-white/30">
                  {player.team_id ? teamNames.get(player.team_id) || "Equipo" : "Sin equipo"}
                </span>
              </div>
            ))}
            {missingPlayers.length === 0 && <p className="py-8 text-center text-xs text-emerald-300">Todos enlazados.</p>}
          </div>
        </div>

        <div className="v-panel p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl italic uppercase">Equipos sin ID VLR</h2>
            <span className="text-lg font-black text-v-red">{missingTeams.length}</span>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
            {missingTeams.map((team) => (
              <div key={team.id} className="flex items-center justify-between border-b border-white/5 py-2 text-xs">
                <span className="font-black italic">{team.name}</span>
                <span className="text-[8px] font-black uppercase text-v-white/30">{team.tag}</span>
              </div>
            ))}
            {missingTeams.length === 0 && <p className="py-8 text-center text-xs text-emerald-300">Todos enlazados.</p>}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl italic uppercase">Últimas ejecuciones</h2>
            <p className="text-[9px] font-black uppercase tracking-wider text-v-white/30">Partidos y estadísticas</p>
          </div>
          <Link2Off className="h-5 w-5 text-v-white/20" />
        </div>

        {runs.map((run) => {
          const runErrors = Array.isArray(run.errors) ? run.errors : [];
          return (
            <article key={run.id} className="v-panel p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black italic uppercase">
                    {run.sync_type === "matches" ? "Partidos" : "Estadísticas"}
                  </p>
                  <p className="mt-1 text-[8px] font-black uppercase tracking-wider text-v-white/30">
                    {formatDate(run.started_at)} · {run.finished_at ? `fin ${formatDate(run.finished_at)}` : "sin finalizar"}
                  </p>
                </div>
                <span className={`border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${statusClass(run.status)}`}>
                  {statusText(run.status)}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(run.summary || {}).map(([key, value]) => (
                  <span key={key} className="border border-white/5 bg-white/[0.025] px-2 py-1 text-[8px] font-black uppercase text-v-white/45">
                    {summaryLabels[key] || key}: <strong className="text-v-white/80">{String(value)}</strong>
                  </span>
                ))}
              </div>

              {runErrors.length > 0 && (
                <details className="mt-4 border-t border-white/5 pt-3">
                  <summary className="cursor-pointer text-[9px] font-black uppercase tracking-wider text-v-red">
                    Ver {runErrors.length} incidencias
                  </summary>
                  <ul className="mt-3 space-y-2 text-[10px] leading-relaxed text-v-white/45">
                    {runErrors.map((error, index) => <li key={`${run.id}-${index}`}>{error}</li>)}
                  </ul>
                </details>
              )}
            </article>
          );
        })}

        {runs.length === 0 && (
          <div className="v-panel py-12 text-center text-xs text-v-white/35">
            Todavía no hay ejecuciones registradas. El siguiente cron o reintento aparecerá aquí.
          </div>
        )}
      </section>
    </div>
  );
}
