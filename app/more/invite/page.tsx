import Link from "next/link";

export default function InvitePage() {
  return (
    <div
      className="
  mx-auto
  w-full
  max-w-md sm:max-w-xl lg:max-w-4xl
  px-4 sm:px-6
  flex flex-col gap-8
  animate-in fade-in slide-in-from-bottom-4 duration-700 py-6
"
    >
      <div className="flex items-center gap-2">
        <Link
          href="/more"
          className="text-v-white/20 hover:text-v-white transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <h1 className="text-4xl leading-none italic uppercase">
          Invitar a amigos
        </h1>
      </div>

      <div className="v-panel p-8 space-y-6">
        <h2 className="text-2xl font-black italic tracking-tighter uppercase uppercase">
          Invitar a tus amigos a tu liga
        </h2>
        <p className="text-xs text-v-white/60 leading-relaxed italic">
          Invita a tus amigos mediante código para que se puedan unir a tu liga
        </p>
        <div className="bg-v-navy p-4 border border-dashed border-v-white/20 text-center select-all cursor-pointer group hover:border-v-red transition-all">
          <p className="text-[8px] font-black uppercase text-v-white/20 group-hover:text-v-red">
            TU CÓDIGO DE INVITACIÓN
          </p>
          <p className="text-2xl font-black italic tracking-widest mt-1 uppercase tracking-[0.2em]">
            FNT-LLE-2026
          </p>
        </div>
        <button className="v-btn-primary w-full py-4 text-[10px]">
          COPIAR CÓDIGO
        </button>
      </div>
    </div>
  );
}
