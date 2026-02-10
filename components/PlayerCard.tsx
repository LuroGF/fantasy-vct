import Link from "next/link";
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
    };
    releaseClause?: number;
  };
  onAction?: () => void;
  actionLabel?: string;
  actionDisabled?: boolean;
  actionClassName?: string;
  onSecondAction?: () => void;
  secondActionLabel?: string;
  secondActionClassName?: string;
  isLocked?: boolean;
  isCaptain?: boolean;
  inAuction?: boolean;
}

export function PlayerCard({ 
  player, 
  onAction, 
  actionLabel = "Asignar Contrato",
  actionDisabled = false,
  actionClassName = "v-btn-primary",
  onSecondAction,
  secondActionLabel,
  secondActionClassName = "bg-v-red text-white",
  isLocked,
  isCaptain,
  inAuction
}: PlayerCardProps) {

  const stats = player.stats || {
    acs: 0,
    kd: 0,
    avgPoints: 0
  };

  const roleColor = 
    player.role === 'Duelista' ? 'border-cyan-400' :
    player.role === 'Iniciador' ? 'border-yellow-400' :
    player.role === 'Controlador' ? 'border-purple-400' :
    player.role === 'Centinela' ? 'border-green-400' :
    'border-pink-500'; // Flex

  return (
    <div className="v-panel relative overflow-hidden group hover:border-v-red active:scale-[0.98] transition-all cursor-pointer select-none">
      {/* Background design element */}
      <div className="absolute -right-4 -top-8 text-6xl font-black text-white/5 italic select-none group-hover:text-v-red/10 transition-colors">
        {player.pro_teams?.tag}
      </div>

      <div className="flex h-full">
         {/* Sidebar Color */}
         <div className={`w-1 h-full ${roleColor.replace('border-', 'bg-')} mr-3 opacity-50 group-hover:opacity-100 transition-opacity`} />

         <div className="flex flex-col gap-4 relative z-10 flex-1 py-3 pr-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Link href={`/players/${player.id}`} className="block hover:underline decoration-v-red underline-offset-4 decoration-2 focus:outline-none" onClick={(e) => e.stopPropagation()}>
                <span className="text-2xl font-black italic uppercase tracking-tighter group-hover:text-v-red transition-colors flex items-center gap-2">
                  {player.nickname}
                  {isLocked && <span title="Protegido con Candado" className="text-v-red animate-pulse">🛡️</span>}
                  {isCaptain && <span title="Capitán (X2 Puntos)" className="text-yellow-500">©️</span>}
                  {inAuction && <span className="text-[8px] bg-v-red text-v-white px-1 py-0.5 rounded ml-1 animate-bounce">SUBASTA</span>}
                </span>
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-v-red">
                  {player.pro_teams?.tag || "FA"}
                </span>
                <span className="text-[8px] text-v-white/20">//</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-v-white/60">
                  {player.role}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="block text-[8px] font-black uppercase text-v-white/40 mb-1">Valor Contrato</span>
              <span className="text-lg font-black italic block leading-none mb-1">
                ${(player.market_value / 1000000).toFixed(1)}M
              </span>
              {player.releaseClause && (
                <div className="flex items-center justify-end gap-1 text-v-red/80">
                   <span className="text-[7px] font-black uppercase tracking-widest">Cláusula:</span>
                   <span className="text-xs font-black italic">${(player.releaseClause / 1000000).toFixed(1)}M</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/5 group-hover:border-v-red/20 transition-colors">
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

          <div className="flex gap-2">
            {onAction && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onAction();
                }}
                disabled={actionDisabled}
                className={`${actionClassName} flex-1 py-3 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-v-red/5 group-hover:shadow-v-red/20 active:scale-95 transition-all opacity-80 group-hover:opacity-100 disabled:opacity-30 disabled:pointer-events-none`}
              >
                {actionLabel}
              </button>
            )}

            
            {onSecondAction && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onSecondAction();
                }}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border border-white/10 hover:border-v-red active:scale-95 transition-all ${secondActionClassName}`}
              >
                {secondActionLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
