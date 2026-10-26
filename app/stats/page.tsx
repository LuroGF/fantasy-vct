import Link from "next/link";
import { redirect } from "next/navigation";

import ClientRefreshWrapper from "@/components/ClientRefreshWrapper";
import { getSession } from "@/lib/actions/auth";
import {
  getLeagueGameweekOverview,
  getUserLeagues,
} from "@/lib/actions/leagues";
import { createClient } from "@/utils/supabase/server";
import StatsView from "./StatsView";

export const dynamic = "force-dynamic";

type StatsPageProps = {
  searchParams: Promise<{ league?: string; gameweek?: string }>;
};

function leagueData(participation: any) {
  if (!participation?.leagues) return null;
  return Array.isArray(participation.leagues)
    ? participation.leagues[0] ?? null
    : participation.leagues;
}

export default async function StatsPage({ searchParams }: StatsPageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const leagues = await getUserLeagues(session.user.id);
  const selectedParticipation =
    leagues.find((item: any) => item.league_id === params.league) ??
    leagues[0] ??
    null;
  const selectedLeague = leagueData(selectedParticipation);

  if (!selectedParticipation || !selectedLeague) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10 text-center">
        <h1 className="text-4xl uppercase">Rendimiento</h1>
        <p className="text-sm text-v-white/50">
          Únete a una liga para empezar a medir el rendimiento de tu equipo.
        </p>
        <Link href="/leagues" className="v-btn-primary mx-auto text-xs">
          Ir a ligas
        </Link>
      </div>
    );
  }

  const requestedGameweek = Number(params.gameweek);
  const overview = await getLeagueGameweekOverview(
    selectedParticipation.league_id,
    Number.isFinite(requestedGameweek) && requestedGameweek > 0
      ? requestedGameweek
      : null,
  );

  const supabase = await createClient();
  const [historyResult, rewardsResult] = await Promise.all([
    supabase
      .from("participant_scores_history")
      .select("gameweek_id, points_earned, rank_in_league, gameweeks(name)")
      .eq("league_id", selectedParticipation.league_id)
      .eq("profile_id", session.user.id)
      .order("gameweek_id", { ascending: true }),
    supabase
      .from("gameweek_rewards")
      .select("gameweek_id, rank_position, tied_participants, amount, paid_at, gameweeks(name)")
      .eq("league_id", selectedParticipation.league_id)
      .eq("profile_id", session.user.id)
      .order("paid_at", { ascending: false })
      .limit(12),
  ]);

  const ownStanding = overview.standings.find(
    (standing: any) => standing.profile_id === session.user.id,
  );
  const totalRank = [...overview.standings]
    .sort((a: any, b: any) => b.total_points - a.total_points)
    .findIndex((standing: any) => standing.profile_id === session.user.id);
  const leagueAverage = overview.standings.length
    ? overview.standings.reduce(
        (sum: number, standing: any) => sum + Number(standing.gameweek_points || 0),
        0,
      ) / overview.standings.length
    : 0;

  const now = Date.now();
  const startedGameweeks = overview.gameweeks.filter(
    (gameweek: any) => new Date(gameweek.start_date).getTime() <= now,
  );
  const upcomingGameweeks = overview.gameweeks
    .filter((gameweek: any) => new Date(gameweek.start_date).getTime() > now)
    .sort(
      (a: any, b: any) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
    );
  const latestGameweeks = startedGameweeks.length
    ? [upcomingGameweeks[0], ...startedGameweeks.slice(0, 7)].filter(Boolean)
    : upcomingGameweeks.slice(0, 8);

  return (
    <ClientRefreshWrapper>
      <div className="mx-auto flex w-full max-w-md flex-col gap-7 px-4 py-6 sm:max-w-xl sm:px-6 sm:pb-44 lg:max-w-4xl">
        <header className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-v-red">
            {selectedLeague.name}
          </p>
          <h1 className="text-4xl leading-none uppercase sm:text-5xl">Rendimiento</h1>
          <p className="text-sm text-v-white/50">
            Detecta quién aporta puntos, compara tu jornada y revisa tus premios.
          </p>
        </header>

        {leagues.length > 1 && (
          <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Seleccionar liga">
            {leagues.map((participation: any) => {
              const league = leagueData(participation);
              if (!league) return null;
              const active = participation.league_id === selectedParticipation.league_id;
              return (
                <Link
                  key={participation.league_id}
                  href={`/stats?league=${participation.league_id}`}
                  className={`shrink-0 border px-4 py-2 text-[10px] font-black uppercase tracking-wider ${
                    active
                      ? "border-v-red bg-v-red/10 text-v-white"
                      : "border-white/10 text-v-white/40"
                  }`}
                >
                  {league.name}
                </Link>
              );
            })}
          </nav>
        )}

        {latestGameweeks.length > 0 && (
          <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Seleccionar jornada">
            {latestGameweeks.map((gameweek: any) => {
              const active = gameweek.id === overview.selectedGameweek?.id;
              return (
                <Link
                  key={gameweek.id}
                  href={`/stats?league=${selectedParticipation.league_id}&gameweek=${gameweek.id}`}
                  className={`shrink-0 px-3 py-2 text-[9px] font-black uppercase tracking-wider ${
                    active
                      ? "bg-v-white text-v-navy"
                      : "border border-white/10 text-v-white/40"
                  }`}
                >
                  {gameweek.name}
                </Link>
              );
            })}
          </nav>
        )}

        <StatsView
          selectedGameweek={overview.selectedGameweek}
          scoreHistory={historyResult.data || []}
          lineup={ownStanding?.lineup || []}
          gameweekPoints={Number(ownStanding?.gameweek_points || 0)}
          gameweekRank={ownStanding?.gameweek_rank || 0}
          totalPoints={Number(ownStanding?.total_points || 0)}
          totalRank={totalRank >= 0 ? totalRank + 1 : 0}
          participantCount={overview.standings.length}
          leagueAverage={leagueAverage}
          rewards={rewardsResult.data || []}
        />
      </div>
    </ClientRefreshWrapper>
  );
}

