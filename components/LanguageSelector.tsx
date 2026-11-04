"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Languages } from "lucide-react";
import { supportedLocales, type Locale } from "@/lib/i18n/config";
import { useLocale } from "./LocaleProvider";

const localeLabels: Record<Locale, string> = { es: "ES", en: "EN", fr: "FR" };

function Flag({ locale }: { locale: Locale }) {
  if (locale === "es") {
    return (
      <svg viewBox="0 0 24 16" aria-hidden="true" className="h-3.5 w-5 overflow-hidden rounded-[2px] shadow-sm">
        <rect width="24" height="16" fill="#aa151b" />
        <rect y="4" width="24" height="8" fill="#f1bf00" />
      </svg>
    );
  }

  if (locale === "fr") {
    return (
      <svg viewBox="0 0 24 16" aria-hidden="true" className="h-3.5 w-5 overflow-hidden rounded-[2px] shadow-sm">
        <rect width="8" height="16" fill="#002395" />
        <rect x="8" width="8" height="16" fill="#fff" />
        <rect x="16" width="8" height="16" fill="#ed2939" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 16" aria-hidden="true" className="h-3.5 w-5 overflow-hidden rounded-[2px] shadow-sm">
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0 24 16M24 0 0 16" stroke="#fff" strokeWidth="3.4" />
      <path d="M0 0 24 16M24 0 0 16" stroke="#c8102e" strokeWidth="1.4" />
      <path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="5" />
      <path d="M12 0v16M0 8h24" stroke="#c8102e" strokeWidth="2.6" />
    </svg>
  );
}

export function LanguageSelector() {
  const { locale, setLocale, t } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function chooseLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    setOpen(false);
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={t("header.language")}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t("header.language")}
        className="flex h-9 cursor-pointer items-center gap-1.5 rounded-sm border border-white/10 bg-white/5 px-2 text-white/60 transition hover:border-v-red/50 hover:text-white"
      >
        <Languages className="hidden h-4 w-4 sm:block" aria-hidden="true" />
        <Flag locale={locale} />
        <span className="text-[10px] font-black uppercase">{localeLabels[locale]}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t("header.language")}
          className="absolute left-0 top-full z-60 mt-2 min-w-28 overflow-hidden border border-white/10 bg-v-navy shadow-2xl"
        >
          {supportedLocales.map((item) => (
            <button
              key={item}
              type="button"
              role="option"
              aria-selected={item === locale}
              onClick={() => chooseLocale(item)}
              className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-[10px] font-black uppercase transition ${
                item === locale
                  ? "bg-v-red text-white"
                  : "text-white/65 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Flag locale={item} />
              <span className="flex-1">{localeLabels[item]}</span>
              {item === locale && <Check className="h-3 w-3" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
