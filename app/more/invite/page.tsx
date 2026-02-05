import Link from "next/link";

export default function InvitePage() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700">
      <div className="flex items-center gap-2">
         <Link href="/more" className="text-v-white/20 hover:text-v-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
         </Link>
         <h1 className="text-4xl leading-none italic uppercase">Reclutar</h1>
      </div>

      <div className="v-panel p-8 space-y-6">
        <h2 className="text-2xl font-black italic tracking-tighter uppercase uppercase">Expande tu División</h2>
        <p className="text-xs text-v-white/60 leading-relaxed italic">
          Comparte tu código de acceso y recluta a nuevos managers para competir en tus ligas privadas.
        </p>
        <div className="bg-v-navy p-4 border border-dashed border-v-white/20 text-center select-all cursor-pointer group hover:border-v-red transition-all">
           <p className="text-[8px] font-black uppercase text-v-white/20 group-hover:text-v-red">TU CÓDIGO DE RECLUTAMIENTO</p>
           <p className="text-2xl font-black italic tracking-widest mt-1 uppercase tracking-[0.2em]">FNT-LLE-2026</p>
        </div>
        <button className="v-btn-primary w-full py-4 text-[10px]">
          COPIAR ENLACE DE ACCESO
        </button>
      </div>
    </div>
  );
}
