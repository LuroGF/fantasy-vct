export const supportedLocales = ["es", "en", "fr"] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "es";
export const localeCookieName = "vfantasy-locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return supportedLocales.includes(value as Locale);
}
