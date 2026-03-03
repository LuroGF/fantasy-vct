
import { createClient } from "@/utils/supabase/server";
import { UserPlus, UserMinus, Zap, Cpu } from "lucide-react";

export async function RecentActivity({ profileId }: { profileId: string }) {
  const supabase = await createClient();

  // 1. Get user's leagues
  const { data: userLeagues } = await supabase
    .from('league_participants')
    .select('league_id')
    .eq('profile_id', profileId);
  
  const leagueIds = userLeagues?.map(l => l.league_id) || [];

  if (leagueIds.length === 0) return null;

  // 2. Fetch latest transactions in those leagues
  const { data: actions, error } = await supabase
    .from('market_transactions')
    .select('*, pro_players(nickname), leagues(name), profiles(username)')
    .in('league_id', leagueIds)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error || !actions || actions.length === 0) {
    return (
      <div className="v-panel border-dashed border-white/5 py-8 text-center opacity-30">
        <p className="text-[10px] font-black uppercase tracking-widest italic">Sin actividad reciente en tus ligas</p>
      </div>
    );
  }

  const getActionDetails = (type: string) => {
    switch (type) {
      case 'buy': return { icon: UserPlus, color: 'text-green-400', label: 'Reclutamiento' };
      case 'sell': return { icon: UserMinus, color: 'text-v-red', label: 'Baja' };
      case 'clause_paid': return { icon: Zap, color: 'text-v-role-iniciador', label: 'Reasignación' };
      case 'buy_item': return { icon: Cpu, color: 'text-v-role-controlador', label: 'Suministro' };
      case 'trade': return { icon: UserPlus, color: 'text-blue-400', label: 'Intercambio' };
      case 'auction_sold': return { icon: Zap, color: 'text-amber-400', label: 'Subasta' };
      default: return { icon: UserPlus, color: 'text-v-white/50', label: 'Operación' };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between px-1">
        <h2 className="text-2xl italic tracking-tighter uppercase">Actividad de Ligas</h2>
        <span className="text-[8px] font-black uppercase text-v-white/30 tracking-widest mb-1">Últimos Movimientos</span>
      </div>

      <div className="grid gap-2">
        {actions.map((action) => {
          const details = getActionDetails(action.type);
          const Icon = details.icon;
          return (
            <div key={action.id} className="v-panel p-3 flex items-center gap-4 group hover:bg-white/5 transition-all">
              <div className={`p-2 rounded-sm bg-white/5 ${details.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] font-black uppercase tracking-tighter text-v-white truncate">
                    {action.profiles?.username || "Sistema"}
                  </span>
                  <div className="w-1 h-1 bg-white/20 rounded-full" />
                  <span className={`text-[8px] font-black uppercase ${details.color}`}>
                    {details.label}
                  </span>
                </div>
                <h4 className="text-xs font-black italic uppercase text-v-white tracking-tight truncate">
                   {action.pro_players?.nickname || "Item"} en <span className="text-v-red/80">{action.leagues?.name}</span>
                </h4>
              </div>

              <div className="text-right">
                <p className="text-[10px] lg:text-sm font-black text-v-white italic leading-none">
                  {(action.price / 1000000).toFixed(1)}M <span className="text-[8px] lg:text-[10px] text-v-red/50">VP</span>
                </p>
                <p className="text-[7px] lg:text-[9px] text-v-white/20 font-black uppercase mt-1">
                  {new Date(action.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
