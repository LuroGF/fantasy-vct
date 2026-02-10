import { createClient } from "@/utils/supabase/server";
import MarketView from "./MarketView";
import { getUserLeagues } from "@/lib/actions/leagues";
import { getSession } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { getPersonalMarket, getActiveAuctions } from "@/lib/actions/market";

interface Player {
  id: string;
  nickname: string;
  role: string;
  market_value: number;
  pro_teams: {
    tag: string;
    name: string;
  } | null;
}

import ClientRefreshWrapper from "@/components/ClientRefreshWrapper";

export default async function MarketPage() {
  const session = await getSession();
  if (!session) return redirect("/login");

  const supabase = await createClient();
  const leaguesRes = await getUserLeagues(session.user.id);
  const leagues = leaguesRes as any[];
  const activeLeagueItem = leagues[0];
  const activeLeagueId = activeLeagueItem?.league_id || activeLeagueItem?.leagues?.id;

  if (!activeLeagueId) {
      return (
          <div className="flex flex-col items-center justify-center py-20 opacity-50 italic">
              <p>Debes unirte a una liga para acceder al mercado.</p>
          </div>
      );
  }

  const [personalMarket, auctions, leagueRosters] = await Promise.all([
    getPersonalMarket(activeLeagueId, session.user.id),
    getActiveAuctions(activeLeagueId),
    supabase.from('user_rosters').select('*, profiles(username)').eq('league_id', activeLeagueId)
  ]);

  return (
    <ClientRefreshWrapper>
      <div className="flex flex-col gap-6 animate-in fade-in duration-700">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-4xl leading-none italic uppercase">Mercado</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">Operaciones VCT EMEA</p>
          </div>
        </div>

        <MarketView 
          personalMarket={personalMarket}
          auctions={auctions}
          initialLeagues={leagues as any[]} 
          profileId={session.user.id}
          initialLeagueRosters={leagueRosters.data || []}
        />
      </div>
    </ClientRefreshWrapper>
  );
}

