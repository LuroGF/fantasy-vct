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
    <main className="min-h-screen bg-[#1f1f1f] text-white">
      <section className="mx-auto w-full max-w-md px-5 pb-28 pt-10">
        <h1 className="text-center text-3xl font-black tracking-tight">
          CLASIFICACION
        </h1>
        <div className="mt-4 rounded-2xl border border-zinc-700 bg-black/60 p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">
            Semana actual
          </div>
          <div className="mt-3 text-sm text-zinc-300">
            Top 5 de la jornada
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {standings.map((row) => (
            <div
              key={row.pos}
              className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm text-black shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#c7b26b] text-xs font-semibold text-black">
                  {row.pos}
                </span>
                <span className="font-semibold">{row.name}</span>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase text-zinc-500">Puntos</div>
                <div className="text-sm font-semibold">{row.points}</div>
              </div>
            </div>
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
          <Link href="/ranking" className="font-semibold">
            Clasificacion
          </Link>
          <Link href="/more" className="text-zinc-500">
            Mas
          </Link>
        </div>
      </nav>
    </main>
  );
}
