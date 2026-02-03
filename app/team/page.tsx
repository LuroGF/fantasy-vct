import Link from "next/link";

export default function TeamPage() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl leading-none">Mi Equipo</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">Escuadra Activa</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase font-black text-v-white/40">Presupuesto</p>
          <p className="text-xl font-black text-v-white">$100.0M</p>
        </div>
      </div>

      <div className="v-panel relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-v-red/5 -rotate-45 translate-x-16 -translate-y-16" />

        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-black uppercase tracking-tighter italic">Ministros</span>
          <span className="bg-v-red text-[10px] font-black uppercase px-2 py-0.5 -skew-x-12">
            Registrado
          </span>
        </div>

        <p className="text-zinc-400 text-xs mb-6">
          Alinea 5 jugadores titulares y 1 suplente para la próxima jornada del VCT.
        </p>

        <div className="grid gap-3">
          {[
            { role: "Duelista", color: "bg-v-red/20" },
            { role: "Iniciador", color: "bg-v-white/5" },
            { role: "Controlador", color: "bg-v-white/5" },
            { role: "Centinela", color: "bg-v-white/5" },
            { role: "Flex", color: "bg-v-white/5" },
            { role: "Suplente", color: "bg-v-white/5" },
          ].map((item) => (
            <div
              key={item.role}
              className={`flex items-center justify-between p-3 border border-white/5 transition-all hover:border-v-red/30 ${item.color}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-1 h-4 bg-v-red" />
                <span className="text-xs font-black uppercase tracking-widest">{item.role}</span>
              </div>
              <span className="text-[10px] font-black uppercase text-v-white/20 italic tracking-widest">
                Espacio Vacante
              </span>
            </div>
          ))}
        </div>

        <Link
          href="/market"
          className="v-btn-primary w-full mt-6 text-sm"
        >
          Explorar Agentes
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="v-panel p-4 border-l-v-white/20">
          <p className="text-[10px] font-black uppercase text-v-white/40 mb-1">Puntos Totales</p>
          <p className="text-2xl font-black italic">1,240 <span className="text-[10px] not-italic text-v-red">PTS</span></p>
        </div>
        <div className="v-panel p-4 border-l-v-white/20">
          <p className="text-[10px] font-black uppercase text-v-white/40 mb-1">Rango Global</p>
          <p className="text-2xl font-black italic">#402</p>
        </div>
      </div>
    </div>

  );
}
