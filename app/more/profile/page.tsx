import { createClient } from "@/utils/supabase/server";
import { getSession } from "@/lib/actions/auth";
import { getGlobalRank } from "@/lib/actions/leagues";
import { getUserFriends } from "@/lib/actions/friends";
import { getAllTeams } from "@/lib/actions/profile";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Trophy, Users, Star, UserCheck, ShieldCheck } from "lucide-react";
import { EditProfileButton } from "@/components/EditProfileButton";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createClient();

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, pro_teams(tag, logo_url)")
    .eq("id", session.user.id)
    .single();

  // Fetch all teams for the customizer
  const teams = await getAllTeams();

  // Fetch leagues the user is in
  const { data: participations } = await supabase
    .from("league_participants")
    .select("total_points, league_id, leagues(name)")
    .eq("profile_id", session.user.id)
    .order("total_points", { ascending: false });

  // Global rank
  const globalRank = await getGlobalRank(session.user.id);

  // Friends
  const friends = await getUserFriends(session.user.id);

  // Best league rank
  const { data: bestRankData } = await supabase
    .from("participant_scores_history")
    .select("rank_in_league, gameweek_id")
    .eq("profile_id", session.user.id)
    .eq("rank_in_league", 1)
    .limit(1);

  const wins = bestRankData?.length || 0;

  // Recent score history
  const { data: recentScores } = await supabase
    .from("participant_scores_history")
    .select("points_earned, rank_in_league, gameweek_id, league_id, leagues(name)")
    .eq("profile_id", session.user.id)
    .order("gameweek_id", { ascending: false })
    .limit(5);

  const totalLeagues = participations?.length || 0;
  const totalGlobalPoints = profile?.global_points || 0;
  const initials = (profile?.username || "?").slice(0, 2).toUpperCase();
  const bannerColor = profile?.banner_color || "#ff4655";

  return (
    <div className="mx-auto w-full max-w-md sm:max-w-xl lg:max-w-4xl px-4 sm:px-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 py-6 mb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/more" className="text-v-white/20 hover:text-v-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-4xl leading-none italic uppercase">Perfil</h1>
        </div>
        <EditProfileButton profile={profile} teams={teams} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="v-panel p-0 overflow-hidden relative group">
            {/* Dynamic Banner Color */}
            <div 
              className="h-1 lg:h-2 w-full transition-colors duration-500"
              style={{ backgroundColor: bannerColor }}
            />
            
            <div className="p-6 space-y-6">
               {/* Favorite Team Badge */}
              {profile?.pro_teams && (
                <div className="absolute top-8 right-6 flex flex-col items-center gap-1">
                  <div className="w-12 h-12 bg-v-black/40 backdrop-blur-md p-2 border border-white/5 flex items-center justify-center">
                    <img src={profile.pro_teams.logo_url} className="w-full h-full object-contain" alt="" />
                  </div>
                  <span className="text-[8px] font-black uppercase text-v-white/40 tracking-widest">{profile.pro_teams.tag} FAN</span>
                </div>
              )}

              <div className="flex items-center gap-5">
                <div className="relative">
                  <div 
                    className="w-20 h-20 bg-v-gray border-2 flex items-center justify-center text-3xl font-black italic text-v-white shadow-2xl transition-colors duration-500"
                    style={{ borderColor: bannerColor, color: bannerColor, backgroundColor: `${bannerColor}10` }}
                  >
                    {initials}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-v-black rounded-full" />
                </div>
                <div className="flex-1 min-w-0 pr-12 lg:pr-16">
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter truncate leading-none">
                    {profile?.username || "Agente"}
                  </h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span 
                      className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border transition-colors duration-500"
                      style={{ color: bannerColor, borderColor: `${bannerColor}40`, backgroundColor: `${bannerColor}10` }}
                    >
                      {profile?.title || "Manager Novato"}
                    </span>
                    <span className="text-[9px] font-black uppercase text-v-white/30 tracking-widest">
                       #{globalRank} GLOBAL
                    </span>
                  </div>
                </div>
              </div>

              {profile?.bio && (
                <div className="bg-v-black/20 p-4 border-l-2 border-white/5">
                  <p className="text-xs text-v-white/60 italic leading-relaxed">
                    "{profile.bio}"
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-5">
                <div className="flex flex-col items-center p-3 bg-v-white/5 border border-white/5">
                  <p className="text-2xl font-black italic" style={{ color: bannerColor }}>{totalGlobalPoints.toLocaleString()}</p>
                  <p className="text-[8px] font-black uppercase text-v-white/30 tracking-widest mt-1 text-center">Pts Globales</p>
                </div>
                <div className="flex flex-col items-center p-3 bg-v-white/5 border border-white/5">
                  <p className="text-2xl font-black italic">{totalLeagues}</p>
                  <p className="text-[8px] font-black uppercase text-v-white/30 tracking-widest mt-1 text-center">Ligas</p>
                </div>
                <div className="flex flex-col items-center p-3 bg-v-white/5 border border-white/5">
                  <p className="text-2xl font-black italic text-yellow-400">{wins}</p>
                  <p className="text-[8px] font-black uppercase text-v-white/30 tracking-widest mt-1 text-center">Semanas #1</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Performance */}
          <div className="v-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black uppercase text-v-white/30 tracking-widest uppercase">Historial Reciente</p>
              <Trophy className="w-3 h-3 text-v-white/20" />
            </div>
            <div className="space-y-2">
              {recentScores && recentScores.length > 0 ? (
                recentScores.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 group">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 flex items-center justify-center text-[10px] font-black italic border ${
                        s.rank_in_league === 1 ? "border-yellow-400/50 text-yellow-400 bg-yellow-400/10" : "border-white/5 text-v-white/30"
                      }`}>
                        #{s.rank_in_league || "–"}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-v-white/70">{(s.leagues as any)?.name}</p>
                        <p className="text-[8px] font-black uppercase text-v-white/30">Jornada {s.gameweek_id}</p>
                      </div>
                    </div>
                    <span className="text-sm font-black italic text-v-white/80">
                      {(s.points_earned || 0).toLocaleString()} <span className="text-v-red text-[9px]">pts</span>
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-[10px] font-black uppercase text-v-white/20 py-10 text-center italic">Sin actividad registrada</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Friends Menu */}
          <div className="v-panel p-5 space-y-4 h-full">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black uppercase text-v-red tracking-widest">Mis Amigos</p>
              <UserCheck className="w-3 h-3 text-v-red" />
            </div>
            
            <div className="space-y-3">
              {friends.length > 0 ? (
                friends.map((friend: any) => (
                  <Link 
                    key={friend.id} 
                    href={`/more/profile/${friend.id}`}
                    className="flex items-center gap-3 p-2 hover:bg-v-white/5 border border-transparent hover:border-white/5 transition-all group"
                  >
                    <div className="w-8 h-8 bg-v-gray flex items-center justify-center text-[10px] font-black italic text-v-white/40 border border-white/10">
                      {friend.username?.substring(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-wide text-v-white/80 group-hover:text-v-white truncate transition-colors">
                        {friend.username}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
                        <span className="text-[8px] font-black text-v-white/20 uppercase">Online</span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-10 text-center space-y-3 border-2 border-dashed border-white/5">
                  <p className="text-[9px] font-black uppercase text-v-white/20">No tienes amigos añadidos</p>
                  <Link href="/more/community" className="inline-block text-[8px] font-black uppercase text-v-red border border-v-red/30 px-3 py-1 bg-v-red/5 hover:bg-v-red/10 transition-colors">
                    Buscar Amigos
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
