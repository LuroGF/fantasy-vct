
import { StatusBadge } from "./StatusBadge";

interface LiveHUDProps {
  currentPoints: number;
  rank: number;
  activeMatches: number;
}

export function LiveHUD({ currentPoints, rank, activeMatches }: LiveHUDProps) {
  return (
    <div className="v-panel relative overflow-hidden bg-linear-to-r from-v-navy via-v-navy to-v-red/10 border-l-4 border-l-v-red p-6 animate-in slide-in-from-right duration-1000">
      {/* Decorative scanner line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-v-red/30 animate-scan pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-v-red">Live Operation Status</span>
            {activeMatches > 0 && <StatusBadge variant="white" label="TRANSMISIÓN ACTIVA" pulse />}
          </div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase text-v-white">
            Puntuación Combat
          </h2>
        </div>

        <div className="flex items-end gap-12">
          <div className="text-center sm:text-right">
            <p className="text-[8px] font-black uppercase text-v-white/40 tracking-widest mb-1">Global Rank</p>
            <p className="text-2xl font-black italic text-v-white">
              #<span className="text-v-red">{rank.toLocaleString()}</span>
            </p>
          </div>
          
          <div className="text-center sm:text-right min-w-[120px]">
            <p className="text-[8px] font-black uppercase text-v-white/40 tracking-widest mb-1">Total Points</p>
            <p className="text-5xl font-black italic text-v-white tracking-tighter">
              {currentPoints.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
      
      {/* HUD Accents */}
      <div className="absolute bottom-2 right-4 flex gap-1 opacity-20">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-1 h-3 bg-v-white" />
        ))}
      </div>
    </div>
  );
}
