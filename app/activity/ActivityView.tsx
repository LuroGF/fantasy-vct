"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Activity, ChevronDown } from "lucide-react";

import { ActivityFeed } from "@/components/ActivityFeed";
import { useLocale } from "@/components/LocaleProvider";
import type { ActivityLeague, LeagueActivityEvent } from "@/lib/actions/activity";

export function ActivityView({
  leagues,
  activeLeagueId,
  events,
}: {
  leagues: ActivityLeague[];
  activeLeagueId: string | null;
  events: LeagueActivityEvent[];
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeLeague(leagueId: string) {
    startTransition(() => router.replace(`/activity?league=${leagueId}`));
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-7 px-4 py-6 pb-28 sm:max-w-xl sm:px-6 lg:max-w-4xl lg:pb-12">
      <header className="flex items-end justify-between gap-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-v-red">
            <Activity className="h-4 w-4" />
            <span className="text-[9px] font-black uppercase tracking-[0.25em]">VCT Fantasy 2027</span>
          </div>
          <h1 className="text-4xl leading-none sm:text-5xl">{t("activity.title")}</h1>
          <p className="mt-2 text-xs text-v-white/40 sm:text-sm">{t("activity.subtitle")}</p>
        </div>
        {activeLeagueId ? (
          <span className="hidden text-[9px] font-black uppercase tracking-[0.15em] text-v-white/25 sm:block">
            {t("activity.eventsCount", { count: events.length })}
          </span>
        ) : null}
      </header>

      {leagues.length === 0 ? (
        <section className="v-panel space-y-5 py-12 text-center">
          <p className="text-sm text-v-white/50">{t("activity.noLeagues")}</p>
          <Link href="/leagues" className="v-btn-primary inline-flex text-xs">
            {t("activity.goLeagues")}
          </Link>
        </section>
      ) : (
        <>
          <label className="v-panel relative block p-4">
            <span className="mb-2 block text-[8px] font-black uppercase tracking-[0.18em] text-v-white/30">
              {t("activity.selectLeague")}
            </span>
            <select
              value={activeLeagueId ?? ""}
              disabled={isPending}
              onChange={(event) => changeLeague(event.target.value)}
              className="w-full appearance-none bg-transparent pr-8 text-lg font-black italic uppercase text-v-white outline-none disabled:opacity-50"
            >
              {leagues.map((league) => (
                <option key={league.id} value={league.id} className="bg-v-gray text-v-white">
                  {league.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute bottom-5 right-4 h-4 w-4 text-v-red" />
          </label>

          <div className={isPending ? "pointer-events-none opacity-40" : ""} aria-busy={isPending}>
            <ActivityFeed events={events} />
          </div>
        </>
      )}
    </div>
  );
}
