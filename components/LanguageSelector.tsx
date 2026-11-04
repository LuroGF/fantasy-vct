"use client";

import { Languages } from "lucide-react";
import { supportedLocales, type Locale } from "@/lib/i18n/config";
import { useLocale } from "./LocaleProvider";

const localeLabels: Record<Locale, string> = {
  es: "🇪🇸 ES",
  en: "🇬🇧 EN",
  fr: "🇫🇷 FR",
};

export function LanguageSelector() {
  const { locale, setLocale, t } = useLocale();

  return (
    <label
      className="relative flex h-9 items-center gap-1.5 rounded-sm border border-white/10 bg-white/5 px-2 text-white/60 transition hover:border-v-red/50 hover:text-white"
      title={t("header.language")}
    >
      <Languages className="hidden h-4 w-4 sm:block" aria-hidden="true" />
      <span className="sr-only">{t("header.language")}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        aria-label={t("header.language")}
        className="cursor-pointer appearance-none bg-transparent pr-0.5 text-[10px] font-black uppercase outline-none sm:pr-1"
      >
        {supportedLocales.map((item) => (
          <option key={item} value={item} className="bg-v-navy text-white">
            {localeLabels[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
