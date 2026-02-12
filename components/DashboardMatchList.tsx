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
                <h2 className="text-2xl italic tracking-tighter">PARTIDOS</h2>
                <Link
                    href="/schedule"
                    className="text-[10px] font-black uppercase text-v-red hover:tracking-widest transition-all mb-1"
                >
                    Agenda Completa
                </Link>
            </div>
            <div className="grid gap-3">
                {filteredMatches.map((match) => {
                    const isLive = match.time.toLowerCase().includes("live") || match.time === "";
                    return (
                        <div
                            key={match.teams}
                            className="bg-v-gray/40 border-l-2 border-v-white/10 p-3 flex items-center justify-between group hover:border-v-red hover:bg-v-gray/60 transition-all"
                        >
                            <div className="flex-1 text-sm font-black uppercase italic tracking-tighter group-hover:text-v-red transition-colors truncate min-w-0">
                                {match.teams.split(" vs ")[0]}
                            </div>
                            <div className="flex flex-col items-center px-4 border-x border-white/5 shrink-0 min-w-[100px]">
                                <span className={`text-xs font-black ${isLive ? "text-v-red animate-pulse" : "text-v-white"}`}>
                                    {isLive ? "EN VIVO" : (() => {
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
                                <span className="text-[8px] font-black uppercase text-v-white/40 mb-0.5">
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
                            <div className="flex-1 text-sm font-black uppercase italic tracking-tighter text-right truncate min-w-0">
                                {match.teams.split(" vs ")[1] ?? "TBD"}
                            </div>
                        </div>
                    );
                })}

                {filteredMatches.length === 0 && (
                    <div className="v-panel border-white/5 py-8 text-center">
                        <p className="text-v-white/20 text-[10px] font-black uppercase tracking-widest">
                            No hay partidos programados para hoy
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
                <h2 className="text-2xl italic tracking-tighter">PARTIDOS</h2>
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
