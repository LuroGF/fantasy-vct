import { createClient } from "@/utils/supabase/server";
import { getSession } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { getLeagueClassification, getUserLeagues } from "@/lib/actions/leagues";

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
    <div className="flex flex-col gap-6 animate-in fade-in duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl leading-none italic uppercase">Clasificación</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">Líderes de Operación</p>
        </div>
      </div>

      <div className="v-panel p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-v-white/50">Standings en Vivo</span>
          <div className="h-2 w-2 rounded-full bg-v-red animate-pulse" />
        </div>
        <div className="grid gap-2">
          {standings.map((row: any, index: number) => (
            <div
              key={row.profile_id}
              className={`flex items-center justify-between p-3 border-l-2 ${index === 0 ? "bg-v-red/10 border-v-red" : "bg-v-white/5 border-v-white/10"
                }`}
            >
              <div className="flex items-center gap-4">
                <span className={`text-xl font-black italic ${index === 0 ? "text-v-red" : "text-v-white/40"}`}>
                  #{(index + 1).toString().padStart(2, '0')}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase tracking-tight italic">
                    {row.profiles.username}
                  </span>
                  <div className="flex gap-1 mt-1">
                    {row.roster?.slice(0, 5).map((p: any) => (
                      <span key={p.id} className="text-[8px] px-1 bg-v-white/5 text-v-white/40 rounded">
                        {p.nickname}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black italic">{row.total_points}</span>
                <span className="text-[10px] font-black uppercase text-v-white/20 ml-1">Pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="v-panel p-4 border-l-v-white/5 opacity-50">
        <h4 className="text-sm font-black uppercase tracking-widest mb-2">Premios de la Temporada</h4>
        <p className="text-xs text-v-white/40 font-medium">
          El top 3 agentes al final de la temporada recibirán recompensas especiales. ¡Sigue operando!
        </p>
      </div>
    </div>
  );
}
