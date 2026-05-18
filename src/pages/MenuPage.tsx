import { useState } from "react";
import { Plus, SlidersHorizontal, Sparkles, Star, ChevronRight, ChevronDown, List, User, ShoppingCart, HelpCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AppHeader from "@/components/layout/AppHeader";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { api } from "@/lib/api";
import type { MenuItem as CartMenuItem } from "@/data/menuData";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

interface DBMenuItem {
  id: number;
  name: string;
  description: string;
  price: string;
  imageUrl: string | null;
  category: string;
  specs: string | null;
  tags: string | null;
  rating: string | null;
  reviews: number | null;
  isTop: number | null;
  isAvailable: number | null;
}

function dbToCart(item: DBMenuItem): CartMenuItem {
  return {
    id: String(item.id),
    name: item.name,
    description: item.description,
    price: parseFloat(item.price),
    image: item.imageUrl || "",
    specs: item.specs ?? undefined,
    tags: item.tags ? JSON.parse(item.tags) : undefined,
    category: item.category,
    rating: item.rating ? parseFloat(item.rating) : undefined,
    reviews: item.reviews ?? undefined,
    isTop: item.isTop === 1,
  };
}

const MenuPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get("cat") || "All";

  const { items, addItem, totalItems } = useCart();
  const { fmt } = useCurrency();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState(initialCat);

  const { data: dbItems = [], isLoading } = useQuery<DBMenuItem[]>({
    queryKey: ["/api/menu"],
    queryFn: () => api.get("/menu"),
    staleTime: 0,
  });

  const menuItems = dbItems.map(dbToCart);
  const categories = ["All", ...Array.from(new Set(dbItems.map(i => i.category)))];
  const filtered = activeCategory === "All" ? menuItems : menuItems.filter(i => i.category === activeCategory);

  const handleAddToCart = (e: React.MouseEvent, item: CartMenuItem) => {
    e.stopPropagation();
    addItem(item);
    toast({
      title: "Item added! 🛒",
      description: `${item.name} is added to your cart.`,
    });
  };

  if (isLoading) {
    return (
      <div className="pb-8 bg-[#F7F7F7] text-[#222222] min-h-screen text-left">
        <AppHeader title="Catalog - TRENDS" showBack />
        <div className="flex gap-2 px-4 py-4 overflow-x-auto scrollbar-none">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-9 w-24 rounded-full bg-white border border-[#EDEDED] flex-shrink-0" />
          ))}
        </div>
        <div className="px-4 grid grid-cols-2 md:grid-cols-5 gap-3.5 mt-5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 space-y-3 border border-[#EDEDED]">
              <Skeleton className="w-full aspect-square rounded-xl bg-gray-100" />
              <Skeleton className="h-4 w-5/6 bg-gray-100" />
              <Skeleton className="h-4 w-1/2 bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28 bg-[#F7F7F7] text-[#222222] min-h-screen text-left font-sans">
      
      {/* DESKTOP VIEW PROMOTION BLACK TOP BAR */}
      <div className="hidden md:block bg-black text-white text-[11px] font-semibold py-2 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="text-sm">🚚</span>
            <span className="font-bold text-white">Free shipping on all orders</span>
            <span className="text-gray-400 font-medium">Limited-time offer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 text-sm">🪙</span>
            <span className="font-bold">Price adjustment</span>
            <span className="text-gray-400 font-medium">Within 30 days</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-300">
            <span>📱</span>
            <span className="font-bold hover:underline cursor-pointer">Get the TRENDS App</span>
          </div>
        </div>
      </div>

      {/* DESKTOP VIEW WHITE MAIN HEADER PANEL */}
      <header className="hidden md:block bg-white border-b border-[#EDEDED] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 flex-shrink-0">
            <div onClick={() => navigate("/")} className="flex items-center gap-2.5 cursor-pointer">
              <img src={logo} alt="TRENDS Logo" className="h-10 object-contain rounded-xl" />
              <span className="text-xl font-black tracking-tight text-[#FB570B] uppercase italic">TRENDS</span>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-bold text-[#222] ml-2">
              <button onClick={() => navigate("/menu?filter=best")} className="hover:text-[#FB570B] transition-colors flex items-center gap-1">⭐ Best-Selling Items</button>
              <button onClick={() => navigate("/menu?filter=top")} className="hover:text-[#FB570B] transition-colors flex items-center gap-1">🔥 5-Star Rated</button>
              <button onClick={() => navigate("/menu")} className="hover:text-[#FB570B] transition-colors flex items-center gap-1">New In</button>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-bold text-[#222] flex-shrink-0">
            <div onClick={() => navigate("/profile")} className="flex items-center gap-2 cursor-pointer hover:text-[#FB570B] transition-colors">
              <User className="w-5 h-5 text-gray-700" />
              <span>Orders & Account</span>
            </div>
            <div onClick={() => navigate("/checkout")} className="relative flex items-center gap-1 cursor-pointer hover:text-[#FB570B] transition-colors">
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              {totalItems > 0 && (
                <span className="absolute -top-2.5 -right-2 bg-[#FB570B] text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow">
                  {totalItems}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE VIEW MAIN HEADER */}
      <header className="md:hidden bg-white border-b border-[#EDEDED] px-3.5 py-2.5 sticky top-0 z-50 flex items-center justify-between gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-700 p-1">
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <div onClick={() => navigate("/")} className="flex items-center gap-2 cursor-pointer">
          <img src={logo} alt="TRENDS Logo" className="h-8 object-contain rounded-lg" />
          <span className="text-base font-black tracking-tight text-[#FB570B] uppercase italic">TRENDS</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/profile")} className="text-gray-700 hover:text-[#FB570B] p-1">
            <User className="w-4.5 h-4.5" />
          </button>
          <button onClick={() => navigate("/checkout")} className="relative text-gray-700 hover:text-[#FB570B] p-1">
            <ShoppingCart className="w-4.5 h-4.5" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1 bg-[#FB570B] text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Pill Category Scroller */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex gap-2 overflow-x-auto scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all border flex-shrink-0 ${
              activeCategory === cat
                ? "bg-[#FB570B] text-white border-transparent shadow"
                : "bg-white text-gray-700 border-[#EBEBEB] hover:border-gray-300"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main product listings */}
      <main className="max-w-7xl mx-auto px-4 mt-2">
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-sm font-black uppercase tracking-widest text-[#888]">
            {activeCategory} Products ({filtered.length})
          </h2>
          <button className="p-2 bg-white border border-[#EBEBEB] rounded-xl text-gray-500 hover:text-black transition-colors">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white border border-[#EDEDED] rounded-3xl p-6 shadow-sm">
            <p className="text-[#888] text-sm">No electronics found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            {filtered.map(item => {
              const reviewsCount = ((Number(item.id) * 31) % 1200) + 45;
              const originalPrice = item.price * 1.45;
              const pctOff = Math.round((1 - (item.price / originalPrice)) * 100);

              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="bg-white rounded-2xl overflow-hidden border border-[#EDEDED] flex flex-col justify-between hover:shadow-md transition-shadow relative cursor-pointer pb-3"
                >
                  <div>
                    <div className="relative w-full aspect-square bg-[#FAFAFA] flex items-center justify-center border-b border-[#F5F5F5] overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-4xl">💻</div>
                      )}
                    </div>

                    <div className="px-3 pt-2.5">
                      <h3 className="text-[11px] font-semibold text-[#222] leading-tight line-clamp-2 h-7.5 hover:text-[#FB570B] transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-[9px] text-[#A3A3A3] font-bold uppercase mt-1 leading-none">
                        {reviewsCount * 7}+ sold
                      </p>
                      <div className="flex items-center gap-0.5 mt-1">
                        {[...Array(5)].map((_, starIdx) => (
                          <Star key={starIdx} className="w-2.5 h-2.5 fill-[#FF9E0D] text-[#FF9E0D]" />
                        ))}
                        <span className="text-[9px] text-[#737373] font-bold ml-1">
                          {reviewsCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-3 mt-3">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
                        <span className="text-xs md:text-sm font-black text-[#FB570B] truncate">
                          {fmt(item.price)}
                        </span>
                        <span className="text-[9px] text-[#A3A3A3] line-through font-bold truncate">
                          {fmt(originalPrice)}
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleAddToCart(e, item)}
                        className="w-7 h-7 rounded-full border border-[#D9D9D9] hover:border-[#FB570B] bg-white flex items-center justify-center text-gray-700 hover:text-[#FB570B] transition-all flex-shrink-0 hover:bg-[#FB570B]/5 active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5 font-bold" />
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center gap-1.5">
                      <span className="text-[9px] font-black text-[#FB570B] bg-[#FFF2EB] px-1.5 py-0.5 rounded">
                        {pctOff}% OFF
                      </span>
                      <span className="text-[8px] text-emerald-600 font-extrabold uppercase bg-emerald-50 px-1 py-0.5 rounded leading-none">
                        Free shipping
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MenuPage;
