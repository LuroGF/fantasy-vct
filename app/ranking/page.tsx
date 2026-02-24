
import { getSession } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { getLeagueClassification, getUserLeagues } from "@/lib/actions/leagues";
import { RankingView } from "./RankingView";
import ClientRefreshWrapper from "@/components/ClientRefreshWrapper";

export default async function RankingPage() {
  const session = await getSession();
  if (!session) return redirect("/login");

  const leagues = await getUserLeagues(session.user.id);
  const activeLeagueItem = leagues[0];
  const activeLeagueId = activeLeagueItem?.league_id || (activeLeagueItem?.leagues as any)?.id;

  if (!activeLeagueId) {
    return (
      <div className="p-10 text-center opacity-40 italic">
        Debes unirte a una liga para ver la clasificación.
      </div>
    );
  }

  const { standings, activeLocks } = await getLeagueClassification(activeLeagueId);

  return (
    <ClientRefreshWrapper>
      <div className="mx-auto w-full max-w-md sm:max-w-lg lg:max-w-4xl py-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-end justify-between px-4 sm:px-6">
          <div>
            <h1 className="text-4xl leading-none italic uppercase font-black">Clasificación</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">Líderes de Operación</p>
          </div>
        </div>

        <RankingView 
          initialStandings={standings} 
          initialLocks={activeLocks}
          profileId={session.user.id} 
          initialLeagues={leagues}
          initialLeagueId={activeLeagueId}
        />
      </div>
    </ClientRefreshWrapper>
  );
}
