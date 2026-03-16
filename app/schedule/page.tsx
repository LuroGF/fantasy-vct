import { createClient } from "@/utils/supabase/server";
import { getSession } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const supabase = await createClient();
  const session = await getSession();

  if (!session) redirect("/login");

  // 1. Obtener jornada activa para saber qué mostrar
  const { data: activeGw } = await supabase
    .from("gameweeks")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (!activeGw) {
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
            No hay ninguna jornada activa en este momento.
          </p>
        </div>
      </div>
    );
  }

  // 2. Obtener todos los partidos de esta jornada
  const { data: matches } = await supabase
    .from("matches")
    .select(
      `
      id,
      vlr_id,
      match_date,
      status,
      team_a:pro_teams!matches_team_a_fkey (name, tag),
      team_b:pro_teams!matches_team_b_fkey (name, tag)
    `,
    )
    .eq("gameweek_id", activeGw.id)
    .order("match_date", { ascending: true });

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
            {activeGw.name} // 2026
          </p>
        </div>
        <StatusBadge label="S3-SCHEDULE" variant="white" />
      </div>

      <div className="space-y-4">
        {matches?.map((match: any) => {
          const isLive = match.status === "live";
          const isFinished = match.status === "finished";
          const date = match.match_date ? new Date(match.match_date) : null;

          return (
            <div
              key={match.id}
              className="v-panel p-4 flex items-center justify-between group hover:border-v-red transition-all"
            >
              <div className="flex-1 text-sm font-black uppercase italic tracking-tighter">
                {match.team_a?.tag || match.team_a?.name}
              </div>

              <div className="flex flex-col items-center px-6 border-x border-white/5 min-w-[120px]">
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

              <div className="flex-1 text-sm font-black uppercase italic tracking-tighter text-right">
                {match.team_b?.tag || match.team_b?.name}
              </div>
            </div>
          );
        })}

        {(!matches || matches.length === 0) && (
          <div className="v-panel text-center py-12 opacity-40">
            <p className="text-xs italic">
              No hay partidos programados para esta jornada.
            </p>
          </div>
        )}
      </div>

      <Link
        href="/dashboard"
        className="v-btn-secondary w-full py-3 text-[10px]"
      >
        Volver al Centro de Mando
      </Link>
    </div>
  );
}
