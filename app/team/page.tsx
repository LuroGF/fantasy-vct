import { getSession } from "@/lib/actions/auth";
import { getUserLeagues } from "@/lib/actions/leagues";
import { getUserFullRoster } from "@/lib/actions/roster";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
export const dynamic = "force-dynamic";
import TeamView from "./TeamView";

import ClientRefreshWrapper from "@/components/ClientRefreshWrapper";
import { getUserInventory, getActivePowerUps } from "@/lib/actions/inventory";
import { getCasters, getActiveCasters } from "@/lib/actions/casters";

export default async function TeamPage() {
  const session = await getSession();
  if (!session) return redirect("/login");

  const leagues = await getUserLeagues(session.user.id);
  
  const activeLeagueItem = leagues[0];
  const activeLeagueId = activeLeagueItem?.league_id;
  const roster = activeLeagueId ? await getUserFullRoster(activeLeagueId, session.user.id) : [];


  const inventory = activeLeagueId ? await getUserInventory(activeLeagueId, session.user.id) : [];
  const activePowerUps = activeLeagueId ? await getActivePowerUps(activeLeagueId, session.user.id) : [];

  const supabase = await createClient();
  const { data: activeGw } = await supabase.from('gameweeks').select('id').eq('is_active', true).single();

  const casters = await getCasters();
  const initialActiveCasters = (activeLeagueId && activeGw) ? await getActiveCasters(activeLeagueId, session.user.id, activeGw.id) : [];

  const hasScoutActive = activePowerUps?.some((ap: any) => ap.powerup_types?.code === 'SCOUT') || false;

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
          casters={casters}
          initialActiveCasters={initialActiveCasters}
        />
      </div>
    </ClientRefreshWrapper>
  );
}
