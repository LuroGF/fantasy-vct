import { supabase } from "@/lib/supabase";
import MarketView from "./MarketView";
import { getUserLeagues } from "@/lib/actions/leagues";
import { getSession } from "@/lib/actions/auth";
import { redirect } from "next/navigation";

interface Player {
  id: string;
  nickname: string;
  role: string;
  market_value: number;
  pro_teams: {
    tag: string;
    name: string;
  } | null;
}

async function getMarketData(): Promise<Player[]> {
  const { data: players, error } = await supabase
    .from('pro_players')
    .select('*, pro_teams(tag, name)')
    .order('market_value', { ascending: false });

  if (error) {
    console.error("Error fetching market data:", error);
    return [];
  }
  return (players as unknown as Player[]) || [];
}

export default async function MarketPage() {
  const session = await getSession();
  if (!session) return redirect("/login");

  const [players, leagues] = await Promise.all([
    getMarketData(),
    getUserLeagues(session.user.id)
  ]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl leading-none italic uppercase">Mercado</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">Transferencias VCT EMEA</p>
        </div>
      </div>

      <MarketView 
        initialPlayers={players} 
        initialLeagues={leagues as any[]} 
        profileId={session.user.id}
      />
    </div>
  );
}
