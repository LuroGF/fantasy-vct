import "server-only";

import { cookies } from "next/headers";
import { defaultLocale, isLocale, localeCookieName } from "./config";
import { translateMessage, type MessageKey } from "./messages";

export async function getServerLocale() {
  const cookieStore = await cookies();
  const value = cookieStore.get(localeCookieName)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function getServerTranslator() {
  const locale = await getServerLocale();
  return {
    locale,
    t: (key: MessageKey, variables?: Record<string, string | number>) =>
      translateMessage(locale, key, variables),
  };
}
