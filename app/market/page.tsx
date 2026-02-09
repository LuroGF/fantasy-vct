import { createClient } from "@/utils/supabase/server";
import MarketView from "./MarketView";
import { getUserLeagues } from "@/lib/actions/leagues";
import { getSession } from "@/lib/actions/auth";
import { redirect } from "next/navigation";

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

async function getMarketData(supabase: any): Promise<Player[]> {
  const { data: players, error } = await supabase
    .from('pro_players')
    .select('*, pro_teams(tag, name)')
    .order('market_value', { ascending: false });

  if (error) {
    console.error("Error fetching market data:", error);
    return [];
  }
  return (players as unknown as Player[]) || [];
}

import ClientRefreshWrapper from "@/components/ClientRefreshWrapper";

export default async function MarketPage() {
  const session = await getSession();
  if (!session) return redirect("/login");

  const supabase = await createClient();
  const leagues = await getUserLeagues(session.user.id);
  const activeLeagueId = leagues[0]?.league_id;

  const [players, leagueRosters, activePowerUps] = await Promise.all([
    getMarketData(supabase),
    activeLeagueId 
      ? supabase.from('user_rosters').select('*, profiles(username)').eq('league_id', activeLeagueId)
      : Promise.resolve({ data: [] }),
    activeLeagueId
      ? supabase.from('active_powerups').select('target_player_id, profile_id, powerup_types(code)').eq('league_id', activeLeagueId)
      : Promise.resolve({ data: [] })
  ]);

  const powerupsData = (activePowerUps.data || []) as any[];
  
  const shieldedPlayerIds = powerupsData
    .filter((ap: any) => ap.powerup_types?.code === 'LOCK')
    .map((ap: any) => ap.target_player_id);

  const hasScoutActive = powerupsData.some(
    (ap: any) => ap.powerup_types?.code === 'SCOUT' && ap.profile_id === session.user.id
  );

  return (
    <ClientRefreshWrapper>
      <div className="flex flex-col gap-6 animate-in fade-in duration-700">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-4xl leading-none italic uppercase">Mercado</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">Transferencias VCT EMEA</p>
          </div>
        </div>

        <MarketView 
          initialPlayers={players} 
          initialLeagues={leagues as any[]} 
          profileId={session.user.id}
          initialLeagueRosters={leagueRosters.data || []}
          initialShieldedPlayerIds={shieldedPlayerIds}
          hasScoutActive={hasScoutActive}
        />
      </div>
    </ClientRefreshWrapper>
  );
}
