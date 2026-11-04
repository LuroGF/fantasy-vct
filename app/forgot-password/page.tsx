"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { requestPasswordReset } from "@/lib/actions/auth";
import { useLocale } from "@/components/LocaleProvider";
import { PublicLanguageSelector } from "@/components/PublicLanguageSelector";

function ForgotPasswordForm() {
  const { locale, t } = useLocale();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showInvalidLinkError, setShowInvalidLinkError] = useState(
    searchParams.get("error") === "invalid_or_expired_link",
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setShowInvalidLinkError(false);
    setMessage(null);

    const result = await requestPasswordReset(new FormData(event.currentTarget));
    if (!result.success) setError(result.error || t("auth.sendLinkFailed"));
    else setMessage(result.message || t("auth.checkEmail"));
    setLoading(false);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-5 py-12">
      <PublicLanguageSelector />
      <div>
        <h1 className="text-4xl italic uppercase">{t("auth.recoverTitle")}</h1>
        <p className="mt-2 text-sm text-v-white/50">
          {t("auth.recoverDescription")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="v-panel grid gap-5 p-6">
        <input type="hidden" name="locale" value={locale} />
        <label className="grid gap-2 text-[10px] font-black uppercase tracking-widest text-v-white/40">
          {t("auth.email")}
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-14 border border-white/20 bg-v-navy/50 px-4 text-sm text-v-white outline-none focus:border-v-red"
          />
        </label>

        {(error || showInvalidLinkError) && (
          <p className="text-xs font-bold text-v-red">
            {error || t("auth.invalidLink")}
          </p>
        )}
        {message && (
          <p role="status" className="text-xs font-bold leading-relaxed text-emerald-300">
            {message}
          </p>
        )}

        <button type="submit" disabled={loading} className="v-btn-primary py-4 disabled:opacity-50">
          {loading ? t("auth.sending").toUpperCase() : t("auth.sendLink").toUpperCase()}
        </button>
      </form>

      <Link href="/login" className="text-center text-xs font-black uppercase text-v-red hover:underline">
        {t("auth.backToSignIn")}
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
