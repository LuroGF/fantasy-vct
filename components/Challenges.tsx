
import { CheckCircle2, Circle } from "lucide-react";

interface Challenge {
  id: number;
  title: string;
  description: string;
  progress: number;
  total: number;
  reward: string;
  isCompleted: boolean;
}

interface Challenge {
  id: number;
  title: string;
  description: string;
  progress: number;
  total: number;
  reward: string;
  isCompleted: boolean;
}

interface ChallengesProps {
  challenges?: Challenge[];
}

export function Challenges({ challenges = [] }: ChallengesProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between px-1">
        <h2 className="text-2xl italic tracking-tighter uppercase">Protocolo de Desafíos</h2>
        <span className="text-[8px] font-black uppercase text-v-red tracking-widest mb-1">Actualizado en Tiempo Real</span>
      </div>

      <div className="grid gap-3">
        {challenges.map((challenge) => (
          <div 
            key={challenge.id} 
            className={`v-panel p-4 border-l-2 transition-all relative overflow-hidden ${
              challenge.isCompleted ? 'border-l-green-500 bg-green-500/5' : 'border-l-v-white/20'
            }`}
          >
            <div className="flex items-start justify-between relative z-10">
              <div className="flex gap-3">
                <div className="mt-1">
                  {challenge.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-v-white/20" />
                  )}
                </div>
                <div>
                  <h4 className={`text-sm font-black italic uppercase ${challenge.isCompleted ? 'text-green-500' : 'text-v-white'}`}>
                    {challenge.title}
                  </h4>
                  <p className="text-[10px] text-v-white/50 font-medium">
                    {challenge.description}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black italic text-v-red">+{challenge.reward}</span>
              </div>
            </div>

            {/* Progress Bar */}
            {!challenge.isCompleted && (
              <div className="mt-3 h-1 bg-white/5 w-full relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-v-red transition-all duration-1000" 
                  style={{ width: `${(challenge.progress / challenge.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        ))}

        {challenges.length === 0 && (
          <div className="v-panel border-white/5 py-10 text-center opacity-40">
             <p className="text-[10px] font-black uppercase tracking-widest text-v-white/50 italic">
               Protocolo Offline // No hay desafíos tácticos asignados
             </p>
          </div>
        )}
      </div>
    </div>
  );
}
