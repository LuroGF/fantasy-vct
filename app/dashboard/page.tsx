import Link from "next/link";
import { headers } from "next/headers";
export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { LiveHUD } from "@/components/LiveHUD";
import { Challenges } from "@/components/Challenges";

type VlrPayload = {
  stats: { label: string; value: string }[];
  upcomingMatches: { time: string; teams: string; event: string; date?: string }[];
  scoring: { label: string; value: string }[];
};

const fallbackData: VlrPayload = {
  stats: [
    { label: "Active leagues", value: "128" },
    { label: "Weekly managers", value: "4.2k" },
    { label: "Matches tracked", value: "312" },
  ],
  upcomingMatches: [
    { time: "14:00", teams: "FNATIC vs NAVI", event: "VCT EMEA" },
    { time: "17:30", teams: "LOUD vs LEV", event: "VCT Americas" },
    { time: "20:00", teams: "PRX vs DRX", event: "VCT Pacific" },
  ],
  scoring: [
    { label: "Kill", value: "+2" },
    { label: "Assist", value: "+1" },
    { label: "First blood", value: "+3" },
    { label: "Clutch round", value: "+4" },
    { label: "Match win", value: "+5" },
    { label: "Series MVP", value: "+6" },
  ],
};


async function getDashboardStats(supabase: any) {
  const { count: playerCount } = await supabase.from('pro_players').select('*', { count: 'exact', head: true });
  const { count: teamCount } = await supabase.from('pro_teams').select('*', { count: 'exact', head: true });
  const { count: leagueCount } = await supabase.from('leagues').select('*', { count: 'exact', head: true });

  return {
    playerCount: playerCount || 0,
    teamCount: teamCount || 0,
    leagueCount: leagueCount || 0
  };
}

