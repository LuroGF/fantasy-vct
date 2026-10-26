import Link from "next/link";

export default function SupportPage() {
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
         <Link href="/more" className="text-v-white/20 hover:text-v-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
         </Link>
         <h1 className="text-4xl leading-none italic uppercase">Soporte</h1>
      </div>

      <div className="v-panel p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-v-red/10 animate-pulse rounded-full flex items-center justify-center mx-auto border border-v-red/20">
           <svg className="w-8 h-8 text-v-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        </div>
        
        <div className="space-y-2">
          <p className="text-xl font-black italic uppercase tracking-tighter">¿Necesitas ayuda?</p>
          <p className="text-xs text-v-white/40 leading-relaxed">
            Escríbenos y revisaremos tu incidencia con la aplicación.
          </p>
        </div>

        <div className="space-y-4 pt-6">
          <p className="text-[10px] font-black uppercase text-v-red tracking-[0.3em]">Contacto Directo</p>
          <a href="mailto:soporte@fantasy-vct.com" className="v-btn-primary block py-3 text-[10px]">
            ENVIAR REPORTE DE ERROR
          </a>
        </div>
      </div>
    </div>
  );
}
