"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "@/lib/actions/auth";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await signIn(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

return (
  <div className="min-h-screen w-full bg-[#0b0f12]">
    {/* Fondo decorativo opcional */}
    <div className="pointer-events-none fixed inset-0 opacity-40">
      <div className="absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-v-red/20 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-[400px] w-[500px] bg-v-navy/40 blur-3xl" />
    </div>

    {/* Shell responsive */}
    <div className="relative min-h-screen w-full px-4 py-10 sm:px-8 sm:py-12 lg:grid lg:place-items-center">
      <div className="w-full max-w-md lg:max-w-lg">
        <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
          {/* Header Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-v-red" />
              <h1 className="text-4xl sm:text-5xl italic tracking-tighter uppercase">
                Identificarse
              </h1>
            </div>
            <p className="text-v-white/50 text-[10px] font-black uppercase tracking-[0.3em]">
              Autorización de Acceso Nivel 05
            </p>
          </div>

          {/* Form Container */}
          <div className="v-panel p-6 space-y-6">
            <form onSubmit={handleSubmit} className="grid gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-v-white/30 ml-1">
                  Protocolo Email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="tu@agencia.com"
                  className="w-full h-14 bg-v-navy/50 border border-white/5 px-5 text-sm font-medium focus:border-v-red outline-none transition-all placeholder:text-v-white/10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-v-white/30 ml-1">
                  Código de Seguridad
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full h-14 bg-v-navy/50 border border-white/5 px-5 text-sm font-medium focus:border-v-red outline-none transition-all placeholder:text-v-white/10"
                />
              </div>

              {error && (
                <div className="text-[10px] font-black uppercase text-v-red animate-pulse">
                  {">>>"} ACCESO DENEGADO: {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="v-btn-primary w-full py-4 text-sm mt-4 shadow-xl shadow-v-red/20 group disabled:opacity-50"
              >
                <span className="flex items-center justify-center gap-2">
                  {loading ? "VERIFICANDO..." : "Iniciar Sesión"}
                  {!loading && (
                    <svg
                      className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  )}
                </span>
              </button>
            </form>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/5"></span>
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-v-white/20">
                <span className="bg-[#0b0f12] px-4">Métodos Alternativos</span>
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
      </div>
    </div>
  </div>
);

}
