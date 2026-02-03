import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-8">
      <h1 className="text-5xl font-extrabold tracking-tight">
        Fantasy Valorant
      </h1>

      <p className="text-zinc-400 text-lg max-w-md text-center">
        Build your fantasy team. Compete with friends. 
        Based on official Valorant esports data.
      </p>

      <div className="flex gap-4">
        <Link
          href="/dashboard"
          className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 transition"
        >
          Go to Dashboard
        </Link>

        <Link
          href="/leagues"
          className="px-6 py-3 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition"
        >
          View Leagues
        </Link>
      </div>
    </main>
  );
}
