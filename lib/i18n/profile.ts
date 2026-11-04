import type { MessageKey } from "./messages";

type Translator = (key: MessageKey, variables?: Record<string, string | number>) => string;

const titleKeys: Record<string, MessageKey> = {
  "Manager Novato": "profile.titleNovice",
  "Entrenador novato": "profile.titleNovice",
  Estratega: "profile.titleStrategist",
  "Caza-Cláusulas": "profile.titleClauseHunter",
  "Ojeador Maestro": "profile.titleMasterScout",
  "Magnate del E-sport": "profile.titleTycoon",
  "Referente del Fantasy": "profile.titleFantasyReference",
};

export function translateProfileTitle(title: string | null | undefined, t: Translator) {
  if (!title) return t("profile.titleNovice");
  const key = titleKeys[title];
  return key ? t(key) : title;
}
