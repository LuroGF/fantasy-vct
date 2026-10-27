import { redirect } from "next/navigation";
import CommunityView from "./CommunityView";
import { createClient } from "@/utils/supabase/server";

export default async function CommunityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, global_points")
    .order("global_points", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[COMMUNITY] Could not load profiles:", error.message);
  }

  return <CommunityView profiles={data ?? []} loadFailed={Boolean(error)} />;
}
