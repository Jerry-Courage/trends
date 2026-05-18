import BottomNav from "./BottomNav";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { ShoppingCart } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const hideNavPaths = ["/item/", "/checkout", "/tracking", "/search", "/help"];

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { totalItems, subtotal } = useCart();
  const { fmt } = useCurrency();
  const navigate = useNavigate();
  const location = useLocation();

  const showNav = !hideNavPaths.some(p => location.pathname.startsWith(p));
  const showCartBar = totalItems > 0 && showNav;

  return (
    <div className="min-h-screen bg-[#F7F7F7] w-full relative safe-top safe-bottom">
      {children}
      {showCartBar && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2 safe-bottom">
          <div className="max-w-5xl mx-auto">
            <button
              onClick={() => navigate("/checkout")}
              className="w-full flex items-center justify-between bg-[#FB570B] hover:bg-[#E04B07] text-white rounded-xl px-5 py-3.5 shadow-lg active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  <ShoppingCart className="w-5 h-5" />
                  <span className="absolute -top-2 -right-2 bg-white text-[#FB570B] text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-[#FB570B]">
                    {totalItems}
                  </span>
                </div>
                <span className="font-semibold">View Cart</span>
              </div>
              <span className="font-bold text-lg">{fmt(subtotal)}</span>
            </button>
          </div>
        </div>
      )}
      {showNav && <BottomNav />}
      {showNav && <div className="h-20 md:hidden" />}
    </div>
  );
};

export default AppShell;
