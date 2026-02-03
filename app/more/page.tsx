import Link from "next/link";

const options = [
  "Perfil",
  "Notificaciones",
  "Invitar amigos",
  "Reglas y puntuacion",
  "Soporte",
  "Cerrar sesion",
];

export default function MorePage() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl leading-none">Más</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">Ajustes de Terminal</p>
        </div>
      </div>

      <div className="v-panel p-2 space-y-1 bg-v-gray/40">
        {options.map((item) => (
          <button
            key={item}
            className="w-full flex items-center justify-between p-4 hover:bg-v-white/5 transition-colors group border-b border-white/5 last:border-0"
          >
            <span className={`text-sm font-black uppercase tracking-widest ${item === "Cerrar sesion" ? "text-v-red" : "text-v-white/80"}`}>
              {item}
            </span>
            <span className="text-v-white/20 group-hover:text-v-red transition-colors text-xl">
              //
            </span>
          </button>
        ))}
      </div>

      <div className="text-center space-y-2 py-4">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-v-white/20">Valorant Fantasy VCT // 2026</p>
        <div className="flex justify-center gap-4">
          <div className="w-1 h-1 bg-v-red/20" />
          <div className="w-1 h-1 bg-v-red/50" />
          <div className="w-1 h-1 bg-v-red/20" />
        </div>
      </div>
    </div>

  );
}
