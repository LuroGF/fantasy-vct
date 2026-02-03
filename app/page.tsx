import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-v-navy">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-bg.png"
          alt="VCT Fantasy Background"
          fill
          className="object-cover opacity-60 scale-110 animate-pulse-slow"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-b from-v-navy/20 via-v-navy/60 to-v-navy" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center text-center gap-8 py-12">
        {/* Animated Badge */}
        <div className="animate-bounce-subtle">
           <div className="bg-v-red text-white text-[10px] font-black uppercase px-3 py-1 tracking-[0.3em] -skew-x-12 shadow-lg shadow-v-red/50">
             Acceso Anticipado
           </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl sm:text-7xl font-black italic tracking-tighter leading-none text-v-white underline-offset-8 decoration-v-red decoration-4">
            VCF<span className="text-v-red">.</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-v-white/50">
            Valorant Champions Fantasy
          </p>
        </div>

        <div className="w-12 h-1 bg-v-red/50" />

        <p className="text-sm font-medium text-v-white/70 leading-relaxed max-w-[280px]">
          Toma el control de tu propia organización del VCT. Recluta oradores, gestiona presupuestos y domina la clasificación mundial.
        </p>

        <div className="flex flex-col w-full gap-4 mt-4">
          <Link
            href="/login"
            className="v-btn-primary py-4 text-sm shadow-2xl shadow-v-red/20 group"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              Iniciar Operación
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </span>
          </Link>
          
          <Link
            href="/register"
            className="v-btn-secondary py-4 text-sm"
          >
            Reclutar Nueva Escuadra
          </Link>
        </div>

        {/* Bottom stats decorations */}
        <div className="grid grid-cols-2 gap-8 mt-8 opacity-40">
           <div className="text-center">
             <p className="text-[8px] font-black uppercase tracking-widest mb-1">Jugadores Activos</p>
             <p className="text-xl font-black italic">12.4K</p>
           </div>
           <div className="text-center">
             <p className="text-[8px] font-black uppercase tracking-widest mb-1">Premios Totales</p>
             <p className="text-xl font-black italic">50K VP</p>
           </div>
        </div>
      </div>

      {/* Floating HUD elements for flavor */}
      <div className="absolute bottom-10 left-10 w-24 h-px bg-v-white/10 hidden sm:block" />
      <div className="absolute top-1/2 -right-12 w-32 h-px bg-v-white/10 rotate-90 hidden sm:block" />
    </div>
  );
}
