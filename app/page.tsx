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
    <main className="min-h-screen bg-black text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-32 h-72 w-72 rounded-full bg-red-600/20 blur-3xl" />
          <div className="absolute top-40 -left-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-red-600/50 to-transparent" />
        </div>

        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-5 pb-16 pt-20 sm:px-8 sm:pt-24">
          <nav className="flex w-full items-center justify-between text-sm text-zinc-300">
            <span className="text-xs uppercase tracking-[0.3em] text-zinc-500">
              Fantasy VCT
            </span>
            <div className="flex items-center gap-3">
              <Link
                href="/leagues"
                className="rounded-full border border-zinc-800 px-4 py-1.5 text-xs uppercase tracking-wide transition hover:bg-zinc-900"
              >
                Leagues
              </Link>
              <Link
                href="/dashboard"
                className="hidden rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-red-700 sm:inline-flex"
              >
                Dashboard
              </Link>
            </div>
          </nav>

          <div className="flex w-full flex-col items-center gap-4 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-red-600/40 bg-red-600/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-red-300">
              Fantasy Esports
            </span>
            <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
              Fantasy Valorant
            </h1>
            <p className="max-w-2xl text-pretty text-base text-zinc-300 sm:text-lg">
              Draft your dream roster, climb weekly leaderboards, and prove you
              understand the meta. Built on VLR match data (scraped and
              normalized) with updates after every series.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/dashboard"
              className="w-full rounded-xl bg-red-600 px-6 py-3 text-center font-semibold transition hover:bg-red-700 sm:w-auto"
            >
              Go to Dashboard
            </Link>

            <Link
              href="/leagues"
              className="w-full rounded-xl border border-zinc-700 px-6 py-3 text-center font-semibold transition hover:bg-zinc-800 sm:w-auto"
            >
              View Leagues
            </Link>
          </div>

          <div className="grid w-full gap-4 sm:grid-cols-3">
            {[
              {
                title: "Smart Drafting",
                body: "Salary caps, role balance, and auto-synergy hints keep every roster competitive.",
              },
              {
                title: "Live Performance",
                body: "VLR match data powers projections so your squad evolves with every series.",
              },
              {
                title: "Social Leagues",
                body: "Create private leagues, invite friends, and track weekly battles.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 text-left shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
              >
                <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              How it works
            </h2>
            <div className="mt-6 grid gap-5">
              {[
                {
                  step: "1",
                  title: "Pick a league",
                  body: "Join a public league or create your own private room with custom scoring.",
                },
                {
                  step: "2",
                  title: "Draft your roster",
                  body: "Build a balanced lineup across Duelist, Initiator, Controller, and Sentinel roles.",
                },
                {
                  step: "3",
                  title: "Track results",
                  body: "See weekly points, clutch bonuses, and MVP awards directly in your dashboard.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600/20 text-sm font-semibold text-red-200">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{item.title}</h3>
                    <p className="text-sm text-zinc-400">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6">
              <h3 className="text-lg font-semibold">Live stats snapshot</h3>
              <div className="mt-4 grid gap-3">
                {data.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3"
                  >
                    <span className="text-xs uppercase tracking-wide text-zinc-500">
                      {stat.label}
                    </span>
                    <span className="text-lg font-semibold text-white">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
              <h3 className="text-lg font-semibold">Weekly highlights</h3>
              <ul className="mt-4 grid gap-3 text-sm text-zinc-300">
                <li>Clutch multiplier for multi-kill rounds.</li>
                <li>Bonus for highest ACS in a series.</li>
                <li>Team synergy boosts for matching roles.</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="text-lg font-semibold">Ready to climb?</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Start your first roster in minutes and see where you rank after
                the next matchday.
              </p>
              <Link
                href="/dashboard"
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 sm:w-auto"
              >
                Create My Team
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Matchday radar
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Upcoming series scraped from VLR. This section is ready to be
              wired to the scrapper feed.
            </p>
            <div className="mt-6 grid gap-3">
              {data.upcomingMatches.map((match) => (
                <div
                  key={match.teams}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"
                >
                  <div className="text-xs uppercase tracking-wide text-zinc-500">
                    {match.time} • {match.event}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {match.teams}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-red-600/20 via-zinc-950 to-zinc-950 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Scoring overview
            </h2>
            <p className="mt-2 text-sm text-zinc-300">
              Transparent scoring makes every decision meaningful. These values
              are ready to match your official ruleset.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {data.scoring.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3"
                >
                  <span className="text-sm text-zinc-300">{item.label}</span>
                  <span className="text-sm font-semibold text-white">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
