import { redirect } from "next/navigation";

import { ActivityView } from "./ActivityView";
import { getMyLeagueActivity } from "@/lib/actions/activity";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const activity = await getMyLeagueActivity(params.league, 100);

  return <ActivityView {...activity} />;
}
