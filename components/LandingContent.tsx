"use client";

import Link from "next/link";
import { useLocale } from "./LocaleProvider";

export function LandingContent() {
  const { t } = useLocale();

  return (
    <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 px-6 py-12 text-center">
      <div className="animate-bounce-subtle">
        <div className="-skew-x-12 bg-v-red px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-white shadow-lg shadow-v-red/50">
          {t("landing.earlyAccess")}
        </div>
      </div>

      <div className="space-y-2 pt">
        <h1 className="pb-8 text-6xl font-black italic leading-none tracking-tighter text-v-white underline-offset-8 decoration-v-red decoration-4 sm:text-7xl">
          VFantasy
        </h1>
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-v-white/50">{t("landing.createDreamTeam")}</p>
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-v-white/50">{t("landing.competeFriends")}</p>
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-v-white/50">{t("landing.win")}</p>
      </div>

      <div className="h-1 w-12 bg-v-red/50" />
      <div className="mt-4 flex w-full flex-col gap-4">
        <Link href="/login" className="v-btn-primary group py-4 text-sm shadow-2xl shadow-v-red/20">
          <span className="relative z-10 flex items-center justify-center gap-2">
            {t("landing.signIn")}
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
          </span>
        </Link>
        <Link href="/register" className="v-btn-secondary py-4 text-sm">{t("landing.createAccount")}</Link>
      </div>
    </div>
  );
}
