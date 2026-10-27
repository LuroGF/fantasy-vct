export default function AppLoading() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8 sm:max-w-xl sm:px-6 lg:max-w-4xl">
      <div className="h-10 w-48 animate-pulse bg-white/10" />
      <div className="v-panel space-y-4 p-6" role="status" aria-label="Cargando contenido">
        <div className="h-3 w-28 animate-pulse bg-v-red/30" />
        <div className="h-7 w-2/3 animate-pulse bg-white/10" />
        <div className="grid grid-cols-2 gap-3 pt-3">
          <div className="h-24 animate-pulse bg-white/5" />
          <div className="h-24 animate-pulse bg-white/5" />
        </div>
      </div>
      <p className="text-center text-[9px] font-black uppercase tracking-[0.25em] text-v-white/30">
        Cargando…
      </p>
    </div>
  );
}
