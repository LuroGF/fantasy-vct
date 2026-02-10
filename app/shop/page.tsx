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

  // Get active league context
  const leagues = await getUserLeagues(session.user.id);
  if (!leagues || leagues.length === 0) {
      return (
          <div className="p-4 text-center">
              <p>Debes unirte a una liga para acceder a la tienda.</p>
          </div>
      );
  }
  const activeLeague = leagues[0];
  
  const powerUps = await getPowerUpTypes();
  const inventory = await getUserInventory(activeLeague.league_id, session.user.id);
  
  return <ShopView 
    initialLeagues={leagues} 
    userId={session.user.id}
    powerUps={powerUps} 
    initialInventory={inventory || []} 
  />;

}
