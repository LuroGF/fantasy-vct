import Link from "next/link";

const players = [
  { name: "K1ng", team: "FNC", role: "Duelista", price: "22.500.000" },
  { name: "Niko", team: "VIT", role: "Iniciador", price: "18.200.000" },
  { name: "Zell", team: "GX", role: "Controlador", price: "15.600.000" },
  { name: "Maru", team: "BBL", role: "Centinela", price: "14.800.000" },
];

export default function MarketPage() {
  return (
    <main className="min-h-screen bg-[#1f1f1f] text-white">
      <section className="mx-auto w-full max-w-md px-5 pb-28 pt-10">
        <h1 className="text-center text-3xl font-black tracking-tight">
          MERCADO
        </h1>
        <div className="mt-4 rounded-2xl border border-zinc-700 bg-black/60 p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">
            Filtros
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {["Rol", "Equipo", "Precio", "Forma"].map((label) => (
              <button
                key={label}
                className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-200"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {players.map((player) => (
            <div
              key={player.name}
              className="rounded-xl bg-white px-4 py-3 text-sm text-black shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold">{player.name}</div>
                  <div className="text-xs text-zinc-500">
                    {player.team} • {player.role}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase text-zinc-500">Precio</div>
                  <div className="text-sm font-semibold">
                    {player.price}
                  </div>
                </div>
              </div>
              <button className="mt-3 w-full rounded-lg bg-[#c7b26b] py-2 text-xs font-semibold text-black">
                Fichar
              </button>
            </div>
          ))}
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-white/90 text-black backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-6 py-3 text-[11px]">
          <Link href="/dashboard" className="text-zinc-500">
            Inicio
          </Link>
          <Link href="/team" className="text-zinc-500">
            Mi equipo
          </Link>
          <Link href="/market" className="font-semibold">
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
