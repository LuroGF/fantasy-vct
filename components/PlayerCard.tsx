import Link from "next/link";
import { getTeamLogo, getTeamTag } from "@/lib/vlr-shared";
import { useRouter } from "next/navigation";

interface PlayerCardProps {
  player: {
    id: string;
    nickname: string;
    role: string;
    market_value: number;
    photo_url?: string | null;
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
  actionSubLabel?: string;
  actionDisabled?: boolean;
  actionClassName?: string;
  onSecondAction?: () => void;
  secondActionLabel?: string;
  secondActionClassName?: string;
  isLocked?: boolean;
  isCaptain?: boolean;
  inAuction?: boolean;
  isBoosted?: boolean;
}

export function PlayerCard({ 
  player, 
  onAction, 
  actionLabel = "Asignar",
  actionSubLabel,
  actionDisabled = false,
  actionClassName = "v-btn-primary",
  onSecondAction,
  secondActionLabel,
  secondActionClassName = "v-btn-secondary",
  isLocked,
  isCaptain,
  inAuction,
  isBoosted
}: PlayerCardProps) {

  const stats = player.stats || { acs: 0, kd: 0, avgPoints: 0 };
  const router = useRouter();

  const roleColors = {
    'Duelista': 'border-role-duelista',
    'Iniciador': 'border-role-iniciador',
    'Controlador': 'border-role-controlador',
    'Centinela': 'border-role-centinela',
    'Flex': 'border-white/40',
  };

  const currentRoleColor = (roleColors as any)[player.role] || 'border-white/20';

  return (
    <div onClick={() => router.push(`/players/${player.id}`)} className={`v-panel relative border-l-4 ${currentRoleColor} group hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all overflow-hidden`}>
      {/* Background Decor */}
      <div className="absolute top-0 right-0 group-hover:opacity-10 transition-opacity" style={{ opacity: 0.015 }}>
         {(() => {
           const logo = player.pro_teams?.tag ? getTeamLogo(player.pro_teams.tag) : null;
           return logo ? (
             <img 
               src={logo}
               alt=""
               className="w-48 h-48 object-contain grayscale brightness-200"
             />
           ) : (
             <span className="text-6xl font-black italic uppercase leading-none select-none pointer-events-none">
               {player.pro_teams?.tag || "FA"}
             </span>
           );
         })()}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 relative z-10">
        {/* Main Info Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <div 
                className="inline-block hover:text-v-red transition-colors focus:outline-none max-w-full"
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 bg-v-navy border border-white/10 overflow-hidden flex items-center justify-center">
                      {player.photo_url ? (
                        <img src={player.photo_url} alt={player.nickname} className="w-full h-full object-cover" />
                      ) : (
                        /* Fallback to local image or initials */
                        <img 
                           src={`/players/${player.nickname.toLowerCase()}.png`} 
                           alt={player.nickname} 
                           className="w-full h-full object-cover"
                           onError={(e) => {
                             e.currentTarget.style.display = 'none';
                             const parent = e.currentTarget.parentElement;
                             if (parent) {
                               const span = document.createElement('span');
                               span.className = "text-xl font-black italic opacity-20";
                               span.innerText = player.nickname.substring(0, 2).toUpperCase();
                               parent.appendChild(span);
                             }
                           }}
                        />
                      )}
                    </div>
                    {/* Team Patch overlay */}
                    {(() => {
                        const logo = player.pro_teams?.tag ? getTeamLogo(player.pro_teams.tag) : null;
                        return logo ? (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-v-navy border border-white/20 p-0.5 rounded-sm">
                                <img src={logo} alt="" className="w-full h-full object-contain" />
                            </div>
                        ) : null;
                    })()}
                  </div>
                  <h3 className="text-xl sm:text-2xl tracking-wider flex items-center gap-2">
                    <span className="truncate pr-4">{player.nickname}</span>
                    <div className="flex gap-1 shrink-0">
                      {isLocked && <span title="Protegido" className="text-v-red animate-pulse text-xs">🛡️</span>}
                      {isCaptain && <span title="Capitán" className="text-role-iniciador text-xs">©️</span>}
                      {isBoosted && <span title="Analista Activo" className="text-amber-500 text-[8px] border border-amber-500/30 px-1 font-black animate-pulse">BOOST</span>}
                      {inAuction && <span className="text-[7px] bg-v-red text-white px-1.5 py-0.5 rounded-sm tracking-widest font-black self-center uppercase shrink-0">DRAFT</span>}
                    </div>
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-0.5 ml-11 lg:ml-14 overflow-hidden">
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
          <div className="grid grid-cols-3 gap-1 bg-white/5 rounded-sm p-2 mt-3">
             <div className="text-center">
                <span className="block text-[6px] uppercase text-white/40 font-black tracking-wider">Points</span>
                <span className="text-xs font-black italic text-v-red">{stats.avgPoints ?? 0}</span>
             </div>
             <div className="text-center border-x border-white/5">
                <span className="block text-[6px] uppercase text-white/40 font-black tracking-wider">ACS</span>
                <span className="text-xs font-black italic">{stats.acs ?? 0}</span>
             </div>
             <div className="text-center">
                <span className="block text-[6px] uppercase text-white/40 font-black tracking-wider">K/D</span>
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
              className={`${actionClassName}  flex-1 lg:flex lg:flex-col sm:flex-none px-3! py-2! text-[10px]! cursor-pointer disabled:opacity-30 disabled:grayscale`}
            >
                <span className="text-[10px] font-black uppercase tracking-wider">
                  {actionLabel}
                </span>

                {!!actionSubLabel && (
                  <span className="text-[10px] pl-1 lg:pl-0 font-black uppercase tracking-wider">
                    {actionSubLabel}
                  </span>
                )}
            </button>
          )}
          {onSecondAction && (
            <button 
              onClick={(e) => { e.stopPropagation(); onSecondAction(); }}
              className={`${secondActionClassName} flex flex-col sm:flex-none px-3! py-2! cursor-pointer text-[10px]! hover:border-v-red hover:text-v-red`}
            >
              {secondActionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
