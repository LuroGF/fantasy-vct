import { StatusBadge } from "./StatusBadge";

interface PlayerCardProps {
  player: {
    id: string;
    nickname: string;
    role: string;
    market_value: number;
    pro_teams: {
      tag: string;
      name: string;
    } | null;
    stats?: {
      acs: number;
      kd: number;
      avgPoints: number;
    }
  };
  onAction?: () => void;
  actionLabel?: string;
}

export function PlayerCard({ player, onAction, actionLabel = "Asignar Contrato" }: PlayerCardProps) {
  const stats = player.stats || {
    acs: 0,
    kd: 0,
    avgPoints: 0
  };

  return (
    <div className="v-panel relative overflow-hidden group hover:border-v-red active:scale-[0.98] transition-all cursor-pointer select-none">
      {/* Background design element */}
      <div className="absolute -right-4 -top-8 text-6xl font-black text-white/5 italic select-none group-hover:text-v-red/10 transition-colors">
        {player.pro_teams?.tag}
      </div>

      <div className="flex flex-col gap-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-2xl font-black italic uppercase tracking-tighter group-hover:text-v-red transition-colors">
              {player.nickname}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-v-red">
                {player.pro_teams?.tag}
              </span>
              <span className="text-[8px] text-v-white/20">//</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-v-white/60">
                {player.role}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-[8px] font-black uppercase text-v-white/40 mb-1">Valor Contrato</span>
            <span className="text-lg font-black italic">
              ${(player.market_value / 1000000).toFixed(1)}M
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 group-hover:border-v-red/20 transition-colors">
           <div className="text-center">
             <p className="text-[7px] font-black uppercase text-v-white/30 tracking-tighter">Avg Points</p>
             <p className="text-sm font-black italic text-v-red">{stats.avgPoints > 0 ? stats.avgPoints : '--'}</p>
           </div>
           <div className="text-center border-x border-white/5">
             <p className="text-[7px] font-black uppercase text-v-white/30 tracking-tighter">ACS Per Game</p>
             <p className="text-sm font-black italic">{stats.acs > 0 ? stats.acs : '--'}</p>
           </div>
           <div className="text-center">
             <p className="text-[7px] font-black uppercase text-v-white/30 tracking-tighter">KD Ratio</p>
             <p className="text-sm font-black italic">{stats.kd > 0 ? stats.kd : '--'}</p>
           </div>
        </div>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            onAction?.();
          }}
          className="v-btn-primary w-full py-3 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-v-red/5 group-hover:shadow-v-red/20 active:scale-95 transition-all opacity-80 group-hover:opacity-100"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
