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
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <Link 
                href={`/players/${player.id}`} 
                className="inline-block hover:text-v-red transition-colors focus:outline-none"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-2xl sm:text-3xl tracking-tighter flex items-center gap-2">
                  {player.nickname}
                  <div className="flex gap-1 shrink-0">
                    {isLocked && <span title="Protegido" className="text-v-red animate-pulse text-sm">🛡️</span>}
                    {isCaptain && <span title="Capitán" className="text-role-iniciador text-sm">©️</span>}
                    {inAuction && <span className="text-[7px] bg-v-red text-white px-1.5 py-0.5 rounded-sm tracking-widest font-black self-center uppercase">DRAFT</span>}
                  </div>
                </h3>
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-v-red">
                  {player.pro_teams?.tag || "Free Agent"}
                </span>
                <span className="text-white/10 text-xs">|</span>
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] text-role-${player.role}`}>
                  {player.role}
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[8px] font-black uppercase text-white/30 tracking-widest mb-1">Asignación</p>
              <p className="text-xl font-black italic leading-none">{(player.market_value / 1000000).toFixed(1)} <span className="text-[10px]">VP</span></p>
              {player.releaseClause && (
                 <p className="text-[9px] font-bold italic text-v-red mt-1">Reasignación: {(player.releaseClause / 1000000).toFixed(1)} VP</p>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-1 bg-black/20 rounded-sm p-2 mb-4">
             <div className="text-center">
                <span className="block text-[7px] uppercase text-white/40 font-black">Points</span>
                <span className="text-sm font-black italic text-v-red">{stats.avgPoints || "--"}</span>
             </div>
             <div className="text-center border-x border-white/5">
                <span className="block text-[7px] uppercase text-white/40 font-black">ACS</span>
                <span className="text-sm font-black italic">{stats.acs || "--"}</span>
             </div>
             <div className="text-center">
                <span className="block text-[7px] uppercase text-white/40 font-black">K/D</span>
                <span className="text-sm font-black italic">{stats.kd || "--"}</span>
             </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex sm:flex-col gap-2 w-full sm:w-32 justify-end">
          {onAction && (
            <button 
              onClick={(e) => { e.stopPropagation(); onAction(); }}
              disabled={actionDisabled}
              className={`${actionClassName} flex-1 sm:flex-none !px-4 !py-2 !text-[9px] disabled:opacity-30 disabled:grayscale`}
            >
              {actionLabel}
            </button>
          )}
          {onSecondAction && (
            <button 
              onClick={(e) => { e.stopPropagation(); onSecondAction(); }}
              className={`${secondActionClassName} flex-1 sm:flex-none !px-4 !py-2 !text-[9px] hover:border-v-red hover:text-v-red`}
            >
              {secondActionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
