import { getSession } from "@/lib/actions/auth";
import { getUserLeagues } from "@/lib/actions/leagues";
import { getUserFullRoster } from "@/lib/actions/roster";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
export const dynamic = "force-dynamic";
import TeamView from "./TeamView";

export default async function TeamPage() {
  const session = await getSession();
  if (!session) return redirect("/login");

  const leagues = await getUserLeagues(session.user.id);
  
  const activeLeagueItem = leagues[0];
  const activeLeagueId = activeLeagueItem?.league_id;
  const roster = activeLeagueId ? await getUserFullRoster(activeLeagueId, session.user.id) : [];

  // Fetch Inventory and Active Powerups
  const { getUserInventory } = await import("@/lib/actions/inventory");
  const inventory = activeLeagueId ? await getUserInventory(activeLeagueId, session.user.id) : [];
  
  // Fetch active powerups for current gameweek
  const supabase = await createClient();
  const { data: activeGw } = await supabase.from('gameweeks').select('id').eq('is_active', true).single();
  const { data: activePowerUps } = activeGw && activeLeagueId 
    ? await supabase.from('active_powerups').select('*, powerup_types(code)').eq('league_id', activeLeagueId).eq('profile_id', session.user.id).eq('gameweek_id', activeGw.id)
    : { data: [] };

  const hasScoutActive = (activePowerUps || []).some(ap => ap.powerup_types?.code === 'SCOUT');

  return (
    <div className="mx-auto w-full max-w-md sm:max-w-lg lg:max-w-4xl px-4 sm:px-6 py-4
             flex flex-col gap-8
             animate-in fade-in slide-in-from-bottom-4 duration-700
             overflow-y-auto overscroll-contain">
      <div className="flex items-end justify-between px-1">
        <div>
          <h1 className="text-4xl leading-none italic uppercase">Mi Equipo</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">Escuadra Operativa</p>
        </div>
      </div>

      <TeamView 
        initialRoster={roster} 
        initialLeagues={leagues as any[]} 
        profileId={session.user.id}
        initialInventory={inventory}
        initialActivePowerUps={activePowerUps || []}
        activeGameweekId={activeGw?.id}
        hasScoutActive={hasScoutActive}
      />
    </div>
  );
}
