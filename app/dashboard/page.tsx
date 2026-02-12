import Link from "next/link";
import { headers } from "next/headers";
export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { LiveHUD } from "@/components/LiveHUD";
import { Challenges } from "@/components/Challenges";
import { getUserLeagues } from "@/lib/actions/leagues";
import ClientRefreshWrapper from "@/components/ClientRefreshWrapper";
import BonusManager from "@/components/BonusManager";
import { DashboardMatchList, DashboardMatchListSkeleton } from "@/components/DashboardMatchList";
import { Suspense } from "react";
import { Award } from "lucide-react";

// --- Stats Component ---
async function DashboardStats({ supabase }: { supabase: any }) {
  const { count: playerCount } = await supabase
    .from("pro_players")
    .select("*", { count: "exact", head: true });
  const { count: teamCount } = await supabase
    .from("pro_teams")
    .select("*", { count: "exact", head: true });
  const { count: leagueCount } = await supabase
    .from("leagues")
    .select("*", { count: "exact", head: true });

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <Link href="/players" className="v-panel p-2 py-3 sm:p-4 border-l-v-white/20 group hover:border-l-v-red transition-all cursor-pointer">
        <p className="text-[7px] sm:text-[8px] font-black uppercase text-v-white/30 leading-none mb-1 group-hover:text-v-red transition-colors truncate">
          Ojeador
        </p>
        <p className="text-lg sm:text-2xl font-black italic leading-none">
          {playerCount || 0}
        </p>
      </Link>
      <div className="v-panel p-2 py-3 sm:p-4 border-l-v-white/20 group hover:border-l-v-red transition-all">
        <p className="text-[7px] sm:text-[8px] font-black uppercase text-v-white/30 leading-none mb-1 group-hover:text-v-red transition-colors truncate">
          Equipos
        </p>
        <p className="text-lg sm:text-2xl font-black italic leading-none">
          {teamCount || 0}
        </p>
      </div>
      <div className="v-panel p-2 py-3 sm:p-4 border-l-v-white/20 group hover:border-l-v-red transition-all">
        <p className="text-[7px] sm:text-[8px] font-black uppercase text-v-white/30 leading-none mb-1 group-hover:text-v-red transition-colors truncate">
          Ligas
        </p>
        <p className="text-lg sm:text-2xl font-black italic leading-none">
          {leagueCount || 0}
        </p>
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2 animate-pulse">
      <div className="h-16 bg-v-white/5 rounded border-l-2 border-v-white/10" />
      <div className="h-16 bg-v-white/5 rounded border-l-2 border-v-white/10" />
      <div className="h-16 bg-v-white/5 rounded border-l-2 border-v-white/10" />
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userLeagues: any[] = [];

  if (user) {
    userLeagues = await getUserLeagues(user.id);
  }
  const userStats = userLeagues[0] || { total_points: 0 };
  const currentPoints = userStats?.total_points || 0;

  const activeMatches = 0;

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
        {/* Header Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-v-red animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-v-white/50">
              Versión v0.0.1 - Activa
            </span>
          </div>
          <StatusBadge
            label="En Línea"
            variant="white"
            className="animate-none"
            pulse
          />
        </div>

        {/* Live HUD Component */}
        {/* <LiveHUD
          currentPoints={currentPoints}
          activeLeagues={userLeagues.length}
          activeMatches={activeMatches}
        /> */}

        {/* Real-time DB Stats (Suspended) */}
        <Suspense fallback={<StatsSkeleton />}>
          <DashboardStats supabase={supabase} />
        </Suspense>

        {/* Main Stats / My Leagues */}
        <div className="space-y-4">
          <div className="flex items-end justify-between px-1">
            <Link href="/leagues">
              <h1 className="text-4xl leading-none italic hover:text-v-red transition-colors flex items-center gap-2">
                Ligas
                <svg
                  className="w-4 h-4 opacity-30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </h1>
            </Link>
            <Link 
              href="/ranking" 
              className="px-3 py-1 bg-v-red/10 border border-v-red/30 text-[8px] font-black uppercase text-v-red italic tracking-widest hover:bg-v-red hover:text-v-white transition-all shadow-lg shadow-v-red/5"
            >
              Ranking de Liga
            </Link>
          </div>

          {userLeagues.map((ul: any) => (
            <Link
              href="/ranking"
              key={ul.leagues.id}
              className="v-panel relative overflow-hidden group hover:border-v-red transition-all cursor-pointer active:scale-[0.98] select-none"
            >
              {/* Background accent */}
              <div className="absolute top-0 right-0 w-32 h-full bg-linear-to-l from-v-red/5 to-transparent pointer-events-none" />
              <div className="absolute -right-4 -top-6 text-6xl font-black text-white/5 italic select-none group-hover:text-v-red/10 transition-colors uppercase">
                {ul.leagues.name.substring(0, 3)}
              </div>

              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="text-2xl sm:text-3xl italic tracking-tighter border-b-2 border-v-red w-fit truncate max-w-full">
                    {ul.leagues.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-black uppercase text-v-white/40 tracking-widest">
                       ID: {ul.leagues.invite_code}
                    </span>
                    <span className="text-[8px] text-v-red/50 animate-pulse font-black uppercase tracking-tighter bg-v-red/5 px-1 border border-v-red/10 rounded-xs">
                       ACTIVA
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 relative z-10 group-hover:border-v-red/20 transition-colors">
                <div>
                  <p className="text-[8px] sm:text-[10px] font-black uppercase text-v-white/30 tracking-widest">
                    Puntuación Global
                  </p>
                  <p className="text-lg sm:text-xl font-black italic text-v-white">
                    {ul.total_points.toLocaleString()}
                  </p>
                </div>
                <div className="text-right border-l border-white/5 pl-4">
                  <p className="text-[8px] sm:text-[10px] font-black uppercase text-v-white/30 tracking-widest">
                    VP Disponible
                  </p>
                  <p className="text-lg sm:text-xl font-black italic text-v-red">
                    {(Number(ul.current_budget || 0) / 1000000).toFixed(1)}M
                  </p>
                </div>
              </div>
            </Link>
          ))}

          {userLeagues.length === 0 && (
            <div className="v-panel border-dashed border-v-white/10 py-12 text-center opacity-40">
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                Unete a una liga para jugar
              </p>
              <Link
                href="/leagues"
                className="text-v-red text-[8px] underline mt-2 block"
              >
                Unirse a una liga
              </Link>
            </div>
          )}

          <div className="flex gap-3">
              <Link
                href="/team"
                className="v-btn-primary flex-1 shadow-xl shadow-v-red/20 group"
              >
                <span className="flex items-center justify-center gap-2">
                  Editar equipo
                  <svg
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </span>
              </Link>
              <Link
                href="/players"
                className="v-panel flex-1 flex items-center justify-center gap-2 bg-v-white/5 border-white/10 hover:border-v-white transition-all group"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-v-white italic group-hover:text-v-red transition-colors flex items-center gap-2">
                   <Award className="w-3 h-3" /> Ojeador
                </span>
              </Link>
          </div>
        </div>

        {/* Upcoming Matches (Streaming) */}
        <Suspense fallback={<DashboardMatchListSkeleton />}>
          {/* @ts-ignore */}
          <DashboardMatchList />
        </Suspense>

        {/* Protocolo de Desafíos */}
        {/* <Challenges /> */}
      </div>
    </ClientRefreshWrapper>
  );
}
