import Link from "next/link";

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
  actionLabel = "Asignar",
  actionDisabled = false,
  actionClassName = "v-btn-primary",
  onSecondAction,
  secondActionLabel,
  secondActionClassName = "v-btn-secondary",
  isLocked,
  isCaptain,
  inAuction
}: PlayerCardProps) {

  const stats = player.stats || { acs: 0, kd: 0, avgPoints: 0 };

  const roleColors = {
    'Duelista': 'border-role-duelista',
    'Iniciador': 'border-role-iniciador',
    'Controlador': 'border-role-controlador',
    'Centinela': 'border-role-centinela',
  };

  const currentRoleColor = (roleColors as any)[player.role] || 'border-white/20';

  return (
    <div className={`v-panel border-l-4 ${currentRoleColor} group hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all overflow-hidden`}>
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
         <span className="text-6xl font-black italic uppercase leading-none select-none pointer-events-none">
           {player.pro_teams?.tag || "FA"}
         </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 relative z-10">
        {/* Main Info Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <Link 
                href={`/players/${player.id}`} 
                className="inline-block hover:text-v-red transition-colors focus:outline-none max-w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl sm:text-2xl tracking-tighter flex items-center gap-2 truncate">
                  <span className="truncate">{player.nickname}</span>
                  <div className="flex gap-1 shrink-0">
                    {isLocked && <span title="Protegido" className="text-v-red animate-pulse text-xs">🛡️</span>}
                    {isCaptain && <span title="Capitán" className="text-role-iniciador text-xs">©️</span>}
                    {inAuction && <span className="text-[7px] bg-v-red text-white px-1.5 py-0.5 rounded-sm tracking-widest font-black self-center uppercase shrink-0">DRAFT</span>}
                  </div>
                </h3>
              </Link>
              <div className="flex items-center gap-2 mt-0.5 overflow-hidden">
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-v-red truncate">
                  {player.pro_teams?.tag || "Free Agent"}
                </span>
                <span className="text-white/10 text-[10px]">|</span>
                <span className={`text-[9px] font-black uppercase tracking-[0.15em] text-role-${player.role} truncate`}>
                  {player.role}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-[7px] font-black uppercase text-white/30 tracking-widest mb-0.5">Asignación</p>
              <p className="text-lg font-black italic leading-none whitespace-nowrap">{(player.market_value / 1000000).toFixed(1)}M <span className="text-[9px]">VP</span></p>
              {player.releaseClause && (
                 <p className="text-[8px] font-bold italic text-v-red mt-1 whitespace-nowrap">Reasig: {(player.releaseClause / 1000000).toFixed(1)}M</p>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-1 bg-white/5 rounded-sm p-2 mb-3">
             <div className="text-center">
                <span className="block text-[6px] uppercase text-white/40 font-black tracking-tighter">Points</span>
                <span className="text-xs font-black italic text-v-red">{stats.avgPoints ?? 0}</span>
             </div>
             <div className="text-center border-x border-white/5">
                <span className="block text-[6px] uppercase text-white/40 font-black tracking-tighter">ACS</span>
                <span className="text-xs font-black italic">{stats.acs ?? 0}</span>
             </div>
             <div className="text-center">
                <span className="block text-[6px] uppercase text-white/40 font-black tracking-tighter">K/D</span>
                <span className="text-xs font-black italic">{stats.kd ?? 0}</span>
             </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex sm:flex-col gap-2 w-full sm:w-28 justify-end shrink-0">
          {onAction && (
            <button 
              onClick={(e) => { e.stopPropagation(); onAction(); }}
              disabled={actionDisabled}
              className={`${actionClassName} flex-1 sm:flex-none !px-3 !py-2 !text-[10px] disabled:opacity-30 disabled:grayscale`}
            >
              {actionLabel}
            </button>
          )}
          {onSecondAction && (
            <button 
              onClick={(e) => { e.stopPropagation(); onSecondAction(); }}
              className={`${secondActionClassName} flex-1 sm:flex-none !px-3 !py-2 !text-[10px] hover:border-v-red hover:text-v-red`}
            >
              {secondActionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
