import { getSession } from "@/lib/actions/auth";
import { getUserLeagues } from "@/lib/actions/leagues";
import { getUserFullRoster } from "@/lib/actions/roster";
import { redirect } from "next/navigation";
import TeamView from "./TeamView";

export default async function TeamPage() {
  const session = await getSession();
  if (!session) return redirect("/login");

  const leagues = await getUserLeagues(session.user.id);
  
  // Cargamos por defecto la primera liga si existe
  const activeLeague = leagues[0]?.leagues;
  const activeLeagueId = Array.isArray(activeLeague) ? activeLeague[0]?.id : (activeLeague as any)?.id;
  const roster = activeLeagueId ? await getUserFullRoster(activeLeagueId, session.user.id) : [];

  return (
    <div className="mx-auto w-full max-w-md sm:max-w-lg lg:max-w-4xl flex flex-col gap-6 animate-in fade-in duration-700">
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
      />
    </div>
  );
}
