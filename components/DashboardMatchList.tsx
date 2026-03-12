import { fetchVlrMatches, getTeamTag, getTeamLogo } from "@/lib/vlr";
import Link from "next/link";

export async function DashboardMatchList() {
    // This fetch might take time, so we stream it
    // Fetch only 1 page for dashboard speed
    const data = await fetchVlrMatches(1);
    const matches = data?.upcomingMatches || [];

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(now);
    const daysUntilSunday = 7 - now.getDay();
    endOfWeek.setDate(now.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);

    const filteredMatches = matches.filter((match: any) => {
        const isLive = match.time.toLowerCase().includes("live") || match.time === "";
        if (isLive) return true;
        if (match.date) {
            try {
                const matchDate = new Date(match.date);
                return matchDate >= startOfToday && matchDate <= endOfWeek;
            } catch (e) {
                return true;
            }
        }
        return true;
    });

    return (
        <div className="space-y-4">
            <div className="flex items-end justify-between px-1">
                <h2 className="text-2xl italic tracking-wider">PARTIDOS</h2>
                <Link
                    href="/schedule"
                    className="text-[10px] font-black uppercase text-v-red hover:tracking-widest transition-all mb-1"
                >
                    Agenda Completa
                </Link>
            </div>
            <div className="grid gap-4">
                {filteredMatches.map((match, idx) => {
                    const isLive = match.time.toLowerCase().includes("live") || match.time === "";
                    const [teamA, teamB] = match.teams.split(" vs ");
                    
                    return (
                        <div
                            key={`${match.teams}-${idx}`}
                            className="v-card-animated group active:scale-[0.98]"
                        >
                            <div className="flex items-stretch h-16 sm:h-20 overflow-hidden">
                                {/* Team A */}
                                <div className="flex-1 flex items-center px-3 sm:px-4 relative overflow-hidden transition-colors min-w-0">
                                    <div className="flex items-center gap-3 relative z-10 group-hover:translate-x-1 transition-all duration-300">
                                        <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-white/5 p-1 rounded-sm border border-white/5">
                                            {(() => {
                                                const logo = getTeamLogo(teamA);
                                                return logo ? (
                                                    <img 
                                                        src={logo}
                                                        alt=""
                                                        className="w-full h-full object-contain"
                                                    />
                                                ) : (
                                                    <span className="text-[10px] font-black opacity-20">{getTeamTag(teamA)}</span>
                                                );
                                            })()}
                                        </div>
                                         <span className="text-[11px] sm:text-sm font-black uppercase italic tracking-wider truncate group-hover:text-v-red transition-all duration-300">
                                             {teamA}
                                         </span>
                                     </div>
                                 </div>

                                 {/* Center Info */}
                                 <div className="w-16 sm:w-28 shrink-0 flex flex-col items-center justify-center bg-v-navy/60 border-x border-white/10 relative z-10">
                                     <div className="absolute inset-0 bg-v-red/5 animate-pulse-slow" />
                                     <span className={`text-[9px] sm:text-xs font-black relative z-10 ${isLive ? "text-v-red animate-pulse" : "text-v-white"}`}>
                                         {isLive ? "LIVE" : (() => {
                                             if (match.date) {
                                                 try {
                                                     return new Intl.DateTimeFormat('es-ES', {
                                                         timeZone: 'Europe/Madrid',
                                                         hour: '2-digit',
                                                         minute: '2-digit'
                                                     }).format(new Date(match.date));
                                                 } catch (e) { }
                                             }
                                             return match.time;
                                         })()}
                                     </span>
                                     <div className="h-px w-6 sm:w-8 bg-v-white/10 my-1 relative z-10" />
                                     <span className="text-[6px] sm:text-[8px] font-black uppercase text-v-white/40 relative z-10">
                                         {(() => {
                                             if (match.date) {
                                                 try {
                                                     return new Intl.DateTimeFormat('es-ES', {
                                                         timeZone: 'Europe/Madrid',
                                                         month: 'short',
                                                         day: 'numeric'
                                                     }).format(new Date(match.date));
                                                 } catch (e) { }
                                             }
                                             const d = match.rawDate || "";
                                             return d.includes(",") ? d.split(",")[1].trim() : d;
                                         })()}
                                     </span>
                                 </div>

                                 {/* Team B */}
                                 <div className="flex-1 flex items-center justify-end px-3 sm:px-4 relative overflow-hidden transition-colors min-w-0 text-right">
                                     <div className="flex items-center gap-3 relative z-10 group-hover:-translate-x-1 transition-all duration-300 justify-end">
                                         <span className="text-[11px] sm:text-sm font-black uppercase italic tracking-wider truncate group-hover:text-v-red transition-all duration-300">
                                             {teamB ?? "TBD"}
                                         </span>
                                         <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-white/5 p-1 rounded-sm border border-white/5">
                                            {(() => {
                                                const logo = getTeamLogo(teamB);
                                                return logo ? (
                                                    <img 
                                                        src={logo}
                                                        alt=""
                                                        className="w-full h-full object-contain"
                                                    />
                                                ) : (
                                                    <span className="text-[10px] font-black opacity-20">{getTeamTag(teamB)}</span>
                                                );
                                            })()}
                                         </div>
                                     </div>
                                 </div>
                            </div>
                        </div>
                    );
                })}

                {filteredMatches.length === 0 && (
                    <div className="v-panel border-white/5 py-12 text-center opacity-30">
                        <div className="mb-2 flex justify-center">
                            <div className="w-1 h-1 bg-v-red rounded-full animate-ping" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest italic">
                            No hay transmisiones programadas
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export function DashboardMatchListSkeleton() {
    return (
        <div className="space-y-4">
             <div className="flex items-end justify-between px-1">
                <h2 className="text-2xl italic tracking-wider">PARTIDOS</h2>
                <span className="text-[10px] font-black uppercase text-v-white/20">Cargando...</span>
            </div>
            <div className="grid gap-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-v-white/5 animate-pulse rounded border-l-2 border-v-white/10" />
                ))}
            </div>
        </div>
    )
}
