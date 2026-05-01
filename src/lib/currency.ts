/**
 * Location-based currency detection
 * Uses the browser's timezone and language to infer the user's currency.
 * Falls back to USD if unknown.
 */

export interface CurrencyInfo {
  code: string;       // ISO 4217 e.g. "USD"
  symbol: string;     // e.g. "$"
  name: string;       // e.g. "US Dollar"
  locale: string;     // e.g. "en-US"
  countryCode: string; // ISO 3166-1 alpha-2 e.g. "US"
}

// Timezone prefix → currency mapping (covers most common cases)
const TIMEZONE_CURRENCY: Record<string, CurrencyInfo> = {
  "America/New_York":       { code: "USD", symbol: "$",   name: "US Dollar",        locale: "en-US", countryCode: "US" },
  "America/Chicago":        { code: "USD", symbol: "$",   name: "US Dollar",        locale: "en-US", countryCode: "US" },
  "America/Denver":         { code: "USD", symbol: "$",   name: "US Dollar",        locale: "en-US", countryCode: "US" },
  "America/Los_Angeles":    { code: "USD", symbol: "$",   name: "US Dollar",        locale: "en-US", countryCode: "US" },
  "America/Phoenix":        { code: "USD", symbol: "$",   name: "US Dollar",        locale: "en-US", countryCode: "US" },
  "America/Toronto":        { code: "CAD", symbol: "CA$", name: "Canadian Dollar",  locale: "en-CA", countryCode: "CA" },
  "America/Vancouver":      { code: "CAD", symbol: "CA$", name: "Canadian Dollar",  locale: "en-CA", countryCode: "CA" },
  "America/Sao_Paulo":      { code: "BRL", symbol: "R$",  name: "Brazilian Real",   locale: "pt-BR", countryCode: "BR" },
  "America/Mexico_City":    { code: "MXN", symbol: "MX$", name: "Mexican Peso",     locale: "es-MX", countryCode: "MX" },
  "America/Argentina/Buenos_Aires": { code: "ARS", symbol: "$", name: "Argentine Peso", locale: "es-AR", countryCode: "AR" },
  "Europe/London":          { code: "GBP", symbol: "£",   name: "British Pound",    locale: "en-GB", countryCode: "GB" },
  "Europe/Paris":           { code: "EUR", symbol: "€",   name: "Euro",             locale: "fr-FR", countryCode: "FR" },
  "Europe/Berlin":          { code: "EUR", symbol: "€",   name: "Euro",             locale: "de-DE", countryCode: "DE" },
  "Europe/Madrid":          { code: "EUR", symbol: "€",   name: "Euro",             locale: "es-ES", countryCode: "ES" },
  "Europe/Rome":            { code: "EUR", symbol: "€",   name: "Euro",             locale: "it-IT", countryCode: "IT" },
  "Europe/Amsterdam":       { code: "EUR", symbol: "€",   name: "Euro",             locale: "nl-NL", countryCode: "NL" },
  "Europe/Stockholm":       { code: "SEK", symbol: "kr",  name: "Swedish Krona",    locale: "sv-SE", countryCode: "SE" },
  "Europe/Oslo":            { code: "NOK", symbol: "kr",  name: "Norwegian Krone",  locale: "nb-NO", countryCode: "NO" },
  "Europe/Copenhagen":      { code: "DKK", symbol: "kr",  name: "Danish Krone",     locale: "da-DK", countryCode: "DK" },
  "Europe/Warsaw":          { code: "PLN", symbol: "zł",  name: "Polish Zloty",     locale: "pl-PL", countryCode: "PL" },
  "Europe/Zurich":          { code: "CHF", symbol: "CHF", name: "Swiss Franc",      locale: "de-CH", countryCode: "CH" },
  "Europe/Moscow":          { code: "RUB", symbol: "₽",   name: "Russian Ruble",    locale: "ru-RU", countryCode: "RU" },
  "Asia/Tokyo":             { code: "JPY", symbol: "¥",   name: "Japanese Yen",     locale: "ja-JP", countryCode: "JP" },
  "Asia/Shanghai":          { code: "CNY", symbol: "¥",   name: "Chinese Yuan",     locale: "zh-CN", countryCode: "CN" },
  "Asia/Hong_Kong":         { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", locale: "zh-HK", countryCode: "HK" },
  "Asia/Seoul":             { code: "KRW", symbol: "₩",   name: "South Korean Won", locale: "ko-KR", countryCode: "KR" },
  "Asia/Singapore":         { code: "SGD", symbol: "S$",  name: "Singapore Dollar", locale: "en-SG", countryCode: "SG" },
  "Asia/Kolkata":           { code: "INR", symbol: "₹",   name: "Indian Rupee",     locale: "en-IN", countryCode: "IN" },
  "Asia/Dubai":             { code: "AED", symbol: "د.إ", name: "UAE Dirham",        locale: "ar-AE", countryCode: "AE" },
  "Asia/Riyadh":            { code: "SAR", symbol: "﷼",   name: "Saudi Riyal",      locale: "ar-SA", countryCode: "SA" },
  "Asia/Karachi":           { code: "PKR", symbol: "₨",   name: "Pakistani Rupee",  locale: "ur-PK", countryCode: "PK" },
  "Asia/Dhaka":             { code: "BDT", symbol: "৳",   name: "Bangladeshi Taka", locale: "bn-BD", countryCode: "BD" },
  "Asia/Bangkok":           { code: "THB", symbol: "฿",   name: "Thai Baht",        locale: "th-TH", countryCode: "TH" },
  "Asia/Jakarta":           { code: "IDR", symbol: "Rp",  name: "Indonesian Rupiah",locale: "id-ID", countryCode: "ID" },
  "Asia/Manila":            { code: "PHP", symbol: "₱",   name: "Philippine Peso",  locale: "en-PH", countryCode: "PH" },
  "Asia/Kuala_Lumpur":      { code: "MYR", symbol: "RM",  name: "Malaysian Ringgit",locale: "ms-MY", countryCode: "MY" },
  "Asia/Taipei":            { code: "TWD", symbol: "NT$", name: "New Taiwan Dollar", locale: "zh-TW", countryCode: "TW" },
  "Australia/Sydney":       { code: "AUD", symbol: "A$",  name: "Australian Dollar",locale: "en-AU", countryCode: "AU" },
  "Australia/Melbourne":    { code: "AUD", symbol: "A$",  name: "Australian Dollar",locale: "en-AU", countryCode: "AU" },
  "Pacific/Auckland":       { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar",locale: "en-NZ", countryCode: "NZ" },
  "Africa/Accra":           { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi",    locale: "en-GH", countryCode: "GH" },
  "Africa/Lagos":           { code: "NGN", symbol: "₦",   name: "Nigerian Naira",   locale: "en-NG", countryCode: "NG" },
  "Africa/Nairobi":         { code: "KES", symbol: "KSh", name: "Kenyan Shilling",  locale: "en-KE", countryCode: "KE" },
  "Africa/Johannesburg":    { code: "ZAR", symbol: "R",   name: "South African Rand",locale: "en-ZA", countryCode: "ZA" },
  "Africa/Cairo":           { code: "EGP", symbol: "E£",  name: "Egyptian Pound",   locale: "ar-EG", countryCode: "EG" },
};

const DEFAULT_CURRENCY: CurrencyInfo = {
  code: "USD", symbol: "$", name: "US Dollar", locale: "en-US", countryCode: "US",
};

/** Detect currency from browser timezone */
export function detectCurrency(): CurrencyInfo {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONE_CURRENCY[tz]) return TIMEZONE_CURRENCY[tz];

    // Try prefix match (e.g. "America/Indiana/Indianapolis" → "America/")
    const prefix = tz.split("/")[0];
    const match = Object.entries(TIMEZONE_CURRENCY).find(([k]) => k.startsWith(prefix));
    if (match) return match[1];
  } catch {
    // Intl not available
  }
  return DEFAULT_CURRENCY;
}

/** Format a price with the correct currency symbol and locale */
export function formatPrice(amount: number, currency?: CurrencyInfo): string {
  const c = currency || detectCurrency();
  try {
    return new Intl.NumberFormat(c.locale, {
      style: "currency",
      currency: c.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${c.symbol}${amount.toFixed(2)}`;
  }
}

/** Get the ISO country code for the current user (for CJ shipping) */
export function detectCountryCode(): string {
  return detectCurrency().countryCode;
}

// Singleton so we only compute once per session
let _cached: CurrencyInfo | null = null;
export function getCurrency(): CurrencyInfo {
  if (!_cached) _cached = detectCurrency();
  return _cached;
}
