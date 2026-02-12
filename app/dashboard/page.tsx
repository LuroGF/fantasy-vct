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
import {
  DashboardMatchList,
  DashboardMatchListSkeleton,
} from "@/components/DashboardMatchList";
import { Suspense } from "react";

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
    <div className="grid grid-cols-3 gap-2">
      <div className="v-panel p-2 py-3 border-l-v-white/20 group hover:border-l-v-red transition-all">
        <p className="text-[8px] font-black uppercase text-v-white/30 leading-none mb-1 group-hover:text-v-red transition-colors">
          Agentes
        </p>
        <p className="text-xl font-black italic leading-none">
          {playerCount || 0}
        </p>
      </div>
      <div className="v-panel p-2 py-3 border-l-v-white/20 group hover:border-l-v-red transition-all">
        <p className="text-[8px] font-black uppercase text-v-white/30 leading-none mb-1 group-hover:text-v-red transition-colors">
          Equipos
        </p>
        <p className="text-xl font-black italic leading-none">
          {teamCount || 0}
        </p>
      </div>
      <div className="v-panel p-2 py-3 border-l-v-white/20 group hover:border-l-v-red transition-all">
        <p className="text-[8px] font-black uppercase text-v-white/30 leading-none mb-1 group-hover:text-v-red transition-colors">
          Ligas
        </p>
        <p className="text-xl font-black italic leading-none">
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
            <span className="text-[10px] font-black uppercase text-v-red italic tracking-widest">
              S3 // 2026
            </span>
          </div>

          {userLeagues.map((ul: any) => (
            <div
              key={ul.leagues.id}
              className="v-panel relative overflow-hidden group hover:border-v-red transition-all cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-32 h-full bg-linear-to-l from-v-red/5 to-transparent pointer-events-none" />

              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <h3 className="text-3xl italic tracking-tighter border-b-2 border-v-red w-fit">
                    {ul.leagues.name}
                  </h3>
                  <p className="text-[10px] font-black uppercase text-v-white/40 tracking-widest mt-1">
                    {"ID: "}
                    {ul.leagues.invite_code}
                    {" // Activa"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 relative z-10">
                <div>
                  <p className="text-[10px] font-black uppercase text-v-white/30">
                    Puntuación
                  </p>
                  <p className="text-xl font-black italic">
                    {ul.total_points.toLocaleString()}{" "}
                    <span className="text-v-red text-[8px] not-italic pl-1">
                      ACTIVA
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-v-white/30">
                    VP Disp.
                  </p>
                  <p className="text-xl font-black italic">
                    {(ul.current_budget / 1000000).toFixed(1)}M VP
                  </p>
                </div>
              </div>
            </div>
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

          <Link
            href="/team"
            className="v-btn-primary w-full shadow-xl shadow-v-red/20 group"
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
