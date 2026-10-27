"use client";

import { useState } from "react";

import { updatePassword } from "@/lib/actions/auth";

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await updatePassword(new FormData(event.currentTarget));
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-5 py-12">
      <div>
        <h1 className="text-4xl italic uppercase">Nueva contraseña</h1>
        <p className="mt-2 text-sm text-v-white/50">
          Elige una contraseña de al menos ocho caracteres.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="v-panel grid gap-5 p-6">
        <label className="grid gap-2 text-[10px] font-black uppercase tracking-widest text-v-white/40">
          Nueva contraseña
          <input
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            className="h-14 border border-white/20 bg-v-navy/50 px-4 text-sm text-v-white outline-none focus:border-v-red"
          />
        </label>

        <label className="grid gap-2 text-[10px] font-black uppercase tracking-widest text-v-white/40">
          Repetir contraseña
          <input
            name="confirmation"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            className="h-14 border border-white/20 bg-v-navy/50 px-4 text-sm text-v-white outline-none focus:border-v-red"
          />
        </label>

        {error && <p className="text-xs font-bold text-v-red">{error}</p>}

        <button type="submit" disabled={loading} className="v-btn-primary py-4 disabled:opacity-50">
          {loading ? "GUARDANDO..." : "GUARDAR CONTRASEÑA"}
        </button>
      </form>
    </div>
  );
}
