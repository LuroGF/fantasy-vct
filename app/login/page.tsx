import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-10 py-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-v-red" />
          <h1 className="text-5xl italic tracking-tighter">Identificarse</h1>
        </div>
        <p className="text-v-white/50 text-[10px] font-black uppercase tracking-[0.3em]">
          Autorización de Acceso Nivel 04
        </p>
      </div>

      {/* Form Container */}
      <div className="v-panel p-6 space-y-6">
        <form className="grid gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-v-white/30 ml-1">Protocolo Email</label>
            <input
              type="email"
              placeholder="tu@agencia.com"
              className="w-full h-14 bg-v-navy/50 border border-white/5 px-5 text-sm font-medium focus:border-v-red outline-none transition-all placeholder:text-v-white/10"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-v-white/30 ml-1">Código de Seguridad</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full h-14 bg-v-navy/50 border border-white/5 px-5 text-sm font-medium focus:border-v-red outline-none transition-all placeholder:text-v-white/10"
            />
          </div>

          <Link
            href="/dashboard"
            className="v-btn-primary w-full py-4 text-sm mt-4 shadow-xl shadow-v-red/20 group"
          >
            <span className="flex items-center justify-center gap-2">
              Iniciar Sesión
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </span>
          </Link>
        </form>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/5"></span>
          </div>
          <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-v-white/20">
            <span className="bg-[#1f2326] px-4">Métodos Alternativos</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button className="v-btn-secondary py-3 text-[10px] font-black tracking-widest bg-v-navy/30">
            RIOT ID
          </button>
          <button className="v-btn-secondary py-3 text-[10px] font-black tracking-widest bg-v-navy/30">
            GOOGLE
          </button>
        </div>
      </div>

      {/* Footer Link */}
      <p className="text-center text-xs text-v-white/40 font-medium tracking-tight">
        ¿Aún no eres agente operativo?{" "}
        <Link href="/register" className="text-v-red font-black uppercase hover:underline ml-1">
          Regístrate aquí
        </Link>
      </p>

      {/* Decorative HUD detail */}
      <div className="flex justify-center opacity-10">
         <div className="w-20 h-2 bg-v-red/50 skew-x-[-20deg]" />
         <div className="w-4 h-2 bg-v-red/50 skew-x-[-20deg] ml-2" />
      </div>
    </div>
  );
}
