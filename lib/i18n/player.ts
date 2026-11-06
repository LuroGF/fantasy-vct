import type { MessageKey } from "./messages";

type Translator = (key: MessageKey, variables?: Record<string, string | number>) => string;

const roleKeys: Record<string, MessageKey> = {
  Duelista: "players.roleDuelist",
  Iniciador: "players.roleInitiator",
  Controlador: "players.roleController",
  Centinela: "players.roleSentinel",
  Flex: "players.roleFlex",
};

export function translatePlayerRole(role: string | null | undefined, t: Translator) {
  if (!role) return t("players.noRole");
  const key = roleKeys[role];
  return key ? t(key) : role;
}
