import Link from "next/link";

const standings = [
  { pos: 1, name: "Ministros", points: 128 },
  { pos: 2, name: "Ace Kings", points: 120 },
  { pos: 3, name: "Meta Riders", points: 112 },
  { pos: 4, name: "Spike Squad", points: 107 },
  { pos: 5, name: "Retake Club", points: 98 },
];

export default function RankingPage() {
  return (
    <div className="mx-auto w-full max-w-md sm:max-w-lg lg:max-w-4xl py-4 flex flex-col gap-6 animate-in fade-in duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl leading-none">Clasificación</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">Líderes de Operación</p>
        </div>
      </div>

      <div className="v-panel p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-v-white/50">{"Temporada 2026 // Semana 04"}</span>
          <div className="h-2 w-2 rounded-full bg-v-red" />
        </div>
        <div className="grid gap-2">
          {standings.map((row) => (
            <div
              key={row.pos}
              className={`flex items-center justify-between p-3 border-l-2 ${row.pos === 1 ? "bg-v-red/10 border-v-red" : "bg-v-white/5 border-v-white/10"
                }`}
            >
              <div className="flex items-center gap-4">
                <span className={`text-xl font-black italic ${row.pos === 1 ? "text-v-red" : "text-v-white/40"}`}>
                  #{row.pos.toString().padStart(2, '0')}
                </span>
                <span className="text-sm font-black uppercase tracking-tight italic">{row.name}</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black italic">{row.points}</span>
                <span className="text-[10px] font-black uppercase text-v-white/20 ml-1">Pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="v-panel p-4 border-l-v-white/5">
        <h4 className="text-sm font-black uppercase tracking-widest mb-2">Premios de la Temporada</h4>
        <p className="text-xs text-v-white/40 font-medium">
          El top 3 agentes al final de la temporada recibirán el Pase de Batalla Premium y un pack de 2175 VP.
        </p>
      </div>
    </div>

  );
}
