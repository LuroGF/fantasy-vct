import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-v-navy px-6 text-v-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,70,85,0.14),transparent_55%)]" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center text-center">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-v-red">Error 404</p>
        <h1 className="mt-4 text-6xl font-black italic uppercase tracking-tighter sm:text-8xl">
          Fuera de mapa
        </h1>
        <p className="mt-5 max-w-md text-sm leading-6 text-v-white/60">
          La página que buscas no existe, se ha movido o ya no está disponible.
        </p>
        <div className="mt-9 flex w-full max-w-sm flex-col gap-3 sm:flex-row">
          <Link href="/dashboard" className="v-btn-primary flex-1 py-4 text-sm">
            Ir al inicio
          </Link>
          <Link href="/" className="v-btn-secondary flex-1 py-4 text-sm">
            Portada
          </Link>
        </div>
      </div>
    </main>
  );
}
