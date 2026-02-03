import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[#1f1f1f] text-white">
      <section className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 pb-16 pt-12">
        <div>
          <h1 className="text-3xl font-semibold">Bienvenido a VCF</h1>
          <p className="mt-2 text-sm text-zinc-300">
            Crea una cuenta para disfrutar de la aplicacion.
          </p>
        </div>

        <form className="grid gap-4">
          <input
            type="text"
            placeholder="Usuario"
            className="h-12 rounded-full border border-zinc-700 bg-zinc-900/70 px-5 text-sm text-white placeholder:text-zinc-500"
          />
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
          <input
            type="password"
            placeholder="Confirmar Contrasena"
            className="h-12 rounded-full border border-zinc-700 bg-zinc-900/70 px-5 text-sm text-white placeholder:text-zinc-500"
          />
          <button className="mt-2 w-full rounded-lg bg-[#c7b26b] py-3 text-sm font-semibold text-black">
            Registrarme
          </button>
        </form>

        <div className="text-center text-xs text-zinc-500">
          O registrate con
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
          Tienes una cuenta?{" "}
          <Link href="/login" className="text-white underline">
            Inicia sesion
          </Link>
        </p>
      </section>
    </main>
  );
}
