"use client";

import Link from "next/link";
import { useState } from "react";
import { signUp } from "@/lib/actions/auth";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    if (!formData.get("legalAccepted")) {
      setError("Debes aceptar las condiciones de uso y el aviso legal");
      setLoading(false);
      return;
    }

    const result = await signUp(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
  }

  return (
    <div className="mx-auto w-full max-w-md sm:max-w-lg lg:max-w-xl px-5 sm:px-6 flex flex-col gap-10 py-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-v-red" />
          <h1 className="text-5xl italic tracking-tighter text-v-white uppercase">
            Crear cuenta
          </h1>
        </div>
        <p className="text-v-white/50 text-[10px] font-black uppercase tracking-[0.3em]">
          Únete al Fantasy VCT
        </p>
      </div>

      {/* Form Container */}
      <div className="v-panel p-6 space-y-6">
        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-v-white/30 ml-1">
              Nombre de usuario
            </label>
            <input
              name="username"
              type="text"
              required
              placeholder="Usuario"
              className="w-full h-14 bg-v-navy/50 border border-white/40 px-5 text-sm font-medium focus:border-v-red outline-none transition-all placeholder:text-v-white/10"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-v-white/30 ml-1">
              Correo
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="tu@correo.com"
              className="w-full h-14 bg-v-navy/50 border border-white/40 px-5 text-sm font-medium focus:border-v-red outline-none transition-all placeholder:text-v-white/10"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-v-white/30 ml-1">
              Contraseña
            </label>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full h-14 bg-v-navy/50 border border-white/40 px-5 text-sm font-medium focus:border-v-red outline-none transition-all placeholder:text-v-white/10"
            />
          </div>

          <label className="flex items-start gap-3 text-xs text-v-white/70 leading-relaxed cursor-pointer">
            <input
              name="legalAccepted"
              type="checkbox"
              value="true"
              required
              className="mt-0.5 h-4 w-4 shrink-0 accent-red-600 cursor-pointer"
            />
            <span>
              Acepto las condiciones de uso y el{" "}
              <Link
                href="/aviso-legal"
                target="_blank"
                rel="noopener noreferrer"
                className="text-v-red font-black hover:underline"
              >
                Aviso Legal
              </Link>
            </span>
          </label>

          {error && (
            <div className="text-[10px] font-black uppercase text-v-red animate-pulse">
              {">>>"} ERROR: {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="v-btn-primary cursor-pointer w-full py-4 text-sm mt-4 shadow-xl shadow-v-red/20 group disabled:opacity-50"
          >
            <span className="flex items-center justify-center gap-2">
              {loading ? "PROCESANDO..." : "Crear cuenta"}
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

      </div>

      {/* Footer Link */}
      <p className="text-center text-xs text-v-white/40 font-medium tracking-tight">
        ¿Ya tienes una cuenta?{" "}
        <Link
          href="/login"
          className="text-v-red font-black cursor-pointer uppercase hover:underline ml-1"
        >
          Inicia sesión
        </Link>
      </p>

      {/* Decorative HUD detail */}
      {/* <div className="flex justify-center opacity-10">
        <div className="w-4 h-2 bg-v-red/50 skew-x-[-20deg]" />
        <div className="w-20 h-2 bg-v-red/50 skew-x-[-20deg] ml-2" />
      </div> */}
    </div>
  );
}
