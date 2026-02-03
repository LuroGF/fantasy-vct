import { supabase } from "@/lib/supabase";

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
  const players = await getMarketData();

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl leading-none">Mercado</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">Transferencias VCT EMEA</p>
        </div>
      </div>

      <div className="v-panel p-4 space-y-4">
        <div className="text-[10px] uppercase tracking-widest font-black text-v-white/40">Filtros de Búsqueda</div>
        <div className="grid grid-cols-2 gap-3">
          {["ROL", "EQUIPO", "PRECIO", "FORMA"].map((label) => (
            <button
              key={label}
              className="h-10 border border-white/5 bg-v-navy text-[10px] font-black tracking-widest hover:border-v-red/50 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {players?.map((player) => (
          <div
            key={player.id}
            className="v-panel relative overflow-hidden group hover:border-v-red transition-all cursor-pointer"
          >
            {/* Background design element */}
            <div className="absolute -right-4 -top-8 text-6xl font-black text-white/5 italic select-none">
              {player.pro_teams?.tag}
            </div>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex flex-col">
                <span className="text-2xl font-black italic uppercase tracking-tighter">{player.nickname}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-v-red">
                  {`${player.pro_teams?.tag} // ${player.role}`}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-black uppercase text-v-white/40 mb-1">Valor Contrato</span>
                <span className="text-lg font-black italic">
                  ${(player.market_value / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>

            <button className="v-btn-primary w-full mt-4 py-2 text-xs shadow-lg shadow-v-red/10">
              Asignar Contrato
            </button>
          </div>
        ))}

        {players?.length === 0 && (
          <div className="text-center py-12 v-panel border-v-white/10">
            <p className="text-v-white/40 text-sm italic">No hay jugadores disponibles en el mercado.</p>
            <p className="text-[10px] font-black uppercase text-v-red mt-2">Ejecuta el Scraper para poblar la base de datos</p>
          </div>
        )}
      </div>
    </div>
  );
}
