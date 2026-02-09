import { createClient } from "@/utils/supabase/server";
import { getSession } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { getUserLeagues } from "@/lib/actions/leagues";
import StatsView from "./StatsView";
import ClientRefreshWrapper from "@/components/ClientRefreshWrapper";

export default async function StatsPage() {
  const session = await getSession();
  if (!session) return redirect("/login");

  const supabase = await createClient();
  const leagues = await getUserLeagues(session.user.id);
  const activeLeagueId = leagues[0]?.league_id;

  // 1. Fetch History
  // participant_scores_history
  const historyQuery = activeLeagueId 
    ? supabase.from('participant_scores_history')
      .select('gameweek_id, points_earned')
      .eq('league_id', activeLeagueId)
      .eq('profile_id', session.user.id)
      .order('gameweek_id')
    : Promise.resolve({ data: [] });

  // 2. Fetch Current Roster
  const rosterQuery = activeLeagueId 
    ? supabase.from('user_rosters')
      .select('*, pro_players(role)')
      .eq('league_id', activeLeagueId)
      .eq('profile_id', session.user.id)
    : Promise.resolve({ data: [] });

  // 3. Fetch Total Points (Rank)
  const rankQuery = activeLeagueId 
      ? supabase.from('league_participants')
        .select('total_points')
        .eq('league_id', activeLeagueId)
        .eq('profile_id', session.user.id)
        .single()
      : Promise.resolve({ data: { total_points: 0 } });

  const [historyResult, rosterResult, rankResult] = await Promise.all([historyQuery, rosterQuery, rankQuery]);

  const history = historyResult.data || [];
  const roster = (rosterResult.data || []).map((r: any) => ({
      ...r,
      role: r.pro_players?.role
  }));
  const totalPoints = rankResult.data?.total_points || 0;
  
  // Dummy rank logic: 
  // In a real app we would query rank() over partition
  // For now let's just display total points as primary metric
  
  return (
    <ClientRefreshWrapper>
      <div className="flex flex-col gap-6 animate-in fade-in duration-700">
        <div className="flex items-end justify-between px-1">
          <div>
            <h1 className="text-4xl leading-none italic uppercase">Estadísticas</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">Análisis de Rendimiento</p>
          </div>
        </div>

        <StatsView 
          scoreHistory={history}
          roster={roster}
          totalPoints={totalPoints}
          rank={0} 
        />
      </div>
    </ClientRefreshWrapper>
  );
}
