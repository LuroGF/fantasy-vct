import { getSession } from "@/lib/actions/auth";
import { getUserLeagues } from "@/lib/actions/leagues";
import { getUserFullRoster } from "@/lib/actions/roster";
import { redirect } from "next/navigation";
import TeamView from "./TeamView";
import ClientRefreshWrapper from "@/components/ClientRefreshWrapper";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await getSession();
  if (!session) return redirect("/login");

  const leagues = await getUserLeagues(session.user.id);

  const activeLeagueItem = leagues[0];
  const activeLeagueId = activeLeagueItem?.league_id;

  const roster = activeLeagueId
    ? await getUserFullRoster(activeLeagueId, session.user.id)
    : [];

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
          profileId={session.user.id}
        />
      </div>
    </ClientRefreshWrapper>
  );
}
