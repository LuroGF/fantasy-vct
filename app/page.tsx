import Link from "next/link";
import { headers } from "next/headers";

type VlrPayload = {
  stats: { label: string; value: string }[];
  upcomingMatches: { time: string; teams: string; event: string }[];
  scoring: { label: string; value: string }[];
};

const fallbackData: VlrPayload = {
  stats: [
    { label: "Active leagues", value: "128" },
    { label: "Weekly managers", value: "4.2k" },
    { label: "Matches tracked", value: "312" },
  ],
  upcomingMatches: [
    { time: "14:00", teams: "FNATIC vs NAVI", event: "VCT EMEA" },
    { time: "17:30", teams: "LOUD vs LEV", event: "VCT Americas" },
    { time: "20:00", teams: "PRX vs DRX", event: "VCT Pacific" },
  ],
  scoring: [
    { label: "Kill", value: "+2" },
    { label: "Assist", value: "+1" },
    { label: "First blood", value: "+3" },
    { label: "Clutch round", value: "+4" },
    { label: "Match win", value: "+5" },
    { label: "Series MVP", value: "+6" },
  ],
};

async function getVlrData(): Promise<VlrPayload> {
  try {
    const headersList = headers();
    const host = (await headersList).get("host");
    const protocol = (await headersList).get("x-forwarded-proto") ?? "http";
    const baseUrl =
      host !== null
        ? `${protocol}://${host}`
        : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/vlr`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`VLR API error: ${response.status}`);
    }

    return (await response.json()) as VlrPayload;
  } catch (error) {
    console.error("Failed to load VLR data", error);
    return fallbackData;
  }
}

export default async function Home() {
  const data = await getVlrData();
  return (
    <main className="min-h-screen bg-[#1f1f1f] text-white">
      <div className="relative overflow-hidden px-5 pb-10 pt-14">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-black/60 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-black/60 blur-3xl" />
        </div>

        <div className="relative mx-auto flex w-full max-w-md flex-col items-center gap-8">
          <div className="flex w-full items-center justify-between text-sm text-zinc-400">
            <span className="text-xs tracking-[0.4em] text-zinc-500">VCF</span>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] uppercase">
              Beta
            </span>
          </div>

          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-300/30 bg-amber-200/10">
              <div className="h-10 w-10 rotate-45 border-4 border-amber-300/70" />
            </div>
            <h1 className="text-4xl font-black tracking-tight">VCF</h1>
            <p className="text-sm text-zinc-300">
              Valorant Champions Fantasy
            </p>
          </div>

          <div className="flex w-full flex-col gap-3">
            <Link
              href="/register"
              className="rounded-lg bg-[#c7b26b] py-3 text-center text-sm font-semibold text-black"
            >
              Crear cuenta
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-zinc-700 py-3 text-center text-sm font-semibold"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </div>

      <section className="mx-auto w-full max-w-md px-5 pb-8">
        <h2 className="text-center text-3xl font-black tracking-tight">
          MIS LIGAS
        </h2>
        <div className="mt-4 rounded-xl border border-zinc-700 bg-black/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-base">Ministros</span>
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-[#c7b26b] px-2 py-1 text-xs font-semibold text-black">
                +
              </div>
              <div className="rounded-md bg-[#c7b26b] px-2 py-1 text-xs font-semibold text-black">
                ↗
              </div>
            </div>
          </div>
          <div className="mt-3 grid gap-3 border-t border-zinc-700 pt-3 text-sm text-zinc-200">
            <div className="flex items-center justify-between">
              <span>20 jugadores</span>
              <span>3/20</span>
            </div>
            <div className="flex items-center justify-between">
              <span>68 puntos</span>
              <span>100.000.000</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Link
            href="/team"
            className="block w-full rounded-lg bg-[#c7b26b] py-3 text-center text-sm font-semibold text-black"
          >
            + Nueva liga
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-md px-5 pb-8">
        <h2 className="text-center text-3xl font-black tracking-tight">
          RESULTADOS
        </h2>
        <div className="mt-4 grid gap-3">
          {data.upcomingMatches.map((match) => (
            <div
              key={match.teams}
              className="rounded-xl bg-white px-4 py-3 text-sm text-black shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{match.teams.split(" vs ")[0]}</span>
                <div className="text-center text-xs text-zinc-600">
                  <div className="text-sm font-semibold text-[#b1262a]">
                    {match.time}
                  </div>
                  <div>23 Feb</div>
                </div>
                <span className="font-semibold">
                  {match.teams.split(" vs ")[1] ?? "TBD"}
                </span>
              </div>
            </div>
          ))}
          <Link
            href="/ranking"
            className="block w-full rounded-xl bg-white py-3 text-center text-sm font-semibold text-black"
          >
            Ver más resultados
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-md px-5 pb-20">
        <h2 className="text-center text-3xl font-black tracking-tight">
          UNETE, COMPITE O CREA
        </h2>
        <div className="mt-4 grid gap-4">
          <div className="rounded-2xl bg-white p-4 text-black">
            <div className="text-lg font-black text-[#b1262a]">SOLO YO</div>
            <p className="mt-2 text-sm text-zinc-600">
              Únete a una liga pública y compite contra jugadores de todo el
              mundo.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 text-black">
            <div className="text-lg font-black text-[#4e2f8c]">CON AMIGOS</div>
            <p className="mt-2 text-sm text-zinc-600">
              Crea tu propia liga o únete a una existente con un código de
              invitación.
            </p>
          </div>
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-white/90 text-black backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-6 py-3 text-[11px]">
          <Link href="/" className="font-semibold">
            Inicio
          </Link>
          <Link href="/team" className="text-zinc-500">
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
