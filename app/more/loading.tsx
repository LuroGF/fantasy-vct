export default function MoreLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-6 sm:max-w-xl sm:px-6 lg:max-w-4xl"
      role="status"
      aria-live="polite"
      aria-label="Cargando sección Más"
    >
      <div className="space-y-2">
        <div className="h-10 w-32 animate-pulse bg-white/10" />
        <div className="h-2 w-44 animate-pulse bg-v-red/25" />
      </div>

      <div className="v-panel space-y-1 bg-v-gray/40 p-2">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between border-b border-white/5 p-4 last:border-0"
          >
            <div
              className="h-4 animate-pulse bg-white/10"
              style={{ width: `${42 + (index % 3) * 12}%` }}
            />
            <div className="h-5 w-7 animate-pulse bg-v-red/15" />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-3 text-[9px] font-black uppercase tracking-[0.25em] text-v-white/35">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-v-red/25 border-t-v-red" />
        Cargando perfil y preferencias…
      </div>
    </div>
  );
}
