import { getPlayerStats } from "@/lib/actions/player-stats";
import { getSession } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { PlayerStatsGraph } from "@/components/PlayerStatsGraph";
import { MatchHistoryList } from "@/components/MatchHistoryList";
import { StatusBadge } from "@/components/StatusBadge";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlayerPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  if (!session) return redirect("/login");

  const { success, data } = await getPlayerStats(params.id);

  if (!success || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-v-white/50 font-black uppercase tracking-widest">Jugador no encontrado</p>
        <Link href="/market" className="text-v-red hover:underline uppercase text-xs font-bold">Volver al Mercado</Link>
      </div>
    );
  }

  const { player, stats } = data;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      {/* Header / Nav */}
      <div className="flex items-center gap-2 px-1">
        <Link href="/market" className="text-v-white/40 hover:text-v-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-black italic uppercase text-v-white/40 tracking-wider">Perfil de Agente</h1>
      </div>

      {/* Player Header Card */}
      <div className="v-panel p-0 overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-v-red/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="p-5 flex items-start justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 bg-v-navy border-2 flex items-center justify-center overflow-hidden ${
                player.role === 'Duelista' ? 'border-cyan-400' :
                player.role === 'Iniciador' ? 'border-yellow-400' :
                player.role === 'Controlador' ? 'border-purple-400' :
                'border-green-400'
            }`}>
              {player.photo_url ? (
                <img src={player.photo_url} alt={player.nickname} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-black italic opacity-20">{player.nickname.substring(0, 2).toUpperCase()}</span>
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">{player.nickname}</h2>
                 {stats.total_mvps > 0 && (
                   <span className="bg-yellow-500/20 text-yellow-500 text-[8px] font-black px-1.5 py-0.5 border border-yellow-500/50 rounded uppercase">
                     {stats.total_mvps}x MVP
                   </span>
                 )}
              </div>
              <div className="flex items-center gap-3">
                 <p className="text-xs font-bold text-v-white/60 uppercase tracking-wider flex items-center gap-1">
                    {player.pro_teams?.tag} 
                    <span className="w-1 h-1 bg-v-white/20 rounded-full" />
                    {player.role}
                 </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-v-navy/50 p-3 border-t border-white/5 flex items-center justify-between">
           <div>
             <p className="text-[8px] font-black uppercase text-v-white/30 tracking-widest mb-0.5">Valor de Mercado</p>
             <p className="text-xl font-black italic text-v-red">${(player.market_value / 1000000).toFixed(1)}M</p>
           </div>
           
           <div className="flex gap-2">
             {/* Future: Dynamic Buy/Sell buttons logic can be reused here */}
             <button className="bg-v-red text-white text-[10px] font-black uppercase px-4 py-2 hover:bg-v-red/80 transition-colors tracking-widest">
               Fichar
             </button>
           </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="v-panel p-3 flex flex-col items-center justify-center gap-1">
           <p className="text-[8px] font-black uppercase text-v-white/40 tracking-[0.2em]">Media Puntos</p>
           <p className="text-2xl font-black italic">{stats.avg_points}</p>
        </div>
        <div className="v-panel p-3 flex flex-col items-center justify-center gap-1">
           <p className="text-[8px] font-black uppercase text-v-white/40 tracking-[0.2em]">K/D Ratio</p>
           <p className={`text-2xl font-black italic ${stats.avg_kd >= 1 ? 'text-green-400' : 'text-v-red'}`}>
             {stats.avg_kd}
           </p>
        </div>
        <div className="v-panel p-3 flex flex-col items-center justify-center gap-1 col-span-2">
           <p className="text-[8px] font-black uppercase text-v-white/40 tracking-[0.2em]">Score de Combate (ACS)</p>
           <p className="text-3xl font-black italic text-cyan-400">{stats.avg_acs}</p>
        </div>
        {/*
        <div className="v-panel p-3 flex flex-col items-center justify-center gap-1">
           <p className="text-[8px] font-black uppercase text-v-white/40 tracking-[0.2em]">Total MVPs</p>
           <p className="text-2xl font-black italic text-yellow-500">{stats.total_mvps}</p>
        </div>
        */}
      </div>

      {/* Graph */}
      <div className="v-panel p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-v-white/70">Rendimiento (Últ. 5 J)</h3>
        </div>
        <PlayerStatsGraph data={stats.last_5_points} />
      </div>

      {/* Match History */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-v-white/50 px-1">Historial de Partidas</h3>
        <MatchHistoryList matches={data.performances} />
      </div>
    </div>
  );
}
