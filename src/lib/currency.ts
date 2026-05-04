/**
 * Location-based currency detection + live exchange rate conversion
 *
 * All prices in the database are stored in USD (CJ Dropshipping prices).
 * This module detects the user's local currency and converts USD prices
 * to their local currency using live exchange rates.
 */

export interface CurrencyInfo {
  code: string;        // ISO 4217 e.g. "USD"
  symbol: string;      // e.g. "$"
  name: string;        // e.g. "US Dollar"
  locale: string;      // e.g. "en-US"
  countryCode: string; // ISO 3166-1 alpha-2 e.g. "US"
}

const TIMEZONE_CURRENCY: Record<string, CurrencyInfo> = {
  "America/New_York":       { code: "USD", symbol: "$",    name: "US Dollar",         locale: "en-US", countryCode: "US" },
  "America/Chicago":        { code: "USD", symbol: "$",    name: "US Dollar",         locale: "en-US", countryCode: "US" },
  "America/Denver":         { code: "USD", symbol: "$",    name: "US Dollar",         locale: "en-US", countryCode: "US" },
  "America/Los_Angeles":    { code: "USD", symbol: "$",    name: "US Dollar",         locale: "en-US", countryCode: "US" },
  "America/Phoenix":        { code: "USD", symbol: "$",    name: "US Dollar",         locale: "en-US", countryCode: "US" },
  "America/Toronto":        { code: "CAD", symbol: "CA$",  name: "Canadian Dollar",   locale: "en-CA", countryCode: "CA" },
  "America/Vancouver":      { code: "CAD", symbol: "CA$",  name: "Canadian Dollar",   locale: "en-CA", countryCode: "CA" },
  "America/Sao_Paulo":      { code: "BRL", symbol: "R$",   name: "Brazilian Real",    locale: "pt-BR", countryCode: "BR" },
  "America/Mexico_City":    { code: "MXN", symbol: "MX$",  name: "Mexican Peso",      locale: "es-MX", countryCode: "MX" },
  "America/Argentina/Buenos_Aires": { code: "ARS", symbol: "$", name: "Argentine Peso", locale: "es-AR", countryCode: "AR" },
  "Europe/London":          { code: "GBP", symbol: "£",    name: "British Pound",     locale: "en-GB", countryCode: "GB" },
  "Europe/Paris":           { code: "EUR", symbol: "€",    name: "Euro",              locale: "fr-FR", countryCode: "FR" },
  "Europe/Berlin":          { code: "EUR", symbol: "€",    name: "Euro",              locale: "de-DE", countryCode: "DE" },
  "Europe/Madrid":          { code: "EUR", symbol: "€",    name: "Euro",              locale: "es-ES", countryCode: "ES" },
  "Europe/Rome":            { code: "EUR", symbol: "€",    name: "Euro",              locale: "it-IT", countryCode: "IT" },
  "Europe/Amsterdam":       { code: "EUR", symbol: "€",    name: "Euro",              locale: "nl-NL", countryCode: "NL" },
  "Europe/Stockholm":       { code: "SEK", symbol: "kr",   name: "Swedish Krona",     locale: "sv-SE", countryCode: "SE" },
  "Europe/Oslo":            { code: "NOK", symbol: "kr",   name: "Norwegian Krone",   locale: "nb-NO", countryCode: "NO" },
  "Europe/Copenhagen":      { code: "DKK", symbol: "kr",   name: "Danish Krone",      locale: "da-DK", countryCode: "DK" },
  "Europe/Warsaw":          { code: "PLN", symbol: "zł",   name: "Polish Zloty",      locale: "pl-PL", countryCode: "PL" },
  "Europe/Zurich":          { code: "CHF", symbol: "CHF",  name: "Swiss Franc",       locale: "de-CH", countryCode: "CH" },
  "Europe/Moscow":          { code: "RUB", symbol: "₽",    name: "Russian Ruble",     locale: "ru-RU", countryCode: "RU" },
  "Asia/Tokyo":             { code: "JPY", symbol: "¥",    name: "Japanese Yen",      locale: "ja-JP", countryCode: "JP" },
  "Asia/Shanghai":          { code: "CNY", symbol: "¥",    name: "Chinese Yuan",      locale: "zh-CN", countryCode: "CN" },
  "Asia/Hong_Kong":         { code: "HKD", symbol: "HK$",  name: "Hong Kong Dollar",  locale: "zh-HK", countryCode: "HK" },
  "Asia/Seoul":             { code: "KRW", symbol: "₩",    name: "South Korean Won",  locale: "ko-KR", countryCode: "KR" },
  "Asia/Singapore":         { code: "SGD", symbol: "S$",   name: "Singapore Dollar",  locale: "en-SG", countryCode: "SG" },
  "Asia/Kolkata":           { code: "INR", symbol: "₹",    name: "Indian Rupee",      locale: "en-IN", countryCode: "IN" },
  "Asia/Dubai":             { code: "AED", symbol: "د.إ",  name: "UAE Dirham",         locale: "ar-AE", countryCode: "AE" },
  "Asia/Riyadh":            { code: "SAR", symbol: "﷼",    name: "Saudi Riyal",       locale: "ar-SA", countryCode: "SA" },
  "Asia/Karachi":           { code: "PKR", symbol: "₨",    name: "Pakistani Rupee",   locale: "ur-PK", countryCode: "PK" },
  "Asia/Dhaka":             { code: "BDT", symbol: "৳",    name: "Bangladeshi Taka",  locale: "bn-BD", countryCode: "BD" },
  "Asia/Bangkok":           { code: "THB", symbol: "฿",    name: "Thai Baht",         locale: "th-TH", countryCode: "TH" },
  "Asia/Jakarta":           { code: "IDR", symbol: "Rp",   name: "Indonesian Rupiah", locale: "id-ID", countryCode: "ID" },
  "Asia/Manila":            { code: "PHP", symbol: "₱",    name: "Philippine Peso",   locale: "en-PH", countryCode: "PH" },
  "Asia/Kuala_Lumpur":      { code: "MYR", symbol: "RM",   name: "Malaysian Ringgit", locale: "ms-MY", countryCode: "MY" },
  "Asia/Taipei":            { code: "TWD", symbol: "NT$",  name: "New Taiwan Dollar", locale: "zh-TW", countryCode: "TW" },
  "Australia/Sydney":       { code: "AUD", symbol: "A$",   name: "Australian Dollar", locale: "en-AU", countryCode: "AU" },
  "Australia/Melbourne":    { code: "AUD", symbol: "A$",   name: "Australian Dollar", locale: "en-AU", countryCode: "AU" },
  "Pacific/Auckland":       { code: "NZD", symbol: "NZ$",  name: "New Zealand Dollar",locale: "en-NZ", countryCode: "NZ" },
  "Africa/Accra":           { code: "GHS", symbol: "GH₵",  name: "Ghanaian Cedi",     locale: "en-GH", countryCode: "GH" },
  "Africa/Lagos":           { code: "NGN", symbol: "₦",    name: "Nigerian Naira",    locale: "en-NG", countryCode: "NG" },
  "Africa/Nairobi":         { code: "KES", symbol: "KSh",  name: "Kenyan Shilling",   locale: "en-KE", countryCode: "KE" },
  "Africa/Johannesburg":    { code: "ZAR", symbol: "R",    name: "South African Rand",locale: "en-ZA", countryCode: "ZA" },
  "Africa/Cairo":           { code: "EGP", symbol: "E£",   name: "Egyptian Pound",    locale: "ar-EG", countryCode: "EG" },
};

