import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#1f1f1f] text-white">
      <section className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 pb-16 pt-12">
        <div>
          <h1 className="text-3xl font-semibold">Bienvenido a VCF</h1>
          <p className="mt-2 text-sm text-zinc-300">
            Inicia sesion para disfrutar de la aplicacion.
          </p>
        </div>

        <form className="grid gap-4">
          <input
            type="email"
            placeholder="Email"
            className="h-12 rounded-full border border-zinc-700 bg-zinc-900/70 px-5 text-sm text-white placeholder:text-zinc-500"
          />
          <input
            type="password"
            placeholder="Contrasena"
            className="h-12 rounded-full border border-zinc-700 bg-zinc-900/70 px-5 text-sm text-white placeholder:text-zinc-500"
          />
          <Link
            href="/dashboard"
            className="mt-2 w-full rounded-lg bg-[#c7b26b] py-3 text-center text-sm font-semibold text-black"
          >
            Iniciar sesion
          </Link>
        </form>

        <div className="text-center text-xs text-zinc-500">
          O inicia sesion con
        </div>
        <div className="flex items-center justify-center gap-4">
          <button className="h-12 w-12 rounded-full border border-zinc-700 bg-zinc-900/70 text-xs">
            G
          </button>
          <button className="h-12 w-12 rounded-full border border-zinc-700 bg-zinc-900/70 text-xs">
            F
          </button>
        </div>

        <p className="text-center text-sm text-zinc-400">
          No tienes cuenta?{" "}
          <Link href="/register" className="text-white underline">
            Registrate
          </Link>
        </p>
      </section>
    </main>
  );
}
