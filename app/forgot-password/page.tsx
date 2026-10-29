"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { requestPasswordReset } from "@/lib/actions/auth";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    searchParams.get("error") === "invalid_or_expired_link"
      ? "El enlace no es válido o ha caducado. Solicita uno nuevo."
      : null,
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await requestPasswordReset(new FormData(event.currentTarget));
    if (!result.success) setError(result.error || "No se ha podido enviar el enlace.");
    else setMessage(result.message || "Revisa tu correo.");
    setLoading(false);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-5 py-12">
      <div>
        <h1 className="text-4xl italic uppercase">Recuperar contraseña</h1>
        <p className="mt-2 text-sm text-v-white/50">
          Te enviaremos un enlace seguro para establecer una contraseña nueva.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="v-panel grid gap-5 p-6">
        <label className="grid gap-2 text-[10px] font-black uppercase tracking-widest text-v-white/40">
          Correo
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-14 border border-white/20 bg-v-navy/50 px-4 text-sm text-v-white outline-none focus:border-v-red"
          />
        </label>

        {error && <p className="text-xs font-bold text-v-red">{error}</p>}
        {message && (
          <p role="status" className="text-xs font-bold leading-relaxed text-emerald-300">
            {message}
          </p>
        )}

        <button type="submit" disabled={loading} className="v-btn-primary py-4 disabled:opacity-50">
          {loading ? "ENVIANDO..." : "ENVIAR ENLACE"}
        </button>
      </form>

      <Link href="/login" className="text-center text-xs font-black uppercase text-v-red hover:underline">
        Volver a iniciar sesión
      </Link>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-v-navy" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
