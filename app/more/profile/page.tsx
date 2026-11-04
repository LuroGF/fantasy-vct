import { createClient } from "@/utils/supabase/server";
import { getSession } from "@/lib/actions/auth";
import { getGlobalRank } from "@/lib/actions/leagues";
import { getAllTeams } from "@/lib/actions/profile";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Download, Trophy, Users, Star } from "lucide-react";
import { EditProfileButton } from "@/components/EditProfileButton";
import { DeleteAccountSection } from "@/components/DeleteAccountSection";
import { getServerTranslator } from "@/lib/i18n/server";
import { translateProfileTitle } from "@/lib/i18n/profile";

export default async function ProfilePage() {
  const { t } = await getServerTranslator();
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createClient();

  // Fetch profile
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  const [
    { data: favoriteTeam },
    teams,
    { data: participations },
    globalRank,
    { data: bestRankData },
    { data: recentScores },
  ] = await Promise.all([
    profileData?.fav_team_id
      ? supabase
          .from("pro_teams")
          .select("name, tag, logo_url")
          .eq("id", profileData.fav_team_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getAllTeams(),
    supabase
      .from("league_participants")
      .select("total_points, league_id, leagues(name)")
      .eq("profile_id", session.user.id)
      .order("total_points", { ascending: false }),
    getGlobalRank(session.user.id),
    supabase
      .from("participant_scores_history")
      .select("rank_in_league, gameweek_id")
      .eq("profile_id", session.user.id)
      .eq("rank_in_league", 1)
      .limit(1),
    supabase
      .from("participant_scores_history")
      .select("points_earned, rank_in_league, gameweek_id, league_id, leagues(name)")
      .eq("profile_id", session.user.id)
      .order("gameweek_id", { ascending: false })
      .limit(5),
  ]);

  const profile = profileData
    ? { ...profileData, pro_teams: favoriteTeam }
    : null;

  const wins = bestRankData?.length || 0;

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
            <div>
              <h1 className="text-4xl leading-none italic uppercase">{t("profile.title")}</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">{t("profile.coach")}</p>
            </div>
          </div>
        <EditProfileButton profile={profile} teams={teams} />
      </div>

      <div className="space-y-6">
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="v-panel p-0 overflow-hidden relative group">
            {/* Dynamic Banner Color */}
            <div 
              className="h-1 lg:h-2 w-full transition-colors duration-500"
              style={{ backgroundColor: bannerColor }}
            />
            
            <div className="p-6 space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 -mr-24 -mt-24 rotate-45 opacity-5" style={{ backgroundColor: bannerColor }} />
              
               {/* Favorite Team Badge */}
              {profile?.pro_teams && (
                <div className="absolute top-8 right-6 flex flex-col items-center gap-1">
                  <div className="relative w-16 h-16 bg-v-black/40 backdrop-blur-md p-3 border border-white/5 flex items-center justify-center">
                    <Image src={profile.pro_teams.logo_url} fill sizes="64px" className="object-contain p-3" alt="" />
                  </div>
                  <span className="text-[8px] font-black uppercase text-v-white/40 tracking-[0.3em] font-oswald">{t("profile.fan")}</span>
                </div>
              )}

              <div className="flex items-center gap-6 relative z-10">
                <div 
                  className="w-24 h-24 bg-v-gray border-2 flex items-center justify-center text-4xl font-black italic shadow-2xl transition-all duration-500"
                  style={{ borderColor: bannerColor, color: bannerColor, backgroundColor: `${bannerColor}10` }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0 pr-12 lg:pr-16">
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter truncate leading-none">
                    {profile?.username || t("profile.defaultCoach")}
                  </h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span 
                      className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border transition-colors duration-500"
                      style={{ color: bannerColor, borderColor: `${bannerColor}40`, backgroundColor: `${bannerColor}10` }}
                    >
                      {translateProfileTitle(profile?.title, t)}
                    </span>
                    <span className="px-2 py-0.5 bg-v-white/5 text-v-white/40 text-[8px] font-black uppercase tracking-widest border border-white/5">
                       #{globalRank} {t("profile.global")}
                    </span>
                  </div>
                </div>
              </div>

              {profile?.bio && (
                <div className="bg-v-black/20 p-4 border-l-2 relative z-10" style={{ borderColor: `${bannerColor}40` }}>
                  <p className="text-sm text-v-white/70 italic leading-relaxed">
                    {`“${profile.bio}”`}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                <div className="v-panel bg-v-black/40 border-white/5 p-4 flex flex-col items-center">
                  <Trophy className="w-4 h-4 mb-2 opacity-50" style={{ color: bannerColor }} />
                  <p className="text-2xl font-black italic leading-none">{totalGlobalPoints.toLocaleString()}</p>
                  <p className="text-[8px] font-black uppercase text-v-white/20 tracking-widest mt-2">{t("profile.globalPoints")}</p>
                </div>
                <div className="v-panel bg-v-black/40 border-white/5 p-4 flex flex-col items-center">
                  <Users className="w-4 h-4 text-v-white mb-2 opacity-50" />
                  <p className="text-2xl font-black italic leading-none">{totalLeagues}</p>
                  <p className="text-[8px] font-black uppercase text-v-white/20 tracking-widest mt-2">{t("profile.leagues")}</p>
                </div>
                <div className="v-panel bg-v-black/40 border-white/5 p-4 flex flex-col items-center">
                   <Star className="w-4 h-4 text-yellow-500 mb-2 opacity-50" />
                  <p className="text-2xl font-black italic leading-none text-yellow-400">{wins}</p>
                  <p className="text-[8px] font-black uppercase text-v-white/20 tracking-widest mt-2">{t("profile.firstWeeks")}</p>
                </div>
                <div className="v-panel bg-v-black/40 border-white/5 p-4 flex flex-col items-center">
                  <div className="w-4 h-4 flex items-center justify-center mb-2">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: bannerColor }} />
                  </div>
                  <p className="text-2xl font-black italic leading-none text-v-white/80">{t("profile.active")}</p>
                  <p className="text-[8px] font-black uppercase text-v-white/20 tracking-widest mt-2">{t("profile.account")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Performance */}
          <div className="v-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black uppercase text-v-white/30 tracking-widest uppercase">{t("profile.recentHistory")}</p>
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
                        <p className="text-[8px] font-black uppercase text-v-white/30">{t("profile.gameweek", { number: s.gameweek_id })}</p>
                      </div>
                    </div>
                    <span className="text-sm font-black italic text-v-white/80">
                      {(s.points_earned || 0).toLocaleString()} <span className="text-v-red text-[9px]">{t("profile.points")}</span>
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-[10px] font-black uppercase text-v-white/20 py-10 text-center italic">{t("profile.noActivity")}</p>
              )}
            </div>
          </div>

          <section className="v-panel p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black italic uppercase">{t("profile.yourData")}</h2>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-v-white/45">
                  {t("profile.dataDescription")}
                </p>
              </div>
              <a
                href="/api/account/export"
                download
                className="v-btn-secondary inline-flex shrink-0 items-center justify-center gap-2 px-5 py-3 text-[9px]"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {t("profile.downloadData")}
              </a>
            </div>
          </section>

          <DeleteAccountSection />
        </div>

      </div>
    </div>
  );
}
