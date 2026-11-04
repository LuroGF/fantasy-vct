"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  deleteAccount,
  verifyAccountDeletionPassword,
} from "@/lib/actions/auth";
import { useLocale } from "@/components/LocaleProvider";

type Step = "closed" | "password" | "confirm";

export function DeleteAccountSection() {
  const { locale, t } = useLocale();
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
    formData.set("locale", locale);
    const result = await verifyAccountDeletionPassword(formData);

    setLoading(false);
    if (!result.success) {
      setError(result.error || t("profile.passwordCheckFailed"));
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
    formData.set("locale", locale);
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
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-v-red">{t("profile.stepOne")}</p>
              <h2 id="delete-account-title" className="mt-2 text-2xl font-black italic uppercase">
                {t("profile.confirmIdentity")}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-v-white/45">
                {t("profile.passwordPrompt")}
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-v-white/40">{t("profile.currentPassword")}</span>
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
                {t("profile.cancel")}
              </button>
              <button type="submit" disabled={loading} className="v-btn-primary px-5 py-3 text-[9px] disabled:cursor-wait disabled:opacity-50">
                {loading ? t("profile.checking") : t("profile.continue")}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleDeletionSubmit} className="space-y-5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-v-red">{t("profile.stepTwo")}</p>
              <h2 id="delete-account-title" className="mt-2 text-2xl font-black italic uppercase text-v-red">
                {t("profile.definitive")}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-v-white/55">
                {t("profile.deletionConsequences")}
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-v-white/40">
                {t("profile.typeDelete")}
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
                {t("profile.keepAccount")}
              </button>
              <button
                type="submit"
                disabled={loading || confirmation.trim().toUpperCase() !== "ELIMINAR"}
                className="bg-v-red px-5 py-3 text-[9px] font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? t("profile.deleting") : t("profile.deleteForever")}
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
            <h2 className="text-lg font-black italic uppercase text-v-red">{t("profile.deleteAccount")}</h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-v-white/45">
              {t("profile.deleteSummary")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStep("password")}
            className="v-btn-secondary shrink-0 border-v-red/30 px-5 py-3 text-[9px] text-v-red"
          >
            {t("profile.deleteMine")}
          </button>
        </div>
      </section>
      {typeof document !== "undefined" && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
