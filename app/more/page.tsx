import Link from "next/link";
import { signOut } from "@/lib/actions/auth";

const options = [
  { label: "Perfil", href: "/more/profile" },
  { label: "Rendimiento", href: "/stats" },
  { label: "Comunidad", href: "/more/community" },
  { label: "Notificaciones", href: "/more/notifications" },
  { label: "Invitar amigos", href: "/more/invite" },
  { label: "Reglas y puntuacion", href: "/more/rules" },
  { label: "Soporte", href: "/more/support" },
];

export default function MorePage() {
  return (
    // <div className="mx-auto w-full max-w-md sm:max-w-lg lg:max-w-4xl py-4 flex flex-col gap-6 animate-in fade-in duration-700">
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
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl leading-none">Más</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-v-red">Perfil y preferencias</p>
        </div>
      </div>

      <div className="v-panel p-2 space-y-1 bg-v-gray/40">
        {options.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="w-full flex items-center justify-between p-4 hover:bg-v-white/5 transition-colors group border-b border-white/5 last:border-0"
          >
            <span className="text-sm font-black uppercase tracking-widest text-v-white/80">
              {item.label}
            </span>
            <span className="text-v-white/20 group-hover:text-v-red transition-colors text-xl">
              {"//"}
            </span>
          </Link>
        ))}
        
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center justify-between p-4 hover:bg-v-red/10 transition-colors group border-t cursor-pointer border-white/10"
          >
            <span className="text-sm font-black uppercase tracking-widest text-v-red">
              Cerrar sesión
            </span>
            <span className="text-v-red/50 group-hover:text-v-red transition-colors text-xl">
              {"//"}
            </span>
          </button>
        </form>
      </div>

      <div className="text-center space-y-2 py-4">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-v-white/20">{"VCT Fantasy // 2027"}</p>
        <div className="flex justify-center gap-4">
          <div className="w-1 h-1 bg-v-red/20" />
          <div className="w-1 h-1 bg-v-red/50" />
          <div className="w-1 h-1 bg-v-red/20" />
        </div>
      </div>
    </div>
  );
}
