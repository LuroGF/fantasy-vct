import { getSession } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import { getPowerUpTypes, getUserInventory } from "@/lib/actions/inventory";
import { getUserLeagues } from "@/lib/actions/leagues";
import { ShopView } from "./ShopView";
import ClientRefreshWrapper from "@/components/ClientRefreshWrapper";
import { V1_FEATURES } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  if (!V1_FEATURES.shop) redirect("/more");

  const session = await getSession();
  if (!session) return redirect("/login");

  // Get active league context
  const leagues = await getUserLeagues(session.user.id);
  if (!leagues || leagues.length === 0) {
      return (

      <div className="flex flex-col items-center justify-center py-20 opacity-50 italic">
        <p>Debes unirte a una liga para acceder al mercado.</p>
      </div>
      );
  }
  const activeLeague = leagues[0];
  
  const powerUps = await getPowerUpTypes();
  const inventory = await getUserInventory(activeLeague.league_id, session.user.id);
  
  return (
    <ClientRefreshWrapper>
      <div className="mx-auto w-full max-w-md sm:max-w-xl lg:max-w-4xl px-4 sm:px-6 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 py-6">
        <ShopView 
          initialLeagues={leagues} 
          userId={session.user.id}
          powerUps={powerUps} 
          initialInventory={inventory || []} 
        />
      </div>
    </ClientRefreshWrapper>
  );
}
