import { createContext, useContext, useState, useEffect } from "react";
import { detectCurrency, formatPrice, type CurrencyInfo } from "@/lib/currency";

interface CurrencyContextType {
  currency: CurrencyInfo;
  rate: number;        // 1 USD = X local currency units
  fmt: (usdAmount: number) => string;
  rateLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Cache exchange rates for 1 hour in sessionStorage
const RATE_CACHE_KEY = "trends_fx_rate";
const RATE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCachedRate(currencyCode: string): number | null {
  try {
    const raw = sessionStorage.getItem(RATE_CACHE_KEY);
    if (!raw) return null;
    const { code, rate, ts } = JSON.parse(raw);
    if (code === currencyCode && Date.now() - ts < RATE_CACHE_TTL) return rate;
  } catch { /* ignore */ }
  return null;
}

function setCachedRate(currencyCode: string, rate: number) {
  try {
    sessionStorage.setItem(RATE_CACHE_KEY, JSON.stringify({ code: currencyCode, rate, ts: Date.now() }));
  } catch { /* ignore */ }
}

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [currency] = useState<CurrencyInfo>(detectCurrency);
  const [rate, setRate] = useState<number>(1);
  const [rateLoading, setRateLoading] = useState(true);

  useEffect(() => {
    // USD needs no conversion
    if (currency.code === "USD") {
      setRate(1);
      setRateLoading(false);
      return;
    }

    // Check cache first
    const cached = getCachedRate(currency.code);
    if (cached) {
      setRate(cached);
      setRateLoading(false);
      return;
    }

    // Fetch live rate from open.er-api.com (free, no key needed)
    fetch(`https://open.er-api.com/v6/latest/USD`)
      .then(r => r.json())
      .then((data: any) => {
        const r = data?.rates?.[currency.code];
        if (r && typeof r === "number" && r > 0) {
          setRate(r);
          setCachedRate(currency.code, r);
        } else {
          // Fallback: try exchangerate-api.com
          return fetch(`https://api.exchangerate-api.com/v4/latest/USD`)
            .then(r => r.json())
            .then((d: any) => {
              const r2 = d?.rates?.[currency.code];
              if (r2 && typeof r2 === "number" && r2 > 0) {
                setRate(r2);
                setCachedRate(currency.code, r2);
              }
            });
        }
      })
      .catch(() => {
        // If both fail, keep rate = 1 (show USD prices)
        console.warn("Exchange rate fetch failed, showing USD prices");
      })
      .finally(() => setRateLoading(false));
  }, [currency.code]);

  const fmt = (usdAmount: number) => formatPrice(usdAmount, currency, rate);

  return (
    <CurrencyContext.Provider value={{ currency, rate, fmt, rateLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
};
