import { createClient } from "@/utils/supabase/server";
import { getGlobalRank } from "@/lib/actions/leagues";
import { getSession } from "@/lib/actions/auth";
import { getFriendStatus } from "@/lib/actions/friends";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Trophy, Users, Star, ArrowLeft } from "lucide-react";
import { FriendButton } from "@/components/FriendButton";

export default async function PublicProfilePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createClient();

  // Fetch target profile
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const [
    { data: favoriteTeam },
    { data: participations },
    globalRank,
    { data: bestRankData },
    { data: recentScores },
    friendStatus,
  ] = await Promise.all([
    profileData?.fav_team_id
      ? supabase
          .from("pro_teams")
          .select("name, tag, logo_url")
          .eq("id", profileData.fav_team_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("league_participants")
      .select("total_points, league_id, leagues(name)")
      .eq("profile_id", id)
      .order("total_points", { ascending: false }),
    getGlobalRank(id),
    supabase
      .from("participant_scores_history")
      .select("rank_in_league")
      .eq("profile_id", id)
      .eq("rank_in_league", 1),
    supabase
      .from("participant_scores_history")
      .select("points_earned, rank_in_league, gameweek_id, league_id, leagues(name)")
      .eq("profile_id", id)
      .order("gameweek_id", { ascending: false })
      .limit(5),
    getFriendStatus(id),
  ]);

  const profile = profileData
    ? { ...profileData, pro_teams: favoriteTeam }
    : null;

  if (!profile) notFound();

  const wins = bestRankData?.length || 0;

  const initials = (profile.username || "?").slice(0, 2).toUpperCase();
  const bannerColor = profile.banner_color || "#ff4655";

  return (
    <div className="mx-auto w-full max-w-md sm:max-w-xl lg:max-w-4xl px-4 sm:px-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 py-6 mb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/more/community" className="text-v-white/20 hover:text-v-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-4xl leading-none italic uppercase">Expediente</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">Entrenador</p>
          </div>
        </div>
        
        {id !== session.user.id && (
          <FriendButton 
            targetId={id} 
            initialStatus={friendStatus} 
            currentUserId={session.user.id} 
          />
        )}
      </div>

      {/* Main Stats Card */}
      <div className="v-panel p-0 overflow-hidden relative group">
        {/* Dynamic Banner Accent */}
        <div 
          className="h-1 lg:h-2 w-full transition-colors duration-500"
          style={{ backgroundColor: bannerColor }}
        />
        
        <div className="p-6 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 -mr-24 -mt-24 rotate-45 opacity-5" style={{ backgroundColor: bannerColor }} />

           {/* Favorite Team Badge */}
           {profile.pro_teams && (
            <div className="absolute top-8 right-6 flex flex-col items-center gap-1">
              <div className="w-16 h-16 bg-v-black/40 backdrop-blur-md p-3 border border-white/5 flex items-center justify-center">
                <img src={profile.pro_teams.logo_url} className="w-full h-full object-contain" alt="" />
              </div>
              <span className="text-[8px] font-black uppercase text-v-white/40 tracking-[0.3em] font-oswald">FAN DE {profile.pro_teams.tag}</span>
            </div>
          )}

          <div className="flex items-center gap-6 relative z-10">
            <div 
              className="w-24 h-24 bg-v-gray border-2 flex items-center justify-center text-4xl font-black italic shadow-2xl transition-all duration-500"
              style={{ borderColor: bannerColor, color: bannerColor, backgroundColor: `${bannerColor}10` }}
            >
              {initials}
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">
                {profile.username}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span 
                  className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border transition-all duration-500"
                  style={{ color: bannerColor, borderColor: `${bannerColor}40`, backgroundColor: `${bannerColor}10` }}
                >
                  {profile.title === "Manager Novato"
                    ? "Entrenador novato"
                    : profile.title || "Entrenador novato"}
                </span>
                <span className="px-2 py-0.5 bg-v-white/5 text-v-white/40 text-[8px] font-black uppercase tracking-widest border border-white/5">
                  #{globalRank} GLOBAL
                </span>
              </div>
            </div>
          </div>

          {profile.bio && (
            <div className="bg-v-black/20 p-4 border-l-2 relative z-10" style={{ borderColor: `${bannerColor}40` }}>
              <p className="text-sm text-v-white/70 italic leading-relaxed">
                {`“${profile.bio}”`}
              </p>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
            <div className="v-panel bg-v-black/40 border-white/5 p-4 flex flex-col items-center">
              <Trophy className="w-4 h-4 mb-2 opacity-50" style={{ color: bannerColor }} />
              <p className="text-2xl font-black italic leading-none">{(profile.global_points || 0).toLocaleString()}</p>
              <p className="text-[8px] font-black uppercase text-v-white/20 tracking-widest mt-2">Puntos Globales</p>
            </div>
            <div className="v-panel bg-v-black/40 border-white/5 p-4 flex flex-col items-center">
              <Users className="w-4 h-4 text-v-white mb-2 opacity-50" />
              <p className="text-2xl font-black italic leading-none">{participations?.length || 0}</p>
              <p className="text-[8px] font-black uppercase text-v-white/20 tracking-widest mt-2">Ligas</p>
            </div>
            <div className="v-panel bg-v-black/40 border-white/5 p-4 flex flex-col items-center">
              <Star className="w-4 h-4 text-yellow-500 mb-2 opacity-50" />
              <p className="text-2xl font-black italic leading-none">{wins}</p>
              <p className="text-[8px] font-black uppercase text-v-white/20 tracking-widest mt-2">Semanas #1</p>
            </div>
            <div className="v-panel bg-v-black/40 border-white/5 p-4 flex flex-col items-center">
              <div className="w-4 h-4 flex items-center justify-center mb-2">
                 <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: bannerColor }} />
              </div>
              <p className="text-2xl font-black italic leading-none text-v-white/80">ACTIVA</p>
              <p className="text-[8px] font-black uppercase text-v-white/20 tracking-widest mt-2">CUENTA</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Participation History */}
        <div className="v-panel p-6 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-v-red">Despliegue en Ligas</h3>
          <div className="space-y-2">
            {participations && participations.length > 0 ? (
              participations.map((p: any) => (
                <div key={p.league_id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 border-dashed">
                  <span className="text-sm font-black uppercase tracking-wider text-v-white/90 truncate mr-4">
                    {(p.leagues as any)?.name}
                  </span>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black italic text-v-white">
                      {(p.total_points || 0).toLocaleString()} <span className="text-v-red text-[10px]">PTS</span>
                    </p>
                  </div>
                </div>
              ))
            ) : (
                <p className="text-[10px] font-black uppercase text-v-white/20 py-10 text-center italic">Sin actividad registrada en ligas</p>
            )}
          </div>
        </div>

        {/* Recent Performance */}
        <div className="v-panel p-6 space-y-4">
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-v-red">Rendimiento Reciente</h3>
           <div className="space-y-3">
             {recentScores && recentScores.length > 0 ? (
               recentScores.map((s: any, i: number) => (
                 <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                       <div className={`w-8 h-8 flex items-center justify-center text-[10px] font-black italic border transition-colors duration-500 ${
                         s.rank_in_league === 1 ? "border-yellow-400 text-yellow-400 bg-yellow-400/10" : "border-white/10 text-v-white/40"
                       }`}>
                         #{s.rank_in_league}
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-wide text-v-white/80">
                            {(s.leagues as any)?.name}
                          </p>
                          <p className="text-[8px] font-black uppercase text-v-white/30 italic">Jornada {s.gameweek_id}</p>
                       </div>
                    </div>
                    <p className="text-sm font-black italic text-v-white/90">
                      {s.points_earned.toLocaleString()} <span className="text-v-red text-[9px]">pts</span>
                    </p>
                 </div>
               ))
             ) : (
                <p className="text-[10px] font-black uppercase text-v-white/20 py-10 text-center italic">No hay historial de puntuación</p>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
