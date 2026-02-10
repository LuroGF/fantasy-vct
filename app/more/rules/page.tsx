import Link from "next/link";

export default function RulesPage() {
  const rules = [
    { label: "Baja (Kill)", points: "+2 pts" },
    { label: "Asistencia", points: "+1 pts" },
    { label: "Primera Sangre (FB)", points: "+3 pts" },
    { label: "Clutch", points: "+4 pts" },
    { label: "K/D Negativo", points: "-1 pts" },
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
      <div className="flex items-center gap-2">
         <Link href="/more" className="text-v-white/20 hover:text-v-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
         </Link>
         <h1 className="text-4xl leading-none italic uppercase">Reglas</h1>
      </div>

      <div className="v-panel p-6 space-y-6">
        <div className="space-y-4">
          <h2 className="text-2xl italic tracking-tighter uppercase border-b border-v-red w-fit">Protocolo de Puntuación</h2>
          <p className="text-xs text-v-white/60 leading-relaxed italic">
            El sistema calcula automáticamente el rendimiento de combate de cada agente basándose en los datos oficiales de VLR.gg.
          </p>
        </div>

        <div className="grid gap-2">
          {rules.map((rule) => (
            <div key={rule.label} className="bg-v-navy/50 p-3 flex justify-between items-center border-l-2 border-v-white/10 hover:border-v-red transition-all">
              <span className="text-[10px] font-black uppercase tracking-widest">{rule.label}</span>
              <span className="text-sm font-black italic text-v-red">{rule.points}</span>
            </div>
          ))}
        </div>

        <div className="v-panel border-white/5 bg-v-white/5 p-4 mt-8">
           <p className="text-[10px] font-black uppercase tracking-widest text-v-red mb-2">Aviso de Operación</p>
           <p className="text-[10px] text-v-white/40 leading-relaxed italic">
             Los puntos se actualizan cada 30 minutos mientras los partidos están en vivo. Los resultados finales se confirman al terminar la serie.
           </p>
        </div>
      </div>
    </div>
  );
}
