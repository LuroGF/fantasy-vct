import Link from "next/link";

export default function TeamPage() {
  return (
    <main className="min-h-screen bg-[#1f1f1f] text-white">
      <section className="mx-auto w-full max-w-md px-5 pb-28 pt-10">
        <h1 className="text-center text-3xl font-black tracking-tight">
          MI EQUIPO
        </h1>
        <div className="mt-5 rounded-2xl border border-zinc-700 bg-black/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold">Ministros</span>
            <span className="rounded-full bg-[#c7b26b] px-2 py-1 text-[11px] font-semibold text-black">
              Activo
            </span>
          </div>
          <p className="mt-3 text-sm text-zinc-300">
            Alinea 5 jugadores titulares y 1 suplente antes del cierre.
          </p>
          <div className="mt-4 grid gap-3">
            {[
              "Duelista",
              "Iniciador",
              "Controlador",
              "Centinela",
              "Flex",
              "Suplente",
            ].map((role) => (
              <div
                key={role}
                className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm text-black"
              >
                <span>{role}</span>
                <span className="text-xs text-zinc-500">Vacante</span>
              </div>
            ))}
          </div>
          <Link
            href="/market"
            className="mt-4 block w-full rounded-lg bg-[#c7b26b] py-3 text-center text-sm font-semibold text-black"
          >
            Ir al mercado
          </Link>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-4 text-black">
          <div className="text-xs uppercase text-zinc-500">
            Presupuesto restante
          </div>
          <div className="mt-2 text-2xl font-black">$ 100.000.000</div>
          <p className="mt-2 text-sm text-zinc-600">
            Gestiona tu presupuesto para no exceder el tope salarial.
          </p>
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-white/90 text-black backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-6 py-3 text-[11px]">
          <Link href="/" className="text-zinc-500">
            Inicio
          </Link>
          <Link href="/team" className="font-semibold">
            Mi equipo
          </Link>
          <Link href="/market" className="text-zinc-500">
            Mercado
          </Link>
          <Link href="/ranking" className="text-zinc-500">
            Clasificación
          </Link>
          <Link href="/more" className="text-zinc-500">
            Más
          </Link>
        </div>
      </nav>
    </main>
  );
}
