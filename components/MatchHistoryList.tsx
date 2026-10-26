"use client";

interface MatchHistoryListProps {
  matches: any[];
  playerTeamId?: string | null;
}

function formatDate(value?: string | null) {
  if (!value) return "Fecha pendiente";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

export function MatchHistoryList({
  matches,
  playerTeamId,
}: MatchHistoryListProps) {
  const recentMatches = (matches ?? []).slice(0, 5);

  return (
    <div className="space-y-3">
      {recentMatches.map((performance) => {
        const match = performance.matches;
        if (!match) return null;

        const teamA = match.pro_teams_team_a;
        const teamB = match.pro_teams_team_b;
        const opponent =
          playerTeamId && match.team_a === playerTeamId ? teamB : teamA;
        const breakdown = performance.score_breakdown ?? {};

        return (
          <article key={performance.id} className="v-panel overflow-hidden">
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[7px] font-black uppercase tracking-[0.18em] text-v-white/25">
                  {formatDate(match.match_date)} · {performance.maps_played} mapas
                </p>
                <div className="mt-1 flex items-center gap-2">
                  {opponent?.logo_url ? (
                    <img
                      src={opponent.logo_url}
                      alt=""
                      className="h-6 w-6 object-contain"
                    />
                  ) : null}
                  <p className="truncate text-base font-black italic uppercase">
                    vs {opponent?.tag || opponent?.name || "Rival"}
                  </p>
                  {match.team_a_score !== null && match.team_b_score !== null ? (
                    <span className="text-[10px] font-black text-v-white/35">
                      {match.team_a_score}-{match.team_b_score}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-[8px] font-black uppercase tracking-wider text-v-white/30">
                  {performance.map_names?.join(" · ") || "Mapas pendientes"}
                </p>
              </div>

              <div className="grid shrink-0 grid-cols-3 gap-5 text-right">
                <div>
                  <p className="font-mono text-sm text-v-white/80">
                    {performance.kills}/{performance.deaths}/{performance.assists}
                  </p>
                  <p className="text-[7px] font-black uppercase tracking-widest text-v-white/30">
                    K / D / A
                  </p>
                </div>
                <div>
                  <p className="text-sm font-black italic text-v-white/75">
                    {performance.acs}
                  </p>
                  <p className="text-[7px] font-black uppercase tracking-widest text-v-white/30">
                    ACS
                  </p>
                </div>
                <div>
                  <p className="text-lg font-black italic text-v-red">
                    {performance.fantasy_points}
                  </p>
                  <p className="text-[7px] font-black uppercase tracking-widest text-v-white/30">
                    Puntos
                  </p>
                </div>
              </div>
            </div>

            <details className="group border-t border-white/5 bg-black/10">
              <summary className="cursor-pointer list-none px-4 py-2 text-[8px] font-black uppercase tracking-[0.16em] text-v-white/30 transition hover:text-v-red">
                Ver cálculo de puntos
              </summary>
              <div className="grid grid-cols-2 gap-2 border-t border-white/5 px-4 py-3 text-[9px] sm:grid-cols-4">
                <div>
                  <p className="text-v-white/30">Kills y muertes</p>
                  <p className="font-black text-v-white/70">
                    {signed(Number(breakdown.combat ?? 0))}
                  </p>
                </div>
                <div>
                  <p className="text-v-white/30">Asistencias</p>
                  <p className="font-black text-v-white/70">
                    {signed(Number(breakdown.assists ?? 0))}
                  </p>
                </div>
                <div>
                  <p className="text-v-white/30">Primeros duelos</p>
                  <p className="font-black text-v-white/70">
                    {signed(Number(breakdown.first_duels ?? 0))}
                  </p>
                </div>
                <div>
                  <p className="text-v-white/30">Bonus ACS</p>
                  <p className="font-black text-v-white/70">
                    {signed(Number(breakdown.acs ?? 0))}
                  </p>
                </div>
              </div>
            </details>
          </article>
        );
      })}
    </div>
  );
}
