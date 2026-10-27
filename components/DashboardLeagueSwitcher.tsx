"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

type LeagueOption = {
  id: string;
  name: string;
};

export function DashboardLeagueSwitcher({
  leagues,
  activeLeagueId,
}: {
  leagues: LeagueOption[];
  activeLeagueId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    for (const league of leagues) {
      router.prefetch(`/dashboard?league=${league.id}`);
    }
  }, [leagues, router]);

  return (
    <div className="space-y-2">
      <nav
        className={`flex gap-2 overflow-x-auto pb-1 transition-opacity ${pending ? "opacity-55" : "opacity-100"}`}
        aria-label="Seleccionar liga"
        aria-busy={pending}
      >
        {leagues.map((league) => {
          const active = league.id === activeLeagueId;
          return (
            <button
              key={league.id}
              type="button"
              disabled={pending || active}
              onClick={() =>
                startTransition(() => {
                  router.push(`/dashboard?league=${league.id}`);
                })
              }
              className={`shrink-0 border px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-colors disabled:cursor-default ${
                active
                  ? "border-v-red bg-v-red/10 text-v-white"
                  : "border-white/10 text-v-white/40 hover:border-v-red/40 hover:text-v-white"
              }`}
            >
              {league.name}
            </button>
          );
        })}
      </nav>
      {pending && (
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-v-red" role="status">
          Cambiando de liga…
        </p>
      )}
    </div>
  );
}