import { fetchVlrMatches } from "@/lib/vlr";
import { getUserLeagues } from "@/lib/actions/leagues";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Llamada directa a la lógica de scraping sin fetch interno
  const data = await fetchVlrMatches();
  const stats = await getDashboardStats(supabase);
  const matches = data?.upcomingMatches || [];
  
  const userLeagues = user ? await getUserLeagues(user.id) : [];

  // Obtener puntos reales del usuario (para el resumen del HUD)
  const userStats = userLeagues[0] || { total_points: 0 };

  const currentPoints = userStats?.total_points || 0;
  const rank = 0; // Se podría implementar un ranking global sumando puntuaciones
  const activeMatches = matches.filter(m => m.time.toLowerCase().includes("live") || m.time === "").length;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-v-red animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-v-white/50">Terminal v1.0.4 - Activo</span>
        </div>
        <StatusBadge label="En Línea" variant="white" className="animate-none" pulse />
      </div>

      {/* Live HUD Component */}
      <LiveHUD 
        currentPoints={currentPoints} 
        rank={rank} 
        activeMatches={activeMatches} 
      />

      {/* Real-time DB Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="v-panel p-2 py-3 border-l-v-white/20 group hover:border-l-v-red transition-all">
          <p className="text-[8px] font-black uppercase text-v-white/30 leading-none mb-1 group-hover:text-v-red transition-colors">Agentes</p>
          <p className="text-xl font-black italic leading-none">{stats.playerCount}</p>
        </div>
        <div className="v-panel p-2 py-3 border-l-v-white/20 group hover:border-l-v-red transition-all">
          <p className="text-[8px] font-black uppercase text-v-white/30 leading-none mb-1 group-hover:text-v-red transition-colors">Equipos</p>
          <p className="text-xl font-black italic leading-none">{stats.teamCount}</p>
        </div>
        <div className="v-panel p-2 py-3 border-l-v-white/20 group hover:border-l-v-red transition-all">
          <p className="text-[8px] font-black uppercase text-v-white/30 leading-none mb-1 group-hover:text-v-red transition-colors">Ligas</p>
          <p className="text-xl font-black italic leading-none">{stats.leagueCount}</p>
        </div>
      </div>

      {/* Main Stats / My Leagues */}
      <div className="space-y-4">
        <div className="flex items-end justify-between px-1">
          <Link href="/leagues">
            <h1 className="text-4xl leading-none italic hover:text-v-red transition-colors flex items-center gap-2">
              Escuadrones
              <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
            </h1>
          </Link>
          <span className="text-[10px] font-black uppercase text-v-red italic tracking-widest">S3 // 2026</span>
        </div>
        
        {userLeagues.map((ul: any) => (
          <div key={ul.leagues.id} className="v-panel relative overflow-hidden group hover:border-v-red transition-all cursor-pointer">
            <div className="absolute top-0 right-0 w-32 h-full bg-linear-to-l from-v-red/5 to-transparent pointer-events-none" />
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <h3 className="text-3xl italic tracking-tighter border-b-2 border-v-red w-fit">{ul.leagues.name}</h3>
                <p className="text-[10px] font-black uppercase text-v-white/40 tracking-widest mt-1">{"ID: "}{ul.leagues.invite_code}{" // Activa"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase text-v-white/30">Puntuación Combat</p>
                <p className="text-xl font-black italic">{ul.total_points.toLocaleString()} <span className="text-v-red text-[8px] not-italic">ACTIVA</span></p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-v-white/30">Créditos Disp.</p>
                <p className="text-xl font-black italic">${(ul.current_budget / 1000000).toFixed(1)}M</p>
              </div>
            </div>
          </div>
        ))}

        {userLeagues.length === 0 && (
          <div className="v-panel border-dashed border-v-white/10 py-12 text-center opacity-40">
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Sin Unidades Desplegadas</p>
            <Link href="/leagues" className="text-v-red text-[8px] underline mt-2 block">Unirse a Operación</Link>
          </div>
        )}

        <Link href="/team" className="v-btn-primary w-full shadow-xl shadow-v-red/20 group">
          <span className="flex items-center justify-center gap-2">
            Desplegar Tácticas
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </span>
        </Link>
      </div>

      {/* Upcoming Matches */}
      <div className="space-y-4">
        <div className="flex items-end justify-between px-1">
          <h2 className="text-2xl italic tracking-tighter">Transmisiones</h2>
          <Link href="/schedule" className="text-[10px] font-black uppercase text-v-red hover:tracking-widest transition-all mb-1">Agenda Completa</Link>
        </div>
        <div className="grid gap-3">
          {matches.map((match) => {
            const isLive = match.time.toLowerCase().includes("live") || match.time === "";
            return (
              <div key={match.teams} className="bg-v-gray/40 border-l-2 border-v-white/10 p-3 flex items-center justify-between group hover:border-v-red hover:bg-v-gray/60 transition-all">
                <div className="flex-1 text-sm font-black uppercase italic tracking-tighter group-hover:text-v-red transition-colors">
                  {match.teams.split(" vs ")[0]}
                </div>
                <div className="flex flex-col items-center px-4 border-x border-white/5 min-w-[100px]">
                  <span className={`text-xs font-black ${isLive ? "text-v-red animate-pulse" : "text-v-white"}`}>
                    {isLive ? "EN VIVO" : match.time}
                  </span>
                  <span className="text-[8px] font-black uppercase text-v-white/40 mb-0.5">
                    {match.date?.split(',')[1]?.trim() || ''}
                  </span>
                  <span className="text-[8px] font-black uppercase text-v-white/10 truncate max-w-[80px]">
                    {match.event}
                  </span>
                </div>
                <div className="flex-1 text-sm font-black uppercase italic tracking-tighter text-right">
                  {match.teams.split(" vs ")[1] ?? "TBD"}
                </div>
              </div>
            );
          })}

          {matches.length === 0 && (
            <div className="v-panel border-white/5 py-8 text-center">
              <p className="text-v-white/20 text-[10px] font-black uppercase tracking-widest">No hay transmisiones programadas para hoy</p>
            </div>
          )}
        </div>
      </div>

      {/* Protocolo de Desafíos */}
      <Challenges />

    </div>
  );
}
