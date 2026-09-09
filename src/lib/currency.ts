export const SUPPORTED_CURRENCIES = ["EGP"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function normalizeCurrencyCode(value: string) {
  return value.trim().toUpperCase();
}

export function isValidCurrencyCode(
  value: string
): value is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(
    normalizeCurrencyCode(value) as SupportedCurrency
  );
}
