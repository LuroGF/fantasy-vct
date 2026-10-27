const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isMoneyAmount(
  value: unknown,
  options: { allowNegative?: boolean; max?: number } = {},
): value is number {
  const minimum = options.allowNegative ? -(options.max ?? 1_000_000_000) : 0;
  const maximum = options.max ?? 1_000_000_000;
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

export function cleanPlainText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  return cleaned.slice(0, maxLength);
}
