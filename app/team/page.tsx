import { getSession } from "@/lib/actions/auth";
import { getUserLeagues } from "@/lib/actions/leagues";
import {
  getLineupWindowStatus,
  getUserFullRoster,
} from "@/lib/actions/roster";
import { redirect } from "next/navigation";
import TeamView from "./TeamView";
import ClientRefreshWrapper from "@/components/ClientRefreshWrapper";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ league?: string }>;

export default async function TeamPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSession();
  if (!session) return redirect("/login");

  const leagues = await getUserLeagues(session.user.id);
  const params = await searchParams;
  const requestedLeagueId = params?.league;
  const requestedLeague = leagues.find(
    (league: any) =>
      (league.league_id || league.leagues?.id) === requestedLeagueId,
  );

  const activeLeagueItem = requestedLeague || leagues[0];
  const activeLeagueId =
    activeLeagueItem?.league_id || (activeLeagueItem as any)?.leagues?.id;

  const [roster, lineupStatus] = await Promise.all([
    activeLeagueId
      ? getUserFullRoster(activeLeagueId, session.user.id)
      : Promise.resolve([]),
    getLineupWindowStatus(),
  ]);

  return (
    <ClientRefreshWrapper>
      <div
        className="
          mx-auto
          w-full
          max-w-md sm:max-w-xl lg:max-w-4xl
          px-4 sm:px-6
          flex flex-col gap-8
          animate-in fade-in slide-in-from-bottom-4 duration-700 py-6
        "
      >
        <div className="flex items-end justify-between px-1">
          <div>
            <h1 className="text-4xl leading-none italic uppercase cursor-default">
              Mi Equipo
            </h1>
          </div>
        </div>

        <TeamView
          initialRoster={roster}
          initialLeagues={leagues as any[]}
          initialLeagueId={activeLeagueId || ""}
          lineupStatus={lineupStatus}
          profileId={session.user.id}
        />
      </div>
    </ClientRefreshWrapper>
  );
}