const DEFAULT_CURRENCY: CurrencyInfo = {
  code: "USD", symbol: "$", name: "US Dollar", locale: "en-US", countryCode: "US",
};

export function detectCurrency(): CurrencyInfo {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONE_CURRENCY[tz]) return TIMEZONE_CURRENCY[tz];
    const prefix = tz.split("/")[0];
    const match = Object.entries(TIMEZONE_CURRENCY).find(([k]) => k.startsWith(prefix));
    if (match) return match[1];
  } catch { /* Intl not available */ }
  return DEFAULT_CURRENCY;
}

export function detectCountryCode(): string {
  return detectCurrency().countryCode;
}

/**
 * Format a USD price into the user's local currency.
 * @param usdAmount  Price in USD (as stored in the database)
 * @param currency   The user's detected currency
 * @param rate       Exchange rate: 1 USD = X local currency units
 */
export function formatPrice(usdAmount: number, currency: CurrencyInfo, rate = 1): string {
  const localAmount = usdAmount * rate;
  try {
    return new Intl.NumberFormat(currency.locale, {
      style: "currency",
      currency: currency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(localAmount);
  } catch {
    return `${currency.symbol}${localAmount.toFixed(2)}`;
  }
}

let _cached: CurrencyInfo | null = null;
export function getCurrency(): CurrencyInfo {
  if (!_cached) _cached = detectCurrency();
  return _cached;
}
