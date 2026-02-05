import { getSession } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { getPowerUpTypes, getUserInventory } from "@/lib/actions/inventory";
import { getUserLeagues } from "@/lib/actions/leagues";
import { ShopView } from "./ShopView";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const session = await getSession();
  if (!session) return redirect("/login");

  // Get active league context (assuming user has one for now or taking the first)
  const leagues = await getUserLeagues(session.user.id);
  if (!leagues || leagues.length === 0) {
      return (
          <div className="p-4 text-center">
              <p>Debes unirte a una liga para acceder a la tienda.</p>
          </div>
      );
  }
  const activeLeague = leagues[0]; // TODO: League selector context
  
  const powerUps = await getPowerUpTypes();
  const inventory = await getUserInventory(activeLeague.league_id, session.user.id);
  
  // We need current points too
  const supabase = await createClient();
  const { data: participant } = await supabase
    .from("league_participants")
    .select("total_points")
    .eq("league_id", activeLeague.league_id)
    .eq("profile_id", session.user.id)
    .single();

  const participantData = {
    league_id: activeLeague.league_id,
    profile_id: session.user.id,
    total_points: participant?.total_points || 0
  };

  return <ShopView participant={participantData} powerUps={powerUps} inventory={inventory || []} />;
}
