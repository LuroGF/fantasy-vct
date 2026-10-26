/**
 * Interruptores de producto de la primera versión.
 *
 * Conservamos el código legado para retomarlo más adelante, pero ninguna de
 * estas funciones debe quedar accesible mientras su interruptor esté apagado.
 */
export const V1_FEATURES = {
  shop: false,
  powerUps: false,
  casters: false,
  legends: false,
  missions: false,
} as const;

export const V1_PAUSED_FEATURE_MESSAGE =
  "Esta función está pausada en la primera versión.";
