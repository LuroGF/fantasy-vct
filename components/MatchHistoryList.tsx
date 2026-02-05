"use client";

interface MatchHistoryListProps {
  matches: any[];
}

export function MatchHistoryList({ matches }: MatchHistoryListProps) {
  if (!matches || matches.length === 0) {
    return <div className="text-center py-4 opacity-50 text-xs italic">No hay partidos registrados.</div>;
  }

  // Get only last 5 matches
  const recentMatches = matches.slice(0, 5);

  return (
    <div className="space-y-2">
      {recentMatches.map((perf) => {
        const match = perf.matches;
        if (!match) return null;
        
        // Determine rival (simple logic: assuming user looks at p1 or p2 logic doesn't matter much for display details)
        const team1 = match.pro_teams_team1;
        const team2 = match.pro_teams_team2;
        
        // Just show the match standard info: T1 vs T2
        return (
          <div key={perf.id} className="v-panel p-3 flex justify-between items-center text-xs">
            <div className="flex flex-col gap-1">
               <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                  <span className="text-v-white/70">{team1?.tag}</span>
                  <span className="text-v-red text-[8px]">VS</span>
                  <span className="text-v-white/70">{team2?.tag}</span>
               </div>
               <div className="text-[10px] text-v-white/40">
                 {new Date(match.start_date).toLocaleDateString()}
               </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-mono text-v-white/80">{perf.kills}/{perf.deaths}/{perf.assists}</p>
                <p className="text-[8px] uppercase tracking-widest text-v-white/40">K / D / A</p>
              </div>

               <div className="text-right min-w-[30px]">
                <p className="font-black text-v-red text-sm">{perf.fantasy_points}</p>
                <p className="text-[8px] uppercase tracking-widest text-v-white/40">PTS</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
