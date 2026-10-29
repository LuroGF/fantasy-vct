"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "@/lib/actions/auth";
import { sileo } from "sileo";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signIn(formData);

    if (result?.error) {
      sileo.error({
        title: "Acceso denegado",
        description: result.error,
        duration: 3000,
      });

      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-v-navy">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <video
          className="h-full w-full scale-105 object-cover blur-md"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/hero-bg.png"
          aria-hidden="true"
        >
          <source
            src="/videos/aimers.mp4"
            type="video/mp4"
            media="(min-width: 640px) and (prefers-reduced-motion: no-preference)"
          />
        </video>
        <div className="absolute inset-0 bg-linear-to-b from-v-navy/55 via-v-navy/85 to-v-navy" />
      </div>

      <div className="relative z-10 min-h-screen w-full px-5 sm:px-6 py-10 sm:py-12 lg:grid lg:place-items-center">
        <div className="w-full max-w-md lg:max-w-lg">
          <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-v-red" />
                <h1 className="text-4xl sm:text-5xl italic tracking-tighter uppercase">
                  Iniciar sesión
                </h1>
              </div>
            </div>

            <div className="v-panel p-6 space-y-6">
              <form onSubmit={handleSubmit} className="grid gap-6">
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
                  <div className="pt-1 text-right">
                    <Link
                      href="/forgot-password"
                      className="text-[10px] font-black uppercase tracking-wider text-v-red hover:underline"
                    >
                      He olvidado mi contraseña
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="v-btn-primary w-full py-4 text-sm mt-4 shadow-xl shadow-v-red/20 cursor-pointer group disabled:opacity-50"
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

            </div>

            <p className="text-center text-xs text-v-white/40 font-medium tracking-tight">
              ¿Aún no tienes una cuenta?{" "}
              <Link
                href="/register"
                className="text-v-red font-black uppercase hover:underline ml-1"
              >
                Regístrate aquí
              </Link>
            </p>

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
