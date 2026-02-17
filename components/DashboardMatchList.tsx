import { fetchVlrMatches } from "@/lib/vlr";
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
                                    <div className="absolute -left-1 -bottom-3 text-3xl sm:text-4xl font-black text-white/5 italic select-none group-hover:text-v-red/10 transition-colors uppercase leading-none pointer-events-none">
                                        {teamA.substring(0, 3)}
                                    </div>
                                    <span className="text-[11px] sm:text-sm font-black uppercase italic tracking-wider truncate relative z-10 group-hover:text-v-red transition-all duration-300 group-hover:translate-x-1">
                                        {teamA}
                                    </span>
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
                                     <div className="absolute -right-1 -bottom-3 text-3xl sm:text-4xl font-black text-white/5 italic select-none group-hover:text-v-red/10 transition-colors uppercase leading-none pointer-events-none">
                                        {(teamB ?? "TBD").substring(0, 3)}
                                    </div>
                                    <span className="text-[11px] sm:text-sm font-black uppercase italic tracking-wider truncate relative z-10 group-hover:text-v-red transition-all duration-300 group-hover:-translate-x-1">
                                        {teamB ?? "TBD"}
                                    </span>
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
