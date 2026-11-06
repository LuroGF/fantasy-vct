import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Database, Link2Off } from "lucide-react";

import { getAdminSession } from "@/lib/admin/access";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { SyncControls } from "./SyncControls";
import { getServerTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";

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

const summaryLabelKeys: Record<string, MessageKey> = {
  received: "operations.received", synced: "operations.synced", skipped: "operations.skipped", errors: "operations.errors",
  without_gameweek: "operations.noGameweek", matches_processed: "operations.matchesProcessed", performances_synced: "operations.performancesSynced",
  player_ids_linked: "operations.playerIdsLinked", players_resolved_by_fallback: "operations.playersByAlias",
  players_skipped: "operations.playersSkipped", maps_skipped: "operations.mapsSkipped",
};

function formatDate(value: string | null, locale: string, inProgress: string) {
  if (!value) return inProgress;
  const dateLocale = locale === "en" ? "en-GB" : locale === "fr" ? "fr-FR" : "es-ES";
  return new Intl.DateTimeFormat(dateLocale, {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

function statusClass(status: SyncRun["status"]) {
  if (status === "success") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  if (status === "warning") return "border-amber-400/25 bg-amber-400/10 text-amber-300";
  if (status === "failed") return "border-v-red/30 bg-v-red/10 text-v-red";
  return "border-sky-400/25 bg-sky-400/10 text-sky-300";
}

export default async function OperationsPage() {
  const { locale, t } = await getServerTranslator();
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
    { label: t("operations.vlrMatches"), value: totalMatchesResult.count || 0, icon: Database },
    { label: t("operations.noGameweek"), value: unmappedMatchesResult.count || 0, icon: AlertTriangle },
    { label: t("operations.live"), value: liveMatchesResult.count || 0, icon: Clock3 },
    { label: t("operations.finished"), value: completedMatchesResult.count || 0, icon: CheckCircle2 },
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-7 px-4 py-6 pb-24 sm:px-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/more" className="mt-1 text-v-white/35 transition-colors hover:text-v-white" aria-label={t("operations.back")}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-v-red">{t("operations.adminOnly")}</p>
            <h1 className="text-3xl italic uppercase sm:text-4xl">{t("operations.title")}</h1>
            <p className="mt-2 max-w-2xl text-xs text-v-white/45">
              {t("operations.subtitle")}
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
          <h2 className="text-xl italic uppercase">{t("operations.safeRetry")}</h2>
          <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-v-white/30">
            {t("operations.safeRetryDescription")}
          </p>
        </div>
        <SyncControls />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="v-panel p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl italic uppercase">{t("operations.missingPlayerIds")}</h2>
            <span className="text-lg font-black text-v-red">{missingPlayers.length}</span>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
            {missingPlayers.slice(0, 100).map((player) => (
              <div key={player.id} className="flex items-center justify-between border-b border-white/5 py-2 text-xs">
                <span className="font-black italic">{player.nickname}</span>
                <span className="text-[8px] font-black uppercase text-v-white/30">
                  {player.team_id ? teamNames.get(player.team_id) || t("operations.team") : t("operations.noTeam")}
                </span>
              </div>
            ))}
            {missingPlayers.length === 0 && <p className="py-8 text-center text-xs text-emerald-300">{t("operations.allLinked")}</p>}
          </div>
        </div>

        <div className="v-panel p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl italic uppercase">{t("operations.missingTeamIds")}</h2>
            <span className="text-lg font-black text-v-red">{missingTeams.length}</span>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
            {missingTeams.map((team) => (
              <div key={team.id} className="flex items-center justify-between border-b border-white/5 py-2 text-xs">
                <span className="font-black italic">{team.name}</span>
                <span className="text-[8px] font-black uppercase text-v-white/30">{team.tag}</span>
              </div>
            ))}
            {missingTeams.length === 0 && <p className="py-8 text-center text-xs text-emerald-300">{t("operations.allLinked")}</p>}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl italic uppercase">{t("operations.latestRuns")}</h2>
            <p className="text-[9px] font-black uppercase tracking-wider text-v-white/30">{t("operations.matchesAndStats")}</p>
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
                    {run.sync_type === "matches" ? t("operations.matches") : t("operations.stats")}
                  </p>
                  <p className="mt-1 text-[8px] font-black uppercase tracking-wider text-v-white/30">
                    {formatDate(run.started_at, locale, t("operations.inProgress"))} · {run.finished_at
                      ? t("operations.finish", { date: formatDate(run.finished_at, locale, t("operations.inProgress")) })
                      : t("operations.unfinished")}
                  </p>
                </div>
                <span className={`border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${statusClass(run.status)}`}>
                  {t(run.status === "success" ? "operations.success" : run.status === "warning" ? "operations.warning" : run.status === "failed" ? "operations.failed" : "operations.inProgress")}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(run.summary || {}).map(([key, value]) => (
                  <span key={key} className="border border-white/5 bg-white/[0.025] px-2 py-1 text-[8px] font-black uppercase text-v-white/45">
                    {(summaryLabelKeys[key] ? t(summaryLabelKeys[key]) : key)}: <strong className="text-v-white/80">{String(value)}</strong>
                  </span>
                ))}
              </div>

              {runErrors.length > 0 && (
                <details className="mt-4 border-t border-white/5 pt-3">
                  <summary className="cursor-pointer text-[9px] font-black uppercase tracking-wider text-v-red">
                    {t("operations.viewIssues", { count: runErrors.length })}
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
            {t("operations.noRuns")}
          </div>
        )}
      </section>
    </div>
  );
}
