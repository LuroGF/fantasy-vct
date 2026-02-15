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
import { RecentActivity } from "@/components/RecentActivity";
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
      <Link
        href="/players"
        className="v-panel p-2 py-3 sm:p-4 border-l-v-role-duelista group hover:bg-v-role-duelista/5 transition-all cursor-pointer"
      >
        <p className="text-[7px] sm:text-[8px] font-black uppercase text-v-role-duelista/60 leading-none mb-1 group-hover:text-v-role-duelista transition-colors truncate">
          Ojeador
        </p>
        <p className="text-lg sm:text-2xl font-black italic leading-none text-v-role-duelista">
          {playerCount || 0}
        </p>
      </Link>
      <div className="v-panel p-2 py-3 sm:p-4 border-l-v-role-iniciador group hover:bg-v-role-iniciador/5 transition-all">
        <p className="text-[7px] sm:text-[8px] font-black uppercase text-v-role-iniciador/60 leading-none mb-1 group-hover:text-v-role-iniciador transition-colors truncate">
          Equipos
        </p>
        <p className="text-lg sm:text-2xl font-black italic leading-none text-v-role-iniciador">
          {teamCount || 0}
        </p>
      </div>
      <div className="v-panel p-2 py-3 sm:p-4 border-l-v-role-controlador group hover:bg-v-role-controlador/5 transition-all">
        <p className="text-[7px] sm:text-[8px] font-black uppercase text-v-role-controlador/60 leading-none mb-1 group-hover:text-v-role-controlador transition-colors truncate">
          Ligas
        </p>
        <p className="text-lg sm:text-2xl font-black italic leading-none text-v-role-controlador">
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
  animate-in fade-in slide-in-from-bottom-4 duration-700 py-6 sm:pb-44
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

        {/* Recent Activity Section */}
        <Suspense
          fallback={<div className="h-32 v-panel animate-pulse bg-white/5" />}
        >
          <RecentActivity profileId={user?.id || ""} />
        </Suspense>

        {/* Real-time DB Stats (Suspended) */}
        <Suspense fallback={<StatsSkeleton />}>
          <DashboardStats supabase={supabase} />
        </Suspense>

        <div className="space-y-4">
          <div className="flex gap-3">
            <Link
              href="/team"
              className="v-btn-primary flex-1 shadow-xl shadow-v-red/20 group"
            >
              <span className="flex items-center justify-center gap-1 text-xs sm:text-[10px] lg:text-base">
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
        <Challenges />
      </div>
    </ClientRefreshWrapper>
  );
}
