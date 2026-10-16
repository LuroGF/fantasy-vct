import { redirect } from "next/navigation";
import MarketView from "./MarketView";
import ClientRefreshWrapper from "@/components/ClientRefreshWrapper";
import { getSession } from "@/lib/actions/auth";
import { getUserLeagues } from "@/lib/actions/leagues";
import { getMarketDashboard } from "@/lib/actions/market";

type SearchParams = Promise<{ league?: string }>;

export default async function MarketPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSession();
  if (!session) return redirect("/login");

  const leagues = (await getUserLeagues(session.user.id)) as any[];

  if (!leagues.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-50 italic">
        <p>Debes unirte a una liga para acceder al mercado.</p>
      </div>
    );
  }

  const params = await searchParams;
  const requestedLeagueId = params?.league;

  const leagueExists = leagues.some(
    (l) => (l.league_id || l.leagues?.id) === requestedLeagueId,
  );

  const activeLeagueId = leagueExists
    ? requestedLeagueId!
    : leagues[0]?.league_id || leagues[0]?.leagues?.id;

  const marketData = await getMarketDashboard(activeLeagueId, session.user.id);

  return (
    <ClientRefreshWrapper>
      <div className="mx-auto w-full max-w-md sm:max-w-xl lg:max-w-5xl px-4 sm:px-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 py-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl leading-none italic uppercase">Mercado</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">
              Fantasy VCT 2027
            </p>
          </div>
        </div>

        <MarketView
          initialLeagues={leagues}
          initialLeagueId={activeLeagueId}
          profileId={session.user.id}
          initialData={marketData}
        />
      </div>
    </ClientRefreshWrapper>
  );
}