"use client";

import Link from "next/link";

export default function RulesPage() {
  const scoringRules = [
    { label: "Por cada kill", points: "+2 pts" },
    { label: "Por cada muerte", points: "-1 pt" },
    { label: "Por cada asistencia", points: "+1 pt" },
    { label: "Por cada clutch", points: "+3 pts" },
    { label: "Por cada Primera Sangre (FB)", points: "+2 pts" },
    { label: "Por cada Primera Muerte (FD)", points: "-1 pt" },
    { label: "ACS 300 o más", points: "+5 pts" },
    { label: "ACS entre 250 y 299", points: "+3 pts" },
    { label: "ACS entre 200 y 249", points: "+1 pt" },
    { label: "ACS entre 150 y 199", points: "0 pts" },
    { label: "ACS inferior a 150", points: "-1 pt" },
    { label: "MVP del partido", points: "+5 pts" },
  ];

  const gameweekRewards = [
    { label: "1.º puesto", amount: "2.000.000 €" },
    { label: "2.º puesto", amount: "1.250.000 €" },
    { label: "3.º puesto", amount: "750.000 €" },
    { label: "4.º puesto en adelante", amount: "500.000 €" },
  ];

  return (
    <div
      className="
        mx-auto
        w-full
        max-w-md sm:max-w-xl lg:max-w-4xl
        px-4 sm:px-6
        flex flex-col gap-8
        animate-in fade-in slide-in-from-bottom-4 duration-700 py-6
      "
    >
      <Link href="/more">
        <div className="flex items-center gap-2">
          <div className="text-v-white/20 hover:text-v-white transition-colors">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </div>
          <h1 className="text-4xl leading-none italic uppercase">Reglas</h1>
        </div>
      </Link>

      <div className="v-panel p-6 space-y-6">
        <div className="space-y-4">
          <h2 className="text-2xl italic tracking-tighter uppercase border-b border-v-red w-fit">
            Puntuación
          </h2>
          <p className="text-xs text-v-white/60 leading-relaxed italic">
            El sistema calcula automáticamente el rendimiento de todos los
            jugadores con la misma fórmula, sin modificadores por rol.
            MVP y clutches solo se contabilizan cuando la fuente ofrece esos
            datos de forma fiable.
          </p>
        </div>

        <div className="grid gap-2">
          {scoringRules.map((rule) => (
            <div
              key={rule.label}
              className="bg-v-navy/50 p-3 flex justify-between items-center border-l-2 border-v-white/10 hover:border-v-red transition-all"
            >
              <span className="text-[10px] font-black uppercase tracking-widest">
                {rule.label}
              </span>
              <span className="text-sm font-black italic text-v-red">
                {rule.points}
              </span>
            </div>
          ))}
        </div>

        <div className="v-panel border-white/5 bg-v-white/5 p-4 mt-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-v-red mb-2">
            Actualización de puntos
          </p>
          <p className="text-[10px] text-v-white/40 leading-relaxed italic">
            Los puntos se actualizan cada 30 minutos mientras los partidos están
            en vivo. Los resultados finales se confirman al terminar la serie.
          </p>
        </div>
      </div>

      <div className="v-panel p-6 space-y-6">
        <div className="space-y-3">
          <h2 className="text-2xl italic tracking-tighter uppercase border-b border-v-red w-fit">
            Recompensas
          </h2>
          <p className="text-xs text-v-white/60 leading-relaxed italic">
            Los puntos determinan la clasificación y no se convierten directamente
            en dinero. Para cobrar una jornada debes haber presentado cinco
            titulares válidos antes del cierre.
          </p>
        </div>

        <div className="grid gap-2">
          {gameweekRewards.map((reward) => (
            <div
              key={reward.label}
              className="bg-v-navy/50 p-3 flex justify-between items-center border-l-2 border-v-white/10"
            >
              <span className="text-[10px] font-black uppercase tracking-widest">
                {reward.label}
              </span>
              <span className="text-sm font-black italic text-v-red">
                {reward.amount}
              </span>
            </div>
          ))}
        </div>

        <div className="border border-white/5 bg-v-white/5 p-4 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-v-red">
            Actividad diaria
          </p>
          <p className="text-[10px] text-v-white/40 leading-relaxed italic">
            Puedes reclamar 500.000 € una vez al día desde la campana. No se
            acumula si un día no entras. En caso de empate, se reparten las bolsas
            de las posiciones afectadas.
          </p>
        </div>
      </div>
    </div>
  );
}
