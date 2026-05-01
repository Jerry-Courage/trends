import { createContext, useContext, useState, useEffect } from "react";
import { detectCurrency, formatPrice, type CurrencyInfo } from "@/lib/currency";

interface CurrencyContextType {
  currency: CurrencyInfo;
  fmt: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [currency, setCurrency] = useState<CurrencyInfo>(detectCurrency);

  // Re-detect if timezone changes (rare but possible)
  useEffect(() => {
    setCurrency(detectCurrency());
  }, []);

  const fmt = (amount: number) => formatPrice(amount, currency);

  return (
    <CurrencyContext.Provider value={{ currency, fmt }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
};
