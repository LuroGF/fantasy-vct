
import Link from "next/link";

import { ActivityFeed } from "@/components/ActivityFeed";
import { getMyLeagueActivity } from "@/lib/actions/activity";
import { getServerTranslator } from "@/lib/i18n/server";

export async function RecentActivity({ leagueId }: { leagueId?: string | null }) {
  const { t } = await getServerTranslator();
  const { events, activeLeagueId } = await getMyLeagueActivity(leagueId, 5);

  if (!activeLeagueId) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between px-1">
        <h2 className="text-2xl italic tracking-tighter uppercase">{t("dashboard.leagueActivity")}</h2>
        <Link
          href={`/activity?league=${activeLeagueId}`}
          className="mb-1 text-[8px] font-black uppercase tracking-widest text-v-red hover:text-white"
        >
          {t("dashboard.viewAllActivity")}
        </Link>
      </div>
      <ActivityFeed events={events} compact />
    </div>
  );
}
