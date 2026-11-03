"use client";

import { useState } from "react";
import { deleteAccount } from "@/lib/actions/auth";

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await deleteAccount(new FormData(event.currentTarget));

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <section className="v-panel border-v-red/20 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black italic uppercase text-v-red">
            Eliminar cuenta
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-v-white/45">
            El borrado es definitivo. Abandonarás tus ligas, se transferirá el
            liderazgo cuando corresponda y se eliminarán tu perfil, plantillas,
            pujas y notificaciones.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="v-btn-secondary shrink-0 border-v-red/30 px-5 py-3 text-[9px] text-v-red"
          >
            Eliminar mi cuenta
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 border-t border-white/5 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-v-white/40">
                Contraseña actual
              </span>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="h-12 w-full border border-white/15 bg-v-navy/60 px-4 text-sm outline-none focus:border-v-red"
              />
            </label>
            <label className="space-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-v-white/40">
                Escribe ELIMINAR
              </span>
              <input
                type="text"
                name="confirmation"
                required
                autoComplete="off"
                className="h-12 w-full border border-white/15 bg-v-navy/60 px-4 text-sm uppercase outline-none focus:border-v-red"
              />
            </label>
          </div>

          {error && (
            <p role="alert" className="text-xs font-bold text-v-red">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="v-btn-secondary px-5 py-3 text-[9px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-v-red px-5 py-3 text-[9px] font-black uppercase text-white disabled:cursor-wait disabled:opacity-50"
            >
              {loading ? "Eliminando…" : "Eliminar definitivamente"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
