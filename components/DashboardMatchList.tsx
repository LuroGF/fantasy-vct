import Link from "next/link";
import Image from "next/image";

import { createClient } from "@/utils/supabase/server";

const VCT_SEASON_YEAR = 2027;
const MAX_LIVE_AGE_MS = 12 * 60 * 60 * 1000;

function relation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function DashboardMatchList() {
  const supabase = await createClient();
  const [matchesResult, seasonTeamsResult] = await Promise.all([
    supabase
      .from("matches")
      .select(`
        id,
        vlr_id,
        match_date,
        status,
        team_a,
        team_b,
        team_a_score,
        team_b_score,
        pro_teams_team_a:team_a (name, tag, logo_url),
        pro_teams_team_b:team_b (name, tag, logo_url)
      `)
      .in("status", ["upcoming", "live"])
      .order("match_date", { ascending: true }),
    supabase
      .from("vct_season_teams")
      .select("team_id")
      .eq("season_year", VCT_SEASON_YEAR)
      .eq("confirmation_status", "confirmed")
      .eq("fantasy_eligible", true),
  ]);

  const matches = matchesResult.data;
  const error = matchesResult.error ?? seasonTeamsResult.error;
  const eligibleTeamIds = new Set(
    (seasonTeamsResult.data ?? []).map((entry) => entry.team_id),
  );

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  const visibleMatches = (matches ?? [])
    .filter((match) => {
      if (
        !match.team_a ||
        !match.team_b ||
        !eligibleTeamIds.has(match.team_a) ||
        !eligibleTeamIds.has(match.team_b)
      ) {
        return false;
      }
      if (!match.match_date) return false;
      const date = new Date(match.match_date);
      if (Number.isNaN(date.getTime())) return false;

      if (match.status === "live") {
        const age = now.getTime() - date.getTime();
        return age >= 0 && age <= MAX_LIVE_AGE_MS;
      }

      return (
        date >= startOfToday &&
        date <= endOfWeek
      );
    })
    .sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1;
      if (a.status !== "live" && b.status === "live") return 1;
      return (
        new Date(a.match_date ?? 0).getTime() -
        new Date(b.match_date ?? 0).getTime()
      );
    });

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between px-1">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-v-white/30">
            Esta semana
          </p>
          <h2 className="text-2xl">Próximos partidos VCT</h2>
        </div>
        <Link href="/schedule" className="mb-1 text-[10px] font-black uppercase text-v-red hover:tracking-widest">
          Ver agenda
        </Link>
      </div>

      <div className="grid gap-3">
        {visibleMatches.map((match) => {
          const teamA = relation(match.pro_teams_team_a);
          const teamB = relation(match.pro_teams_team_b);
          const isLive = match.status === "live";
          const date = match.match_date ? new Date(match.match_date) : null;
          const validDate = date && !Number.isNaN(date.getTime()) ? date : null;

          return (
            <article key={match.id} className="v-card-animated overflow-hidden">
              <div className="grid min-h-20 grid-cols-[1fr_auto_1fr] items-stretch">
                <div className="flex min-w-0 items-center gap-3 px-3 sm:px-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-white/5 bg-white/5 p-1">
                    {teamA?.logo_url ? (
                      <Image src={teamA.logo_url} alt="" width={36} height={36} className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-[9px] font-black text-v-white/30">{teamA?.tag ?? "TBD"}</span>
                    )}
                  </div>
                  <span className="truncate text-xs font-black uppercase italic sm:text-sm">
                    {teamA?.tag || teamA?.name || "TBD"}
                  </span>
                  {isLive && <span className="ml-auto text-xl font-black text-live">{match.team_a_score ?? 0}</span>}
                </div>

                <div className="relative flex w-20 flex-col items-center justify-center border-x border-white/10 bg-v-navy/60 sm:w-28">
                  <span className={`text-[10px] font-black ${isLive ? "animate-pulse text-live" : "text-v-red"}`}>
                    {isLive
                      ? "LIVE"
                      : validDate
                        ? new Intl.DateTimeFormat("es-ES", {
                            timeZone: "Europe/Madrid",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(validDate)
                        : "--:--"}
                  </span>
                  <span className="mt-1 text-[7px] font-black uppercase text-v-white/35">
                    {validDate
                      ? new Intl.DateTimeFormat("es-ES", {
                          timeZone: "Europe/Madrid",
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        }).format(validDate)
                      : ""}
                  </span>
                </div>

                <div className="flex min-w-0 items-center justify-end gap-3 px-3 text-right sm:px-4">
                  {isLive && <span className="mr-auto text-xl font-black text-live">{match.team_b_score ?? 0}</span>}
                  <span className="truncate text-xs font-black uppercase italic sm:text-sm">
                    {teamB?.tag || teamB?.name || "TBD"}
                  </span>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-white/5 bg-white/5 p-1">
                    {teamB?.logo_url ? (
                      <Image src={teamB.logo_url} alt="" width={36} height={36} className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-[9px] font-black text-v-white/30">{teamB?.tag ?? "TBD"}</span>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}

        {(error || visibleMatches.length === 0) && (
          <div className="v-panel border-white/5 py-10 text-center">
            <p className="text-xs text-v-white/40">
              {error
                ? "No se han podido cargar los partidos en este momento."
                : "No hay partidos VCT programados para esta semana."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export function DashboardMatchListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-52 animate-pulse rounded bg-v-white/5" />
      <div className="grid gap-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-20 animate-pulse rounded bg-v-white/5" />
        ))}
      </div>
    </div>
  );
}
