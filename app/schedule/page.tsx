import { createClient } from "@/utils/supabase/server";
import { getSession } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import Link from "next/link";

const VCT_SEASON_YEAR = 2027;

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const supabase = await createClient();
  const session = await getSession();

  if (!session) redirect("/login");

  // 1. Mostrar la jornada activa o, durante la pretemporada, la próxima.
  const { data: activeGw } = await supabase
    .from("gameweeks")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  const { data: nextGw } = activeGw
    ? { data: null }
    : await supabase
        .from("gameweeks")
        .select("*")
        .gt("start_date", new Date().toISOString())
        .order("start_date", { ascending: true })
        .limit(1)
        .maybeSingle();

  const selectedGw = activeGw ?? nextGw;

  if (!selectedGw) {
    return (
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
        <Link href="/dashboard">
        <div className="flex items-end justify-between px-1">
          <div className="flex flex-col items-end">
            <div className="flex justify-between items-center px-1">
              <div className="text-v-white/20 hover:text-v-white transition-colors">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </div>
              <h1 className="text-4xl leading-none italic uppercase">Agenda</h1>
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">
              Jornada Semanal
            </p>
          </div>
        </div>
        </Link>
        <div className="v-panel text-center py-20 opacity-40">
          <p className="text-xs italic">
            Todavía no hay jornadas configuradas.
          </p>
        </div>
      </div>
    );
  }

  // 2. Obtener todos los partidos de esta jornada
  const [matchesResult, seasonTeamsResult] = await Promise.all([
    supabase
      .from("matches")
      .select(
        `
        id,
        vlr_id,
        match_date,
        status,
        team_a_id:team_a,
        team_b_id:team_b,
        team_a:pro_teams!matches_team_a_fkey (name, tag),
        team_b:pro_teams!matches_team_b_fkey (name, tag),
        team_a_score,
        team_b_score
      `,
      )
      .eq("gameweek_id", selectedGw.id)
      .order("match_date", { ascending: true }),
    supabase
      .from("vct_season_teams")
      .select("team_id")
      .eq("season_year", VCT_SEASON_YEAR)
      .eq("confirmation_status", "confirmed")
      .eq("fantasy_eligible", true),
  ]);

  const eligibleTeamIds = new Set(
    (seasonTeamsResult.data ?? []).map((entry) => entry.team_id),
  );
  const matches = (matchesResult.data ?? []).filter(
    (match) =>
      Boolean(match.team_a_id) &&
      Boolean(match.team_b_id) &&
      eligibleTeamIds.has(match.team_a_id) &&
      eligibleTeamIds.has(match.team_b_id),
  );

  return (
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
      <div className="flex items-end justify-between px-1">
        <div>
          <h1 className="text-4xl leading-none italic uppercase">Calendario</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">
            {selectedGw.name} // VCT 2027
          </p>
        </div>
        <StatusBadge
          label={activeGw ? "EN CURSO" : "PRÓXIMA"}
          variant="white"
        />
      </div>

      <div className="space-y-4">
        {matches?.map((match: any) => {
          const isLive = match.status === "live";
          const isFinished =
            match.status === "finished" || match.status === "completed";
          const date = match.match_date ? new Date(match.match_date) : null;

          return (
            <div
              key={match.id}
              className="v-panel p-4 flex items-center justify-between group hover:border-v-red transition-all"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 text-sm font-black uppercase italic tracking-tighter sm:gap-3">
                <span className="min-w-0 flex-1 truncate">{match.team_a?.tag || match.team_a?.name}</span>
                {(isLive || isFinished) && (
                  <span className={`text-xl ${isLive ? 'text-v-red' : 'text-white'}`}>
                    {match.team_a_score}
                  </span>
                )}
              </div>

              <div className="flex min-w-[92px] flex-col items-center border-x border-white/5 px-3 sm:min-w-[120px] sm:px-6">
                {isLive ? (
                  <span className="text-xs font-black text-v-red animate-pulse">
                    EN VIVO
                  </span>
                ) : isFinished ? (
                  <span className="text-xs font-black text-v-white/40">
                    FINALIZADO
                  </span>
                ) : (
                  <span className="text-xs font-black text-v-white">
                    {date?.toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
                <span className="text-[8px] font-black uppercase text-v-white/20 mt-1">
                  {date?.toLocaleDateString("es-ES", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>

              <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right text-sm font-black uppercase italic tracking-tighter sm:gap-3">
                {(isLive || isFinished) && (
                  <span className={`text-xl ${isLive ? 'text-v-red' : 'text-white'}`}>
                    {match.team_b_score}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{match.team_b?.tag || match.team_b?.name}</span>
              </div>
            </div>
          );
        })}

        {(!matches || matches.length === 0) && (
          <div className="v-panel text-center py-12 opacity-40">
            <p className="text-xs italic">
              Todavía no hay partidos confirmados para esta jornada.
            </p>
          </div>
        )}
      </div>

      <Link
        href="/dashboard"
        className="v-btn-secondary w-full py-3 text-[10px]"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
