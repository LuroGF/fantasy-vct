import { getVlrMatches } from "@/lib/vlr";
import { getTeamTag, getTeamLogo } from "@/lib/vlr-shared";
import Link from "next/link";

export async function DashboardMatchList() {
    // Obtenemos los partidos desde el nuevo adaptador VLR
    const matches = await getVlrMatches();

    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(now);
    const daysUntilSunday = 7 - now.getDay();

    endOfWeek.setDate(now.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);

    /*
     * En dashboard mostramos:
     * - partidos LIVE
     * - próximos partidos hasta final de semana
     *
     * No mostramos partidos terminados.
     */
    const filteredMatches = matches
        .filter((match) => {
            if (match.status === "live") {
                return true;
            }

            if (match.status !== "upcoming") {
                return false;
            }

            try {
                const matchDate = new Date(match.matchDate);

                return (
                    matchDate >= startOfToday &&
                    matchDate <= endOfWeek
                );
            } catch {
                return false;
            }
        })
        .sort((a, b) => {
            // LIVE siempre arriba
            if (
                a.status === "live" &&
                b.status !== "live"
            ) {
                return -1;
            }

            if (
                a.status !== "live" &&
                b.status === "live"
            ) {
                return 1;
            }

            return (
                new Date(a.matchDate).getTime() -
                new Date(b.matchDate).getTime()
            );
        });

    return (
        <div className="space-y-4">
            <div className="flex items-end justify-between px-1">
                <h2 className="text-2xl italic tracking-wider">
                    PARTIDOS
                </h2>

                <Link
                    href="/schedule"
                    className="text-[10px] font-black uppercase text-v-red hover:tracking-widest transition-all mb-1"
                >
                    Ver Agenda
                </Link>
            </div>

            <div className="grid gap-4">
                {filteredMatches.map((match) => {
                    const isLive =
                        match.status === "live";

                    const teamA =
                        match.teamA.name || "TBD";

                    const teamB =
                        match.teamB.name || "TBD";

                    const matchDate =
                        new Date(match.matchDate);

                    return (
                        <div
                            key={match.vlrId}
                            className="v-card-animated group active:scale-[0.98]"
                        >
                            <div className="flex items-stretch h-16 sm:h-20 overflow-hidden">

                                {/* Team A */}
                                <div className="flex-1 flex items-center px-3 sm:px-4 relative overflow-hidden transition-colors min-w-0">
                                    <div className="flex items-center gap-3 relative z-10 group-hover:translate-x-1 transition-all duration-300">

                                        <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-white/5 p-1 rounded-sm border border-white/5">
                                            {(() => {
                                                const logo =
                                                    getTeamLogo(teamA);

                                                return logo ? (
                                                    <img
                                                        src={logo}
                                                        alt={teamA}
                                                        className="w-full h-full object-contain"
                                                    />
                                                ) : (
                                                    <span className="text-[10px] font-black opacity-20">
                                                        {getTeamTag(teamA)}
                                                    </span>
                                                );
                                            })()}
                                        </div>

                                        <span className="text-[11px] sm:text-sm font-black uppercase italic tracking-wider truncate group-hover:text-v-red transition-all duration-300">
                                            {teamA}
                                        </span>
                                    </div>

                                    {isLive && (
                                        <span className="ml-auto text-xl font-black italic text-v-red mr-2">
                                            {match.teamAScore ?? 0}
                                        </span>
                                    )}
                                </div>

                                {/* Center Info */}
                                <div className="w-16 sm:w-28 shrink-0 flex flex-col items-center justify-center bg-v-navy/60 border-x border-white/10 relative z-10">

                                    <div className="absolute inset-0 bg-v-red/5 animate-pulse-slow" />

                                    <span
                                        className={`text-[9px] sm:text-xs font-black relative z-10 ${
                                            isLive
                                                ? "text-v-red animate-pulse"
                                                : "text-v-white"
                                        }`}
                                    >
                                        {isLive
                                            ? "LIVE"
                                            : new Intl.DateTimeFormat(
                                                  "es-ES",
                                                  {
                                                      timeZone:
                                                          "Europe/Madrid",
                                                      hour: "2-digit",
                                                      minute: "2-digit",
                                                  }
                                              ).format(
                                                  matchDate
                                              )}
                                    </span>

                                    <div className="h-px w-6 sm:w-8 bg-v-white/10 my-1 relative z-10" />

                                    <span className="text-[6px] sm:text-[8px] font-black uppercase text-v-white/40 relative z-10">
                                        {new Intl.DateTimeFormat(
                                            "es-ES",
                                            {
                                                timeZone:
                                                    "Europe/Madrid",
                                                month: "short",
                                                day: "numeric",
                                            }
                                        ).format(matchDate)}
                                    </span>
                                </div>

                                {/* Team B */}
                                <div className="flex-1 flex items-center justify-end px-3 sm:px-4 relative overflow-hidden transition-colors min-w-0 text-right">

                                    {isLive && (
                                        <span className="mr-auto text-xl font-black italic text-v-red ml-2">
                                            {match.teamBScore ?? 0}
                                        </span>
                                    )}

                                    <div className="flex items-center gap-3 relative z-10 group-hover:-translate-x-1 transition-all duration-300 justify-end">

                                        <span className="text-[11px] sm:text-sm font-black uppercase italic tracking-wider truncate group-hover:text-v-red transition-all duration-300">
                                            {teamB}
                                        </span>

                                        <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-white/5 p-1 rounded-sm border border-white/5">
                                            {(() => {
                                                const logo =
                                                    getTeamLogo(teamB);

                                                return logo ? (
                                                    <img
                                                        src={logo}
                                                        alt={teamB}
                                                        className="w-full h-full object-contain"
                                                    />
                                                ) : (
                                                    <span className="text-[10px] font-black opacity-20">
                                                        {getTeamTag(teamB)}
                                                    </span>
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
                <h2 className="text-2xl italic tracking-wider">
                    PARTIDOS
                </h2>

                <span className="text-[10px] font-black uppercase text-v-white/20">
                    Cargando...
                </span>
            </div>

            <div className="grid gap-3">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="h-16 bg-v-white/5 animate-pulse rounded border-l-2 border-v-white/10"
                    />
                ))}
            </div>
        </div>
    );
}