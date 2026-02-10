
import { createClient } from "@/utils/supabase/server";
import { getSession } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { getLeagueClassification, getUserLeagues } from "@/lib/actions/leagues";
import { RankingView } from "./RankingView";

export default async function RankingPage() {
  const session = await getSession();
  if (!session) return redirect("/login");

  const leagues = await getUserLeagues(session.user.id);
  const activeLeagueId = leagues[0]?.league_id;

  if (!activeLeagueId) {
    return (
      <div className="p-10 text-center opacity-40 italic">
        Debes unirte a una liga para ver la clasificación.
      </div>
    );
  }

  const standings = await getLeagueClassification(activeLeagueId);

  return (
    <div className="mx-auto w-full max-w-md sm:max-w-lg lg:max-w-4xl py-4 flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl leading-none italic uppercase">Clasificación</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">Líderes de Operación</p>
        </div>
      </div>

      <RankingView 
        standings={standings} 
        profileId={session.user.id} 
        activeLeagueId={activeLeagueId} 
      />

      <div className="v-panel p-4 border-l-v-white/5 opacity-50">
        <h4 className="text-sm font-black uppercase tracking-widest mb-2">Premios de la Temporada</h4>
        <p className="text-xs text-v-white/40 font-medium">
          El top 3 agentes al final de la temporada recibirán recompensas especiales. ¡Sigue operando!
        </p>
      </div>
    </div>
  );
}
