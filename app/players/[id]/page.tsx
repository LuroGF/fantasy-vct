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

export const dynamic = "force-dynamic";

function money(value?: number | string | null) {
  return `${(Number(value ?? 0) / 1_000_000).toFixed(1)}M €`;
}

function dateTime(value?: string | null) {
  if (!value) return "Pendiente";
  return new Intl.DateTimeFormat("es-ES", {
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
          Jugador no encontrado
        </p>
        <Link
          href="/market"
          className="text-xs font-bold uppercase text-v-red hover:underline"
        >
          Volver al mercado
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
          label: `Sube ${stats.trend_delta} pts`,
          icon: TrendingUp,
          color: "text-emerald-400",
        }
      : stats.trend === "down"
        ? {
            label: `Baja ${Math.abs(stats.trend_delta ?? 0)} pts`,
            icon: TrendingDown,
            color: "text-rose-400",
          }
        : stats.trend === "stable"
          ? { label: "Forma estable", icon: Minus, color: "text-v-white/50" }
          : { label: "Esperando datos", icon: Minus, color: "text-v-white/30" };
  const TrendIcon = trend.icon;

  return (
    <div className="mx-auto flex w-full max-w-md animate-in flex-col gap-6 px-4 py-6 duration-700 fade-in slide-in-from-bottom-4 sm:max-w-xl sm:px-6 lg:max-w-5xl">
      <BackLink>
        <div className="flex items-center gap-2 px-1 text-v-white/40 transition hover:text-v-white/75">
          <ChevronLeft className="h-5 w-5" />
          <h1 className="pr-1 text-xl font-black italic uppercase tracking-wider">
            Perfil del jugador
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
                  {provisional ? "Plantilla provisional" : "Elegible VCT 2027"}
                </span>
              </div>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-v-white/45">
                {player.pro_teams?.name || "Sin equipo"} · {player.role}
                {player.pro_teams?.region
                  ? ` · ${String(player.pro_teams.region).toUpperCase()}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="border-l-2 border-v-red pl-4 sm:text-right">
            <p className="text-[7px] font-black uppercase tracking-widest text-v-white/30">
              Valor de mercado
            </p>
            <p className="mt-1 text-2xl font-black italic text-v-red">
              {money(player.market_value)}
            </p>
          </div>
        </div>
      </section>

      {leagueContext ? (
        <section className="v-panel border-l-2 border-v-red p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[7px] font-black uppercase tracking-[0.2em] text-v-red">
                {leagueContext.league?.name || "Liga activa"}
              </p>
              <h3 className="mt-1 text-lg font-black italic uppercase">
                {leagueContext.auction
                  ? "Disponible en el mercado"
                  : leagueContext.roster
                    ? leagueContext.is_mine
                      ? "Jugador de tu plantilla"
                      : `Pertenece a ${leagueContext.owner?.username || "otro entrenador"}`
                    : "Disponible para próximos mercados"}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:text-right">
              {leagueContext.auction ? (
                <>
                  <div>
                    <p className="text-[7px] font-black uppercase text-v-white/25">
                      Precio base
                    </p>
                    <p className="text-sm font-black italic">
                      {money(leagueContext.auction.market_value_snapshot)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] font-black uppercase text-v-white/25">
                      Tu puja
                    </p>
                    <p className="text-sm font-black italic text-v-red">
                      {leagueContext.my_bid
                        ? money(leagueContext.my_bid.amount)
                        : "Sin puja"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[7px] font-black uppercase text-v-white/25">
                      Cierra
                    </p>
                    <p className="text-sm font-black italic">
                      {dateTime(leagueContext.auction.ends_at)}
                    </p>
                  </div>
                </>
              ) : leagueContext.roster ? (
                <>
                  <div>
                    <p className="text-[7px] font-black uppercase text-v-white/25">
                      Cláusula
                    </p>
                    <p className="text-sm font-black italic text-v-red">
                      {money(leagueContext.roster.release_clause)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] font-black uppercase text-v-white/25">
                      Estado
                    </p>
                    <p className="text-sm font-black italic uppercase">
                      {leagueContext.roster.is_starter ? "Titular" : "Suplente"}
                    </p>
                  </div>
                  {leagueContext.listing ? (
                    <div className="col-span-2">
                      <p className="text-[7px] font-black uppercase text-v-white/25">
                        En venta por
                      </p>
                      <p className="text-sm font-black italic">
                        {money(leagueContext.listing.asking_price)}
                      </p>
                    </div>
                  ) : null}
                  {leagueContext.roster.clause_protected_until &&
                  new Date(leagueContext.roster.clause_protected_until) >
                    new Date() ? (
                    <div className="col-span-2">
                      <p className="text-[7px] font-black uppercase text-v-white/25">
                        Cláusula protegida hasta
                      </p>
                      <p className="text-sm font-black italic">
                        {dateTime(leagueContext.roster.clause_protected_until)}
                      </p>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>

            <Link href={marketUrl} className="v-btn-primary px-5 py-3 text-center text-[9px]">
              {leagueContext.auction ? "Ir a pujar" : "Volver al mercado"}
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Media por partido", statValue(stats.avg_points), "Promedio VCT 2027"],
          ["Últimos 5", statValue(stats.last_5_avg), "Media reciente"],
          ["Mejor partido", statValue(stats.best_points), "Máxima puntuación"],
          ["Partidos", String(stats.total_matches), "Muestra registrada"],
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
            Puntos totales
          </p>
          <p className="mt-1 text-xl font-black italic text-v-red">
            {stats.has_data ? stats.total_points : "—"}
          </p>
        </div>
        <div className="v-panel p-4 text-center">
          <p className="text-[7px] font-black uppercase tracking-widest text-v-white/30">
            K/D acumulado
          </p>
          <p className="mt-1 text-xl font-black italic">
            {statValue(stats.avg_kd)}
          </p>
        </div>
        <div className="v-panel p-4 text-center">
          <p className="text-[7px] font-black uppercase tracking-widest text-v-white/30">
            ACS medio
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
                Próximo partido
              </p>
              <p className="truncate pr-1 text-base font-black italic uppercase">
                vs {opponent?.name || opponent?.tag || "Rival por confirmar"}
              </p>
            </div>
          </div>
          <p className="shrink-0 text-right text-sm font-black italic text-v-white/65">
            {dateTime(nextMatch.match_date)}
          </p>
        </section>
      ) : null}

      {stats.has_data ? (
        <>
          <section className="v-panel p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black italic uppercase">
                  Forma reciente
                </h3>
                <p className="text-[7px] font-black uppercase tracking-[0.16em] text-v-white/25">
                  Puntos Fantasy · últimos cinco partidos
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
                Últimos partidos
              </h3>
              <p className="text-[7px] font-black uppercase tracking-[0.16em] text-v-white/25">
                Estadísticas agregadas de todos los mapas
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
            Aún no hay rendimiento de VCT 2027
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-v-white/30">
            Las medias, la tendencia y el historial aparecerán cuando este jugador
            dispute sus primeros mapas oficiales. Los guiones no representan una
            puntuación de cero.
          </p>
        </section>
      )}
    </div>
  );
}
