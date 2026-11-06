import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CircleDollarSign, ShieldCheck, Target, Trophy } from "lucide-react";

import ClientRefreshWrapper from "@/components/ClientRefreshWrapper";
import {
  DashboardMatchList,
  DashboardMatchListSkeleton,
} from "@/components/DashboardMatchList";
import { RecentActivity } from "@/components/RecentActivity";
import { DashboardLeagueSwitcher } from "@/components/DashboardLeagueSwitcher";
import { getUserLeagues } from "@/lib/actions/leagues";
import { createClient } from "@/utils/supabase/server";
import { getServerTranslator } from "@/lib/i18n/server";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{ league?: string }>;
};

function money(value: number | null | undefined) {
  return `${(Number(value ?? 0) / 1_000_000).toFixed(1)}M`;
}

function leagueData(participation: any) {
  if (!participation?.leagues) return null;
  return Array.isArray(participation.leagues)
    ? participation.leagues[0] ?? null
    : participation.leagues;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const { t } = await getServerTranslator();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const userLeagues = await getUserLeagues(user.id);
  const selectedParticipation =
    userLeagues.find((entry: any) => entry.league_id === params.league) ??
    userLeagues[0] ??
    null;
  const selectedLeague = leagueData(selectedParticipation);

  const [{ data: profile }, { data: activeGameweek }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, onboarding_status")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("gameweeks")
      .select("id, name, start_date, end_date, is_locked")
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  let rank = 0;
  let participantCount = 0;
  let gameweekPoints = 0;
  let starterCount = 0;
  let rosterCount = 0;

  if (selectedParticipation?.league_id) {
    const [{ data: standings }, { data: roster }, scoreResult] =
      await Promise.all([
        supabase
          .from("league_participants")
          .select("profile_id, total_points")
          .eq("league_id", selectedParticipation.league_id)
          .order("total_points", { ascending: false }),
        supabase
          .from("user_rosters")
          .select("id, slot_type, is_starter")
          .eq("league_id", selectedParticipation.league_id)
          .eq("profile_id", user.id)
          .eq("is_active", true),
        activeGameweek
          ? supabase
              .from("participant_scores_history")
              .select("points_earned")
              .eq("league_id", selectedParticipation.league_id)
              .eq("profile_id", user.id)
              .eq("gameweek_id", activeGameweek.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

    participantCount = standings?.length ?? 0;
    const rankIndex =
      standings?.findIndex((entry) => entry.profile_id === user.id) ?? -1;
    rank = rankIndex >= 0 ? rankIndex + 1 : 0;
    rosterCount = roster?.length ?? 0;
    starterCount =
      roster?.filter(
        (entry) => entry.is_starter || entry.slot_type === "starter",
      ).length ?? 0;
    gameweekPoints = Number(scoreResult.data?.points_earned ?? 0);
  }

  const username =
    profile?.username || user.email?.split("@")[0] || t("dashboard.coachFallback");
  const metrics = [
    {
      label: t("dashboard.position"),
      value: rank > 0 ? `#${rank}` : "—",
      detail: participantCount > 0 ? t("dashboard.of", { count: participantCount }) : t("dashboard.unranked"),
      icon: Trophy,
    },
    {
      label: t("dashboard.points"),
      value: String(selectedParticipation?.total_points ?? 0),
      detail: t("dashboard.thisGameweek", { points: gameweekPoints }),
      icon: Target,
    },
    {
      label: t("dashboard.balance"),
      value: money(selectedParticipation?.current_budget),
      detail: t("dashboard.available"),
      icon: CircleDollarSign,
    },
    {
      label: t("dashboard.lineup"),
      value: `${starterCount}/5`,
      detail: t("dashboard.rosterPlayers", { count: rosterCount }),
      icon: ShieldCheck,
    },
  ];

  return (
    <ClientRefreshWrapper>
      <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-6 sm:max-w-xl sm:px-6 sm:pb-44 lg:max-w-4xl">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-v-red">
              VCT Fantasy 2027
            </p>
            <h1 className="text-4xl leading-none sm:text-5xl">{t("dashboard.hello", { name: username })}</h1>
            <p className="text-sm text-v-white/50">
              {t("dashboard.intro")}
            </p>
          </div>
          <OnboardingTutorial autoOpen={profile?.onboarding_status === "pending"} />
        </header>

        {userLeagues.length > 1 && (
          <DashboardLeagueSwitcher
            leagues={userLeagues.flatMap((participation: any) => {
              const league = leagueData(participation);
              return league
                ? [{ id: participation.league_id, name: league.name }]
                : [];
            })}
            activeLeagueId={selectedParticipation?.league_id || null}
          />
        )}

        {!selectedParticipation || !selectedLeague ? (
          <section className="v-panel space-y-5 py-10 text-center">
            <div>
              <h2 className="text-2xl">{t("dashboard.startFirstLeague")}</h2>
              <p className="mt-2 text-sm text-v-white/50">
                {t("dashboard.noLeagueDescription")}
              </p>
            </div>
            <Link href="/leagues" className="v-btn-primary inline-flex text-xs">
              {t("dashboard.goLeagues")}
            </Link>
          </section>
        ) : (
          <>
            <section className="space-y-3">
              <div className="flex items-end justify-between px-1">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-v-white/30">
                    {t("dashboard.selectedLeague")}
                  </p>
                  <h2 className="text-2xl">{selectedLeague.name}</h2>
                </div>
                <Link href="/leagues" className="text-[10px] font-black uppercase text-v-red hover:tracking-widest">
                  {t("dashboard.viewLeague")}
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {metrics.map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <div key={metric.label} className="v-panel p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-v-white/40">
                          {metric.label}
                        </span>
                        <Icon className="h-4 w-4 text-v-red" />
                      </div>
                      <p className="text-2xl font-black italic">{metric.value}</p>
                      <p className="mt-1 text-[9px] text-v-white/35">{metric.detail}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="v-panel flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-v-red">
                  {t("dashboard.yourGameweek")}
                </p>
                <h2 className="mt-1 text-2xl">
                  {activeGameweek?.name ?? t("dashboard.noActiveGameweek")}
                </h2>
                <p className="mt-2 text-xs text-v-white/45">
                  {activeGameweek
                    ? activeGameweek.is_locked
                      ? t("dashboard.lineupLocked")
                      : starterCount === 5
                        ? t("dashboard.lineupComplete")
                        : t("dashboard.selectedStarters", { count: starterCount })
                    : t("dashboard.nextGameweekNotice")}
                </p>
              </div>
              <Link href="/team" className="v-btn-primary shrink-0 text-xs">
                {t("dashboard.reviewTeam")}
              </Link>
            </section>
          </>
        )}

        <Suspense fallback={<DashboardMatchListSkeleton />}>
          <DashboardMatchList />
        </Suspense>

        {userLeagues.length > 0 && (
          <Suspense fallback={<div className="h-32 v-panel animate-pulse bg-white/5" />}>
            <RecentActivity profileId={user.id} />
          </Suspense>
        )}
      </div>
    </ClientRefreshWrapper>
  );
}
