
import { CheckCircle2, Circle, Target, Zap, Swords } from "lucide-react";

interface Challenge {
  id: number;
  title: string;
  description: string;
  progress: number;
  total: number;
  reward: string;
  isCompleted: boolean;
  icon?: any;
}

interface ChallengesProps {
  challenges?: Challenge[];
}

const DEFAULT_CHALLENGES: Challenge[] = [
  {
    id: 1,
    title: "OPERACIÓN PRECISIÓN",
    description: "Elimina a 10 agentes con disparos a la cabeza en tus partidos",
    progress: 4,
    total: 10,
    reward: "500 VP",
    isCompleted: false,
    icon: Target
  },
  {
    id: 2,
    title: "MAESTRÍA DE PISTOLAS",
    description: "Consigue 5 bajas en rondas de pistolas",
    progress: 5,
    total: 5,
    reward: "200 VP",
    isCompleted: true,
    icon: Swords
  },
  {
    id: 3,
    title: "SINERGIA TÁCTICA",
    description: "Usa 3 cartas de power-up en una sola jornada",
    progress: 1,
    total: 3,
    reward: "1000 VP",
    isCompleted: false,
    icon: Zap
  }
];

export function Challenges({ challenges }: ChallengesProps) {
  const displayChallenges = (challenges && challenges.length > 0) ? challenges : DEFAULT_CHALLENGES;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between px-1">
        <h2 className="text-2xl italic tracking-tighter uppercase">Protocolo de Desafíos</h2>
        <span className="text-[8px] font-black uppercase text-v-red tracking-widest mb-1">Misiones Sincronizadas</span>
      </div>

      <div className="grid gap-3">
        {displayChallenges.map((challenge) => {
          const Icon = challenge.icon || Circle;
          return (
            <div 
              key={challenge.id} 
              className={`v-panel p-4 border-l-2 transition-all relative overflow-hidden ${
                challenge.isCompleted ? 'border-l-v-white bg-v-white/5 opacity-60' : 'border-l-v-red bg-v-red/5'
              }`}
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="flex gap-3">
                  <div className={`mt-1 p-1.5 rounded-sm ${challenge.isCompleted ? 'bg-v-white/10' : 'bg-v-red/20'}`}>
                    <Icon className={`w-3.5 h-3.5 ${challenge.isCompleted ? 'text-v-white/40' : 'text-v-red'}`} />
                  </div>
                  <div>
                    <h4 className={`text-sm font-black italic uppercase ${challenge.isCompleted ? 'text-v-white/40' : 'text-v-white'}`}>
                      {challenge.title}
                    </h4>
                    <p className="text-[10px] text-v-white/50 font-medium tracking-tight">
                      {challenge.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-black italic ${challenge.isCompleted ? 'text-v-white/20 line-through' : 'text-v-red'}`}>
                    +{challenge.reward}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              {!challenge.isCompleted && (
                <div className="mt-3">
                  <div className="flex justify-between text-[8px] font-black uppercase text-v-white/30 mb-1 tracking-widest">
                    <span>Progreso</span>
                    <span>{challenge.progress} / {challenge.total}</span>
                  </div>
                  <div className="h-1 bg-white/5 w-full relative">
                    <div 
                      className="absolute top-0 left-0 h-full bg-v-red transition-all duration-1000 shadow-[0_0_8px_rgba(255,70,85,0.5)]" 
                      style={{ width: `${(challenge.progress / challenge.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
