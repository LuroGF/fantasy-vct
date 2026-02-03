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
    <main className="min-h-screen bg-[#1f1f1f] text-white">
      <section className="mx-auto w-full max-w-md px-5 pb-28 pt-10">
        <h1 className="text-center text-3xl font-black tracking-tight">MAS</h1>
        <div className="mt-5 grid gap-3">
          {options.map((item) => (
            <button
              key={item}
              className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm text-black shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
            >
              <span>{item}</span>
              <span className="text-zinc-400">›</span>
            </button>
          ))}
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-white/90 text-black backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-6 py-3 text-[11px]">
          <Link href="/" className="text-zinc-500">
            Inicio
          </Link>
          <Link href="/team" className="text-zinc-500">
            Mi equipo
          </Link>
          <Link href="/market" className="text-zinc-500">
            Mercado
          </Link>
          <Link href="/ranking" className="text-zinc-500">
            Clasificacion
          </Link>
          <Link href="/more" className="font-semibold">
            Mas
          </Link>
        </div>
      </nav>
    </main>
  );
}
