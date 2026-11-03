"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  deleteAccount,
  verifyAccountDeletionPassword,
} from "@/lib/actions/auth";

type Step = "closed" | "password" | "confirm";

export function DeleteAccountSection() {
  const [step, setStep] = useState<Step>("closed");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeModal = useCallback(() => {
    if (loading) return;
    setStep("closed");
    setPassword("");
    setConfirmation("");
    setError(null);
  }, [loading]);

  useEffect(() => {
    if (step === "closed") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeModal();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [step, closeModal]);

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("password", password);
    const result = await verifyAccountDeletionPassword(formData);

    setLoading(false);
    if (!result.success) {
      setError(result.error || "No se ha podido comprobar la contraseña.");
      return;
    }

    setStep("confirm");
  }

  async function handleDeletionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("password", password);
    formData.set("confirmation", confirmation);
    const result = await deleteAccount(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  const modal = step !== "closed" && (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        className="v-panel w-full max-w-lg border-v-red/30 p-6 shadow-2xl"
      >
        {step === "password" ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-v-red">Paso 1 de 2</p>
              <h2 id="delete-account-title" className="mt-2 text-2xl font-black italic uppercase">
                Confirma tu identidad
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-v-white/45">
                Introduce tu contraseña actual antes de continuar con la eliminación.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-v-white/40">Contraseña actual</span>
              <input
                type="password"
                required
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full border border-white/15 bg-v-navy/60 px-4 text-sm outline-none focus:border-v-red"
              />
            </label>

            {error && <p role="alert" className="text-xs font-bold text-v-red">{error}</p>}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" disabled={loading} onClick={closeModal} className="v-btn-secondary px-5 py-3 text-[9px]">
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="v-btn-primary px-5 py-3 text-[9px] disabled:cursor-wait disabled:opacity-50">
                {loading ? "Comprobando…" : "Continuar"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleDeletionSubmit} className="space-y-5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-v-red">Paso 2 de 2</p>
              <h2 id="delete-account-title" className="mt-2 text-2xl font-black italic uppercase text-v-red">
                Esta acción es definitiva
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-v-white/55">
                Se eliminarán tu cuenta, perfil, plantillas, pujas y notificaciones. Abandonarás todas tus ligas y el liderazgo se transferirá cuando corresponda.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-v-white/40">
                Escribe ELIMINAR para continuar
              </span>
              <input
                type="text"
                required
                autoFocus
                autoComplete="off"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="h-12 w-full border border-v-red/30 bg-v-navy/60 px-4 text-sm uppercase outline-none focus:border-v-red"
              />
            </label>

            {error && <p role="alert" className="text-xs font-bold text-v-red">{error}</p>}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" disabled={loading} onClick={closeModal} className="v-btn-secondary px-5 py-3 text-[9px]">
                Conservar mi cuenta
              </button>
              <button
                type="submit"
                disabled={loading || confirmation.trim().toUpperCase() !== "ELIMINAR"}
                className="bg-v-red px-5 py-3 text-[9px] font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? "Eliminando…" : "Eliminar definitivamente"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return (
    <>
      <section className="v-panel border-v-red/20 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black italic uppercase text-v-red">Eliminar cuenta</h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-v-white/45">
              El borrado es definitivo y elimina todos los datos asociados a tu cuenta.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStep("password")}
            className="v-btn-secondary shrink-0 border-v-red/30 px-5 py-3 text-[9px] text-v-red"
          >
            Eliminar mi cuenta
          </button>
        </div>
      </section>
      {typeof document !== "undefined" && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
