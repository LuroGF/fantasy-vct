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
  };
  onAction?: () => void;
  actionLabel?: string;
}

export function PlayerCard({ player, onAction, actionLabel = "Asignar Contrato" }: PlayerCardProps) {
  return (
    <div className="v-panel relative overflow-hidden group hover:border-v-red active:scale-[0.98] transition-all cursor-pointer select-none">
      {/* Background design element */}
      <div className="absolute -right-4 -top-8 text-6xl font-black text-white/5 italic select-none">
        {player.pro_teams?.tag}
      </div>

      <div className="flex items-center justify-between relative z-10">
        <div className="flex flex-col">
          <span className="text-2xl font-black italic uppercase tracking-tighter group-hover:text-v-red transition-colors">
            {player.nickname}
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-v-red">
            {player.pro_teams?.tag} // {player.role}
          </span>
        </div>
        <div className="text-right">
          <span className="block text-[8px] font-black uppercase text-v-white/40 mb-1">Valor Contrato</span>
          <span className="text-lg font-black italic">
            ${(player.market_value / 1000000).toFixed(1)}M
          </span>
        </div>
      </div>

      <button 
        onClick={(e) => {
          e.stopPropagation();
          onAction?.();
        }}
        className="v-btn-primary w-full mt-4 py-3 text-xs shadow-lg shadow-v-red/10 group-hover:shadow-v-red/20 active:scale-95 transition-transform"
      >
        {actionLabel}
      </button>
    </div>
  );
}
