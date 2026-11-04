"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultLocale, isLocale, localeCookieName, type Locale } from "@/lib/i18n/config";
import { messages, type MessageKey } from "@/lib/i18n/messages";

type Variables = Record<string, string | number>;
type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, variables?: Variables) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale() {
  if (typeof document === "undefined") return defaultLocale;
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${localeCookieName}=`))
    ?.split("=")[1];
  return isLocale(cookie) ? cookie : defaultLocale;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const storedLocale = readStoredLocale();
    document.documentElement.lang = storedLocale;
    const timeoutId = window.setTimeout(() => updateLocale(storedLocale), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    updateLocale(nextLocale);
    document.documentElement.lang = nextLocale;
    document.cookie = `${localeCookieName}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, []);

  const t = useCallback(
    (key: MessageKey, variables: Variables = {}) => {
      const [group, name] = key.split(".") as ["nav" | "header", string];
      const groupMessages = messages[locale][group] as Record<string, string>;
      const fallbackMessages = messages[defaultLocale][group] as Record<string, string>;
      const template = groupMessages[name] || fallbackMessages[name] || key;
      return Object.entries(variables).reduce(
        (result, [variable, value]) => result.replaceAll(`{${variable}}`, String(value)),
        template,
      );
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}
