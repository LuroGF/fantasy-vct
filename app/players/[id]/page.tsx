import { getPlayerStats } from "@/lib/actions/player-stats";
import { getSession } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { PlayerStatsGraph } from "@/components/PlayerStatsGraph";
import { MatchHistoryList } from "@/components/MatchHistoryList";
import { getTeamLogo } from "@/lib/vlr-shared";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays,
  ChevronLeft,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import BackLink from "@/components/BackLink";
import { getServerTranslator } from "@/lib/i18n/server";
import { translatePlayerRole } from "@/lib/i18n/player";

export const dynamic = "force-dynamic";

function money(value: number | string | null | undefined, locale: string) {
  const numberLocale = locale === "en" ? "en-GB" : locale === "fr" ? "fr-FR" : "es-ES";
  return new Intl.NumberFormat(numberLocale, {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value ?? 0));
}

function dateTime(value: string | null | undefined, locale: string, pending: string) {
  if (!value) return pending;
  const dateLocale = locale === "en" ? "en-GB" : locale === "fr" ? "fr-FR" : "es-ES";
  return new Intl.DateTimeFormat(dateLocale, {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statValue(value: number | null | undefined, suffix = "") {
  return value === null || value === undefined ? "—" : `${value}${suffix}`;
}

export default async function PlayerPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ league?: string }>;
}) {
  const { locale, t } = await getServerTranslator();
  const [params, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const session = await getSession();
  if (!session) return redirect("/login");

  const { success, data } = await getPlayerStats(params.id, searchParams.league);

  if (!success || !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="font-black uppercase tracking-widest text-v-white/50">
          {t("players.notFound")}
        </p>
        <Link
          href="/market"
          className="text-xs font-bold uppercase text-v-red hover:underline"
        >
          {t("players.backMarket")}
        </Link>
      </div>
    );
  }

  const {
    player,
    stats,
    season,
    next_match: nextMatch,
    league_context: leagueContext,
  } = data;
  const teamLogo =
    player.pro_teams?.logo_url ||
    (player.pro_teams?.tag ? getTeamLogo(player.pro_teams.tag) : null);
  const provisional = season?.source_url === "provisional:legacy-roster-2027";
  const marketUrl = leagueContext?.league?.id
    ? `/market?league=${leagueContext.league.id}`
    : "/market";
  const opponent = nextMatch
    ? nextMatch.team_a === player.team_id
      ? nextMatch.pro_teams_team_b
      : nextMatch.pro_teams_team_a
    : null;
  const trend =
    stats.trend === "up"
      ? {
          label: t("players.formUp", { points: stats.trend_delta ?? 0 }),
          icon: TrendingUp,
          color: "text-emerald-400",
        }
      : stats.trend === "down"
        ? {
            label: t("players.formDown", { points: Math.abs(stats.trend_delta ?? 0) }),
            icon: TrendingDown,
            color: "text-rose-400",
          }
        : stats.trend === "stable"
          ? { label: t("players.stableForm"), icon: Minus, color: "text-v-white/50" }
          : { label: t("players.waitingData"), icon: Minus, color: "text-v-white/30" };
  const TrendIcon = trend.icon;

  return (
    <div className="mx-auto flex w-full max-w-md animate-in flex-col gap-6 px-4 py-6 duration-700 fade-in slide-in-from-bottom-4 sm:max-w-xl sm:px-6 lg:max-w-5xl">
      <BackLink>
        <div className="flex items-center gap-2 px-1 text-v-white/40 transition hover:text-v-white/75">
          <ChevronLeft className="h-5 w-5" />
          <h1 className="pr-1 text-xl font-black italic uppercase tracking-wider">
            {t("players.profile")}
          </h1>
        </div>
      </BackLink>

      <section className="v-panel relative overflow-hidden p-0">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-v-red/10 blur-3xl" />
        {teamLogo ? (
          <Image
            src={teamLogo}
            alt=""
            width={144}
            height={144}
            className="pointer-events-none absolute right-6 top-1/2 h-36 w-36 -translate-y-1/2 object-contain opacity-[0.035] grayscale"
          />
        ) : null}

        <div className="relative z-10 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className={`relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border-2 bg-v-navy sm:h-24 sm:w-24 ${
                player.role === "Duelista"
                  ? "border-role-duelista"
                  : player.role === "Iniciador"
                    ? "border-role-iniciador"
                    : player.role === "Controlador"
                      ? "border-role-controlador"
                      : player.role === "Centinela"
                        ? "border-role-centinela"
                        : "border-white/20"
              }`}
            >
              {player.photo_url ? (
                <Image
                  src={player.photo_url}
                  alt={player.nickname}
                  fill
                  sizes="96px"
                  className="object-cover object-top"
                />
              ) : (
                <span className="text-2xl font-black italic text-white/15">
                  {player.nickname.slice(0, 2).toUpperCase()}
                </span>
              )}
              {teamLogo ? (
                <div className="absolute -bottom-px -right-px h-7 w-7 border border-white/20 bg-v-navy p-1">
                  <Image
                    src={teamLogo}
                    alt={player.pro_teams?.name || ""}
                    fill
                    sizes="28px"
                    className="object-contain p-1"
                  />
                </div>
              ) : null}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate pr-2 text-3xl font-black italic uppercase leading-none tracking-tighter sm:text-4xl">
                  {player.nickname}
                </h2>
                <span className="border border-v-red/25 bg-v-red/10 px-2 py-1 text-[7px] font-black uppercase tracking-widest text-v-red">
                  {provisional ? t("players.provisionalRoster") : t("players.eligible")}
                </span>
              </div>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-v-white/45">
                {player.pro_teams?.name || t("players.noTeam")} · {translatePlayerRole(player.role, t)}
                {player.pro_teams?.region
                  ? ` · ${String(player.pro_teams.region).toUpperCase()}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="border-l-2 border-v-red pl-4 sm:text-right">
            <p className="text-[7px] font-black uppercase tracking-widest text-v-white/30">
              {t("players.marketValue")}
            </p>
            <p className="mt-1 text-2xl font-black italic text-v-red">
              {money(player.market_value, locale)}
            </p>
          </div>
        </div>
      </section>

      {leagueContext ? (
        <section className="v-panel border-l-2 border-v-red p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[7px] font-black uppercase tracking-[0.2em] text-v-red">
                {leagueContext.league?.name || t("players.activeLeague")}
              </p>
              <h3 className="mt-1 text-lg font-black italic uppercase">
                {leagueContext.auction
                  ? t("players.availableMarket")
                  : leagueContext.roster
                    ? leagueContext.is_mine
                      ? t("players.yourSquad")
                      : t("players.belongsTo", { coach: leagueContext.owner?.username || t("players.anotherCoach") })
                    : t("players.futureMarkets")}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:text-right">
              {leagueContext.auction ? (
                <>
                  <div>
                    <p className="text-[7px] font-black uppercase text-v-white/25">
                      {t("players.basePrice")}
                    </p>
                    <p className="text-sm font-black italic">
                      {money(leagueContext.auction.market_value_snapshot, locale)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] font-black uppercase text-v-white/25">
                      {t("players.yourBid")}
                    </p>
                    <p className="text-sm font-black italic text-v-red">
                      {leagueContext.my_bid
                        ? money(leagueContext.my_bid.amount, locale)
                        : t("players.noBid")}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[7px] font-black uppercase text-v-white/25">
                      {t("players.closes")}
                    </p>
                    <p className="text-sm font-black italic">
                      {dateTime(leagueContext.auction.ends_at, locale, t("players.pending"))}
                    </p>
                  </div>
                </>
              ) : leagueContext.roster ? (
                <>
                  <div>
                    <p className="text-[7px] font-black uppercase text-v-white/25">
                      {t("players.clause")}
                    </p>
                    <p className="text-sm font-black italic text-v-red">
                      {money(leagueContext.roster.release_clause, locale)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] font-black uppercase text-v-white/25">
                      {t("players.status")}
                    </p>
                    <p className="text-sm font-black italic uppercase">
                      {leagueContext.roster.is_starter ? t("players.starter") : t("players.substitute")}
                    </p>
                  </div>
                  {leagueContext.listing ? (
                    <div className="col-span-2">
                      <p className="text-[7px] font-black uppercase text-v-white/25">
                        {t("players.listedFor")}
                      </p>
                      <p className="text-sm font-black italic">
                        {money(leagueContext.listing.asking_price, locale)}
                      </p>
                    </div>
                  ) : null}
                  {leagueContext.roster.clause_protected_until &&
                  new Date(leagueContext.roster.clause_protected_until) >
                    new Date() ? (
                    <div className="col-span-2">
                      <p className="text-[7px] font-black uppercase text-v-white/25">
                        {t("players.protectedUntil")}
                      </p>
                      <p className="text-sm font-black italic">
                        {dateTime(leagueContext.roster.clause_protected_until, locale, t("players.pending"))}
                      </p>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>

            <Link href={marketUrl} className="v-btn-primary px-5 py-3 text-center text-[9px]">
              {leagueContext.auction ? t("players.goBid") : t("players.backMarket")}
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [t("players.averagePerMatch"), statValue(stats.avg_points), t("players.seasonAverage")],
          [t("players.lastFive"), statValue(stats.last_5_avg), t("players.recentAverage")],
          [t("players.bestMatch"), statValue(stats.best_points), t("players.maxScore")],
          [t("players.matches"), String(stats.total_matches), t("players.recordedSample")],
        ].map(([label, value, hint]) => (
          <div key={label} className="v-panel p-4">
            <p className="text-[7px] font-black uppercase tracking-[0.16em] text-v-white/30">
              {label}
            </p>
            <p className="mt-2 text-2xl font-black italic">{value}</p>
            <p className="mt-1 text-[8px] text-v-white/20">{hint}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="v-panel p-4 text-center">
          <p className="text-[7px] font-black uppercase tracking-widest text-v-white/30">
            {t("players.totalPoints")}
          </p>
          <p className="mt-1 text-xl font-black italic text-v-red">
            {stats.has_data ? stats.total_points : "—"}
          </p>
        </div>
        <div className="v-panel p-4 text-center">
          <p className="text-[7px] font-black uppercase tracking-widest text-v-white/30">
            {t("players.cumulativeKd")}
          </p>
          <p className="mt-1 text-xl font-black italic">
            {statValue(stats.avg_kd)}
          </p>
        </div>
        <div className="v-panel p-4 text-center">
          <p className="text-[7px] font-black uppercase tracking-widest text-v-white/30">
            {t("players.averageAcs")}
          </p>
          <p className="mt-1 text-xl font-black italic">
            {statValue(stats.avg_acs)}
          </p>
        </div>
      </section>

      {nextMatch ? (
        <section className="v-panel flex items-center justify-between gap-4 p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-v-red/25 bg-v-red/10 text-v-red">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[7px] font-black uppercase tracking-[0.18em] text-v-red">
                {t("players.nextMatch")}
              </p>
              <p className="truncate pr-1 text-base font-black italic uppercase">
                vs {opponent?.name || opponent?.tag || t("players.opponentPending")}
              </p>
            </div>
          </div>
          <p className="shrink-0 text-right text-sm font-black italic text-v-white/65">
            {dateTime(nextMatch.match_date, locale, t("players.pending"))}
          </p>
        </section>
      ) : null}

      {stats.has_data ? (
        <>
          <section className="v-panel p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black italic uppercase">
                  {t("players.recentForm")}
                </h3>
                <p className="text-[7px] font-black uppercase tracking-[0.16em] text-v-white/25">
                  {t("players.fantasyLastFive")}
                </p>
              </div>
              <div className={`flex items-center gap-1 text-[9px] font-black uppercase ${trend.color}`}>
                <TrendIcon className="h-4 w-4" />
                {trend.label}
              </div>
            </div>
            <PlayerStatsGraph data={stats.last_5_points} />
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-black italic uppercase">
                {t("players.latestMatches")}
              </h3>
              <p className="text-[7px] font-black uppercase tracking-[0.16em] text-v-white/25">
                {t("players.allMapsStats")}
              </p>
            </div>
            <MatchHistoryList
              matches={data.performances}
              playerTeamId={player.team_id}
            />
          </section>
        </>
      ) : (
        <section className="v-panel px-6 py-12 text-center">
          <p className="text-lg font-black italic uppercase text-v-white/55">
            {t("players.noPerformance")}
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-v-white/30">
            {t("players.noPerformanceDescription")}
          </p>
        </section>
      )}
    </div>
  );
}
